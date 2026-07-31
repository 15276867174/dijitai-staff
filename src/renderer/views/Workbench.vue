<template>
  <div class="workbench">
    <MessageList
      :messages="chatStore.messages"
      :is-streaming="chatStore.isStreaming"
      :streaming-content="chatStore.streamingContent"
      :quick-commands="chatStore.quickCommands"
      :user-avatar-url="userAvatarUrl"
      :user-initial="userInitial"
      @quick-command="handleQuickCommand"
      @action="handleAction"
    />
    <MessageInput
      :disabled="chatStore.isStreaming"
      placeholder="输入你的指令，我会帮你完成..."
      @send="handleSend"
    />
  </div>
</template>

<script setup lang="ts">
import MessageList from '@/components/Chat/MessageList.vue'
import MessageInput from '@/components/Chat/MessageInput.vue'
import type { AttachedFile } from '@/components/Chat/MessageInput.vue'
import { useChatStore } from '@/stores/chat'
import { ref, onMounted } from 'vue'
import type { ChatMessage } from '../../types/chat'

const chatStore = useChatStore()

const userAvatarUrl = ref('')
const userInitial = ref('')

onMounted(async () => {
  if (window.electronAPI) {
    const avatar = await window.electronAPI.configGet('avatarUrl') as string
    const name = await window.electronAPI.configGet('displayName') as string
    if (avatar) userAvatarUrl.value = avatar
    if (name) userInitial.value = name.charAt(0)
  }
})

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']

function isImageFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return IMAGE_EXTS.includes(ext)
}

function addMessage(role: 'user' | 'assistant', content: string, type: ChatMessage['type'] = 'text', metadata?: ChatMessage['metadata']): void {
  chatStore.addMessage({
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sessionId: chatStore.currentSessionId,
    role,
    content,
    type,
    timestamp: new Date().toISOString(),
    metadata
  })
}

async function handleSend(text: string, files: AttachedFile[]): Promise<void> {
  console.log('[Workbench] handleSend START', text?.slice(0, 50), files.length, 'files')
  try {
    const imageFiles = files.filter(f => isImageFile(f.name))
    const otherFiles = files.filter(f => !isImageFile(f.name))

    // Display images in chat
    for (const img of imageFiles) {
      const imageUrl = img.dataUrl || `local-file:///${img.path.replace(/\\/g, '/')}`
      addMessage('user', '', 'image', {
        fileName: img.name,
        imageUrl
      })

      // Show OCR progress
      if (img.ocrLoading) {
        const progressMsgId = `msg_progress_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        addMessage('assistant', '', 'progress', {
          progress: 10,
          progressMessage: `正在识别「${img.name}」...`
        })
      }
    }

    // Display non-image files
    for (const f of otherFiles) {
      addMessage('user', `[发送了文件: ${f.name}]`, 'file', {
        fileName: f.name,
        fileSize: 0
      })
    }

    // Display text message last
    if (text) {
      addMessage('user', text, 'text')
    } else if (files.length > 0 && imageFiles.length === 0 && otherFiles.length === 0) {
      // Only images, no text
    } else if (files.length > 0 && imageFiles.length === 0) {
      addMessage('user', '[发送了文件]', 'file', {
        fileName: otherFiles[0]?.name,
        fileSize: 0
      })
    }

    // Wait for OCR promises
    const ocrPromises = imageFiles.filter(f => f.ocrPromise).map(f => f.ocrPromise!)
    if (ocrPromises.length > 0) {
      const OCR_TIMEOUT = 30000
      const timeout = new Promise<void>(r => setTimeout(r, OCR_TIMEOUT))
      await Promise.race([Promise.all(ocrPromises), timeout])
      console.log('[Workbench] OCR wait complete')
    }

    // After OCR, show results or errors for each image
    let hasAnyOcrText = false
    for (const img of imageFiles) {
      const ocrText = img.ocrText || ''
      const conf = img.ocrConfidence || 0

      if (ocrText.length > 5) {
        hasAnyOcrText = true
        addMessage('assistant', ocrText, 'ocr_result', {
          ocrText,
          ocrConfidence: conf,
          ocrStage: conf > 0 ? 'sharp+tesseract' : 'unknown',
          canRetry: true,
          retryImagePath: img.path
        })
      } else {
        // OCR failed — show error with retry
        addMessage('assistant', '', 'ocr_error', {
          canRetry: true,
          retryImagePath: img.path
        })
      }
    }

    // Build context for Agent with post-processing prompt
    let contextPrompt = text
    if (imageFiles.length > 0 && hasAnyOcrText) {
      const ocrTexts = imageFiles
        .filter(f => f.ocrText && f.ocrText.length > 5)
        .map(f => {
          const conf = f.ocrConfidence || 0
          const warnTag = conf < 40 ? ' [注意：此图片置信度较低，结果可能不准]' : ''
          return `[图片「${f.name}」OCR结果${warnTag}]\n${f.ocrText}`
        })
        .join('\n\n')

      const postProcessPrompt = `请先对以下OCR识别结果进行智能清洗和纠错，然后基于清洗后的内容回答用户问题。

OCR后处理规则：
1. 数据清洗：过滤掉OCR结果中的乱码和无意义特殊符号（如@#￥%※■□◆等），只保留中文、英文、数字和常用标点
2. 格式标准化：将日期统一为"YYYY年MM月DD日"格式，金额统一为"¥XXXX.XX元"格式，身份证号、电话号码等保持连续数字
3. 语义纠错：利用上下文修正明显的OCR错别字（如"征亻"应为"征信"，"银亍"应为"银行"，"贷款余页"应为"贷款余额"），中文词语应符合常见金融/商务用语
4. 结构化提取：如果图片是表格、证件或报告，请用键值对或表格形式整理关键信息

用户问题：${text || '请识别并整理图片中的文字内容'}

${ocrTexts}`

      contextPrompt = postProcessPrompt
    } else if (imageFiles.length > 0 && !hasAnyOcrText) {
      const imgNames = imageFiles.map(f => f.name).join(', ')
      contextPrompt = text
        ? `${text}\n\n(注意：图片「${imgNames}」未能识别出文字，请告知用户拍照建议)`
        : `用户发送了图片「${imgNames}」，但未能识别出文字内容。请告知用户可能的原因和改进建议。`
    }

    // Send to Agent (DeepSeek streaming)
    const filePaths = files.map(f => f.path)
    console.log('[Workbench] Sending to agent, context length:', contextPrompt?.length || 0, 'files:', filePaths.length)

    if (window.electronAPI) {
      chatStore.startStreaming()

      const unsubscribe = window.electronAPI.onAgentStream((data) => {
        if (data.error) {
          chatStore.finishStreaming()
          addMessage('assistant', data.chunk, 'text')
          unsubscribe()
          return
        }
        if (data.done) {
          chatStore.finishStreaming()
          unsubscribe()
          return
        }
        if (data.download) {
          chatStore.finishStreaming()
          addMessage('assistant', `文件已生成：**${data.download.fileName}**`, 'action_button', {
            actions: [{
              label: `下载 ${data.download.fileName}`,
              action: `download:${data.download.filePath}`,
              variant: 'primary' as const
            }]
          })
          unsubscribe()
          return
        }
        chatStore.appendStreamChunk(data.chunk)
      })

      await window.electronAPI.agentChat({
        message: contextPrompt,
        files: filePaths,
        context: {
          imageFiles: imageFiles.map(f => ({ name: f.name, dataUrl: f.dataUrl || '' })),
          history: JSON.parse(JSON.stringify(chatStore.messages.map(m => ({
            role: m.role,
            content: m.content,
            type: m.type,
            metadata: m.metadata
          }))))
        }
      })
    } else {
      // Demo mode
      chatStore.startStreaming()
      const response = getDemoResponse(text, imageFiles.length)
      let i = 0
      const interval = setInterval(() => {
        if (i < response.length) {
          chatStore.appendStreamChunk(response[i])
          i++
        } else {
          clearInterval(interval)
          chatStore.finishStreaming()
        }
      }, 30)
    }
  } catch (e) {
    console.error('[Workbench] handleSend error:', e)
  }
}

/** Retry OCR for an image */
async function retryOcr(imagePath: string): Promise<void> {
  console.log('[Workbench] Retrying OCR for:', imagePath)
  addMessage('assistant', '', 'progress', {
    progress: 30,
    progressMessage: '正在重新识别...'
  })

  if (window.electronAPI) {
    try {
      const result = await window.electronAPI.ocrRecognize(imagePath)
      if (result.success && result.text && result.text.length > 5) {
        addMessage('assistant', result.text, 'ocr_result', {
          ocrText: result.text,
          ocrConfidence: result.confidence,
          ocrStage: (result as any).stage || 'retry',
          canRetry: true,
          retryImagePath: imagePath
        })
      } else {
        addMessage('assistant', '', 'ocr_error', {
          canRetry: true,
          retryImagePath: imagePath
        })
      }
    } catch (e: any) {
      addMessage('assistant', `重试失败: ${e.message}`, 'ocr_error', {
        canRetry: true,
        retryImagePath: imagePath
      })
    }
  } else {
    // Demo mode
    setTimeout(() => {
      addMessage('assistant', '演示模式：这是一段模拟的OCR重试结果。', 'ocr_result', {
        ocrText: '演示模式：这是一段模拟的OCR重试结果。',
        ocrConfidence: 85,
        ocrStage: 'demo',
        canRetry: true,
        retryImagePath: imagePath
      })
    }, 1500)
  }
}

async function handleAction(action: string): Promise<void> {
  if (action.startsWith('download:')) {
    const filePath = action.slice('download:'.length)
    if (window.electronAPI) {
      const result = await window.electronAPI.saveFileDialog({
        defaultPath: filePath.split(/[/\\]/).pop() || 'document.docx',
        filters: [{ name: 'Word Document', extensions: ['docx'] }]
      })
      if (!result.canceled && result.filePath) {
        const data = await window.electronAPI.readFile(filePath)
        if (data.success && data.data) {
          await window.electronAPI.writeFile(result.filePath, data.data)
        }
      }
    }
  }

  if (action.startsWith('retryOcr:')) {
    const imagePath = action.slice('retryOcr:'.length)
    if (imagePath) {
      await retryOcr(imagePath)
    }
  }
}

function handleQuickCommand(prompt: string): void {
  handleSend(prompt, [])
}

function getDemoResponse(text: string, imageCount: number): string {
  if (imageCount > 0) {
    return `已收到你发送的 ${imageCount} 张图片。在完整版中，我会通过OCR识别图片中的文字内容，并基于图片内容回答你的问题。`
  }
  if (text.includes('表格') || text.includes('Excel')) {
    return '收到你的表格分析请求。请上传Excel文件，我会读取数据并为你生成分析报告。'
  }
  return `收到你的消息：「${text}」\n\n我是数字员工助手，目前运行在演示模式。请配置API Key后使用完整功能。`
}
</script>

<style scoped>
.workbench {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-main);
}
</style>
