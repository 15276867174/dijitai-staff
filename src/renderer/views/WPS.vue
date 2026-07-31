<template>
  <div class="wps-page">
    <!-- Left Sidebar: File List -->
    <div class="wps-sidebar">
      <div class="sidebar-header">
        <h3>文件列表</h3>
        <button class="open-btn" @click="handleOpenFile">
          <span>+</span> 打开
        </button>
      </div>

      <div class="file-list">
        <div v-if="fileStore.files.length === 0" class="empty-files">
          <div class="empty-icon">📂</div>
          <p>暂无文件</p>
          <p class="empty-hint">点击"打开"选择文件</p>
          <p class="empty-hint">支持 Word、Excel、图片</p>
        </div>

        <div
          v-for="file in fileStore.files"
          :key="file.id"
          class="file-item"
          :class="{ active: fileStore.currentFile?.id === file.id }"
          @click="selectFile(file)"
        >
          <span class="file-type-icon">{{ getFileIcon(file.type) }}</span>
          <div class="file-item-info">
            <span class="file-item-name">{{ file.name }}</span>
            <span class="file-item-meta">{{ file.type.toUpperCase() }} · {{ formatDate(file.lastModified) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="wps-main">
      <!-- Step Progress Bar -->
      <div v-if="fileStore.currentFile" class="step-bar">
        <div
          v-for="(step, idx) in PROCESS_STEPS"
          :key="step.key"
          class="step-item"
          :class="{
            active: fileStore.currentStep === step.key,
            completed: fileStore.completedSteps.has(step.key),
            error: fileStore.currentStep === 'error' && idx === 0
          }"
        >
          <div class="step-dot">
            <span v-if="fileStore.completedSteps.has(step.key) && fileStore.currentStep !== step.key" class="step-check">✓</span>
            <span v-else class="step-icon">{{ step.icon }}</span>
          </div>
          <span class="step-label">{{ step.label }}</span>
          <div v-if="idx < PROCESS_STEPS.length - 1" class="step-line"></div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="wps-toolbar">
        <div class="toolbar-left">
          <span v-if="fileStore.currentFile" class="current-file-name">
            {{ getFileIcon(fileStore.currentFile.type) }} {{ fileStore.currentFile.name }}
          </span>
          <span v-else class="no-file-hint">请选择文件进行预览</span>
        </div>
        <div class="toolbar-right" v-if="fileStore.currentFile">
          <button class="toolbar-btn" :disabled="fileStore.isPreviewLoading" @click="handleRead">📖 读取</button>
          <button class="toolbar-btn" @click="handleAIModify">🤖 AI修改</button>
          <button class="toolbar-btn" @click="handleFormat">🎨 格式化</button>
        </div>
      </div>

      <!-- Content -->
      <div class="wps-content">
        <!-- No file selected -->
        <div v-if="!fileStore.currentFile" class="no-file-state">
          <div class="no-file-icon">📁</div>
          <h2>WPS 文件管理</h2>
          <p>AI驱动的智能文件处理中心</p>
          <div class="feature-list">
            <div class="feature-item">
              <span class="feature-icon">📊</span>
              <div>
                <strong>Excel 预览与编辑</strong>
                <p>在线预览表格，AI辅助修改数据</p>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📝</span>
              <div>
                <strong>Word 预览与AI修改</strong>
                <p>读取文档内容，AI智能改写、调整格式</p>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🖼️</span>
              <div>
                <strong>图片查看与OCR</strong>
                <p>预览图片文件，识别图中文字</p>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">✨</span>
              <div>
                <strong>AI生成文档</strong>
                <p>描述需求，自动生成Excel和Word文档</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div v-else-if="fileStore.isPreviewLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>{{ loadingMessage }}</p>
        </div>

        <!-- Error -->
        <div v-else-if="fileStore.currentStep === 'error'" class="error-state">
          <div class="error-icon">⚠️</div>
          <p>{{ fileStore.stepError }}</p>
          <button class="toolbar-btn" @click="handleRead">🔄 重试</button>
        </div>

        <!-- Excel Preview -->
        <div v-else-if="isExcelFile" class="excel-preview">
          <div class="excel-toolbar">
            <span class="sheet-name">Sheet1</span>
            <span class="row-count">共 {{ fileStore.excelData?.summary.rowCount ?? 0 }} 行 · {{ fileStore.excelData?.summary.columnCount ?? 0 }} 列</span>
          </div>
          <div class="excel-table-wrapper">
            <table class="excel-table" v-if="fileStore.excelData">
              <thead>
                <tr>
                  <th class="row-header">#</th>
                  <th v-for="(header, i) in fileStore.excelData.headers" :key="i">{{ header || `列${i + 1}` }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, ri) in fileStore.excelData.rows" :key="ri">
                  <td class="row-header">{{ ri + 1 }}</td>
                  <td v-for="(cell, ci) in (row as unknown[])" :key="ci">{{ cell ?? '' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="hasMoreExcelRows" class="more-rows-hint">
            仅显示前10行，共{{ fileStore.excelData?.summary.rowCount }}行
          </div>
        </div>

        <!-- Word Preview -->
        <div v-else-if="isWordFile" class="word-preview">
          <div v-if="fileStore.wordParagraphs.length > 0" class="word-document">
            <div class="word-paper">
              <h2 class="word-title">{{ fileStore.currentFile?.name }}</h2>
              <div class="word-body">
                <p v-for="(para, i) in fileStore.wordParagraphs" :key="i" class="word-paragraph">{{ para }}</p>
              </div>
            </div>
            <div class="word-stats">
              <span>{{ fileStore.wordParagraphs.length }} 段落</span>
              <span>{{ totalWordChars }} 字符</span>
            </div>
          </div>
          <div v-else class="word-empty">
            <p>文档内容为空或无法解析</p>
            <p class="hint">请点击"读取"按钮重新加载</p>
          </div>
        </div>

        <!-- Image Preview -->
        <div v-else-if="isImageFile" class="image-preview">
          <div class="image-container">
            <img :src="fileStore.wordContent" :alt="fileStore.currentFile?.name" class="preview-image" />
          </div>
          <div class="image-info">
            <span>{{ fileStore.currentFile?.name }}</span>
          </div>
        </div>

        <!-- AI Modify Result -->
        <div v-if="fileStore.aiModifyResult" class="ai-result-panel">
          <div class="ai-result-header">
            <span>🤖 AI处理结果</span>
            <button class="close-result-btn" @click="fileStore.aiModifyResult = ''">×</button>
          </div>
          <div class="ai-result-body" v-text="fileStore.aiModifyResult"></div>
        </div>

        <!-- Unsupported -->
        <div v-else-if="!isExcelFile && !isWordFile && !isImageFile && fileStore.currentStep === 'done'" class="unsupported-preview">
          <div class="unsupported-icon">📄</div>
          <p>此文件类型暂不支持预览</p>
          <p class="hint">{{ fileStore.currentFile?.type?.toUpperCase() }} 文件</p>
        </div>
      </div>
    </div>

    <!-- AI Modify Dialog -->
    <Teleport to="body">
      <div v-if="showAIDialog" class="modal-overlay" @click.self="showAIDialog = false">
        <div class="modal-content ai-dialog">
          <div class="modal-header">
            <h3>🤖 AI修改文档</h3>
            <button class="modal-close" @click="showAIDialog = false">×</button>
          </div>
          <div class="modal-body">
            <div v-if="isWordFile && fileStore.wordContent" class="modify-context">
              <div class="context-label">当前文档内容摘要：</div>
              <div class="context-preview">{{ fileStore.wordContent.slice(0, 500) }}{{ fileStore.wordContent.length > 500 ? '...' : '' }}</div>
            </div>
            <p class="ai-hint">描述你想要的修改：</p>
            <textarea v-model="aiInstruction" class="ai-input" placeholder='例如：把文档中所有「公司」改成「企业」、将段落格式调整为更正式的语气、提取关键信息生成摘要...' rows="4"></textarea>
            <div class="modify-presets">
              <span class="preset-label">快捷指令：</span>
              <button class="preset-btn" @click="aiInstruction = '帮我润色这篇文章，使语言更流畅专业'">润色优化</button>
              <button class="preset-btn" @click="aiInstruction = '提取文档的关键要点，生成结构化摘要'">提取摘要</button>
              <button class="preset-btn" @click="aiInstruction = '调整文档格式，使其更规范美观'">调整格式</button>
              <button class="preset-btn" @click="aiInstruction = '将文档翻译成英文'">翻译英文</button>
            </div>
            <div v-if="modifyLoading" class="modify-progress">
              <div class="loading-spinner small"></div>
              <span>AI正在处理...</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showAIDialog = false">取消</button>
            <button class="btn btn-primary" :disabled="!aiInstruction.trim() || modifyLoading" @click="executeAIModify">
              {{ modifyLoading ? '处理中...' : '开始修改' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Format Dialog -->
    <Teleport to="body">
      <div v-if="showFormatDialog" class="modal-overlay" @click.self="showFormatDialog = false">
        <div class="modal-content format-dialog">
          <div class="modal-header">
            <h3>🎨 格式化设置</h3>
            <button class="modal-close" @click="showFormatDialog = false">×</button>
          </div>
          <div class="modal-body">
            <p class="ai-hint">选择要应用的格式化操作：</p>
            <div class="format-options">
              <label class="format-option">
                <input type="checkbox" v-model="formatOptions.trimSpaces" /> 去除多余空格和空行
              </label>
              <label class="format-option">
                <input type="checkbox" v-model="formatOptions.unifyPunctuation" /> 统一标点符号
              </label>
              <label class="format-option">
                <input type="checkbox" v-model="formatOptions.smartParagraphs" /> 智能分段
              </label>
              <label class="format-option">
                <input type="checkbox" v-model="formatOptions.formatNumbers" /> 数字格式化
              </label>
            </div>
            <div v-if="formatLoading" class="modify-progress">
              <div class="loading-spinner small"></div>
              <span>正在格式化...</span>
            </div>
            <div v-if="formatResult" class="ai-result">
              <div class="result-header">格式化结果：</div>
              <div class="result-content">{{ formatResult }}</div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showFormatDialog = false">取消</button>
            <button class="btn btn-primary" :disabled="formatLoading" @click="executeFormat">
              {{ formatLoading ? '处理中...' : '应用格式' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useFileStore, PROCESS_STEPS } from '@/stores/file'
import type { FileInfo, FileType } from '../../types/file'

const fileStore = useFileStore()

const showAIDialog = ref(false)
const showFormatDialog = ref(false)
const aiInstruction = ref('')
const modifyLoading = ref(false)
const formatLoading = ref(false)
const formatResult = ref('')

const formatOptions = reactive({
  trimSpaces: true,
  unifyPunctuation: true,
  smartParagraphs: false,
  formatNumbers: false
})

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']

const isExcelFile = computed(() => {
  const type = fileStore.currentFile?.type
  return type === 'xlsx' || type === 'xls'
})

const isWordFile = computed(() => {
  const type = fileStore.currentFile?.type
  return type === 'docx' || type === 'doc'
})

const isImageFile = computed(() => {
  return IMAGE_EXTS.includes(fileStore.currentFile?.type || '')
})

const hasMoreExcelRows = computed(() => {
  return (fileStore.excelData?.summary.rowCount ?? 0) > 10
})

const totalWordChars = computed(() => {
  return fileStore.wordParagraphs.reduce((sum, p) => sum + p.length, 0)
})

const loadingMessage = computed(() => {
  const messages: Record<string, string> = {
    reading: '正在读取文件...',
    analyzing: '正在分析内容...',
    modifying: 'AI正在处理...',
    formatting: '正在应用格式...',
    done: '加载完成',
    error: '处理出错'
  }
  return messages[fileStore.currentStep] || '处理中...'
})

function getFileIcon(type: FileType): string {
  const icons: Record<string, string> = {
    xlsx: '📊', xls: '📊', docx: '📝', doc: '📝',
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', webp: '🖼️', bmp: '🖼️',
    pdf: '📕', other: '📄'
  }
  return icons[type] || '📄'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN')
}

async function handleOpenFile(): Promise<void> {
  await fileStore.openFile()
}

function selectFile(file: FileInfo): void {
  fileStore.selectFile(file)
  if (file.type === 'xlsx' || file.type === 'xls') {
    fileStore.loadExcelPreview(file.path)
  } else if (file.type === 'docx' || file.type === 'doc') {
    fileStore.loadWordPreview(file.path)
  } else if (IMAGE_EXTS.includes(file.type)) {
    fileStore.loadImagePreview(file.path)
  }
}

async function handleRead(): Promise<void> {
  if (!fileStore.currentFile) return
  const file = fileStore.currentFile
  if (file.type === 'xlsx' || file.type === 'xls') {
    await fileStore.loadExcelPreview(file.path)
  } else if (file.type === 'docx' || file.type === 'doc') {
    await fileStore.loadWordPreview(file.path)
  } else if (IMAGE_EXTS.includes(file.type)) {
    await fileStore.loadImagePreview(file.path)
  }
}

function handleAIModify(): void {
  showAIDialog.value = true
  aiInstruction.value = ''
  modifyLoading.value = false
  fileStore.aiModifyResult = ''
}

function handleFormat(): void {
  showFormatDialog.value = true
  formatResult.value = ''
  formatLoading.value = false
  Object.assign(formatOptions, {
    trimSpaces: true,
    unifyPunctuation: true,
    smartParagraphs: false,
    formatNumbers: false
  })
}

async function executeAIModify(): Promise<void> {
  if (!aiInstruction.value.trim() || !fileStore.currentFile) return
  modifyLoading.value = true
  fileStore.setStep('modifying')

  try {
    if (window.electronAPI) {
      const filePath = fileStore.currentFile.path
      let context = aiInstruction.value

      if (isWordFile.value && fileStore.wordContent) {
        context = `用户有一个文档，内容如下：\n\n${fileStore.wordContent}\n\n---\n用户指令：${aiInstruction.value}\n\n请根据用户指令修改文档内容，并输出修改后的结果。`
      } else if (isExcelFile.value && fileStore.excelData) {
        const headers = fileStore.excelData.headers.join(', ')
        const rows = fileStore.excelData.rows.slice(0, 5).map(r => (r as unknown[]).join(', ')).join('\n')
        context = `用户有一个Excel表格：\n表头: ${headers}\n前几行数据:\n${rows}\n---\n用户指令：${aiInstruction.value}\n\n请根据用户指令处理表格数据。`
      }

      fileStore.aiModifyResult = ''
      const unsubscribe = window.electronAPI.onAgentStream((data) => {
        if (data.done) {
          unsubscribe()
          modifyLoading.value = false
          fileStore.setStep('done')
          return
        }
        if (data.error) {
          fileStore.aiModifyResult += data.chunk
          unsubscribe()
          modifyLoading.value = false
          fileStore.setStep('error')
          return
        }
        fileStore.aiModifyResult += data.chunk
      })

      await window.electronAPI.agentChat({ message: context, files: [filePath] })
    } else {
      fileStore.aiModifyResult = `[演示模式] AI修改指令已收到。\n\n在完整版中，Agent会：\n1. 解析当前文件内容\n2. 根据指令定位需要修改的部分\n3. 执行修改并显示结果`
      modifyLoading.value = false
      fileStore.setStep('done')
    }
  } catch (e) {
    console.error('AI modify error:', e)
    modifyLoading.value = false
    fileStore.setStep('error')
  }
}

async function executeFormat(): Promise<void> {
  if (!fileStore.currentFile) return
  formatLoading.value = true
  fileStore.setStep('formatting')

  const selectedFormats: string[] = []
  if (formatOptions.trimSpaces) selectedFormats.push('去除多余空格和空行')
  if (formatOptions.unifyPunctuation) selectedFormats.push('统一中英文标点符号')
  if (formatOptions.smartParagraphs) selectedFormats.push('智能分段')
  if (formatOptions.formatNumbers) selectedFormats.push('数字和日期格式化')

  try {
    if (window.electronAPI && isWordFile.value && fileStore.wordContent) {
      const prompt = `请对以下文档进行格式优化：${selectedFormats.join('、')}\n\n文档内容：\n${fileStore.wordContent}\n\n请输出格式化后的完整文档。`

      formatResult.value = ''
      const unsubscribe = window.electronAPI.onAgentStream((data) => {
        if (data.done) { unsubscribe(); formatLoading.value = false; fileStore.setStep('done'); return }
        if (data.error) { formatResult.value += data.chunk; unsubscribe(); formatLoading.value = false; fileStore.setStep('error'); return }
        formatResult.value += data.chunk
      })

      await window.electronAPI.agentChat({ message: prompt, files: [fileStore.currentFile.path] })
    } else {
      formatResult.value = `[演示模式] 格式化选项：${selectedFormats.join('、')}\n\n在完整版中，AI会自动处理文档并输出格式化结果。`
      formatLoading.value = false
      fileStore.setStep('done')
    }
  } catch (e) {
    console.error('Format error:', e)
    formatLoading.value = false
    fileStore.setStep('error')
  }
}
</script>

<style scoped>
.wps-page { display: flex; height: 100%; }

/* Sidebar */
.wps-sidebar {
  width: 260px;
  background: var(--bg-content);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
}
.sidebar-header h3 { font-size: 14px; font-weight: 600; }
.open-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 500;
}
.open-btn:hover { background: var(--color-primary); color: white; }
.file-list { flex: 1; overflow-y: auto; }
.empty-files {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--text-secondary);
}
.empty-icon { font-size: 40px; margin-bottom: 12px; }
.empty-hint { font-size: 12px; color: var(--text-tertiary); margin-top: 4px; }
.file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background var(--transition-fast);
  border-bottom: 1px solid var(--border-light);
}
.file-item:hover { background: var(--bg-hover); }
.file-item.active {
  background: var(--color-primary-bg);
  border-left: 3px solid var(--color-primary);
}
.file-type-icon { font-size: 24px; flex-shrink: 0; }
.file-item-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.file-item-name {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.file-item-meta { font-size: 11px; color: var(--text-tertiary); }

/* Main */
.wps-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

/* Step bar */
.step-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 24px;
  background: var(--bg-content);
  border-bottom: 1px solid var(--border-color);
  gap: 0;
}
.step-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-tertiary); }
.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
  transition: all 0.3s ease;
}
.step-item.active .step-dot {
  background: var(--color-primary-light);
  box-shadow: 0 0 0 3px var(--color-primary-bg);
  animation: pulse 1.5s ease-in-out infinite;
}
.step-item.completed .step-dot { background: #52c41a; }
.step-item.error .step-dot { background: var(--color-danger); }
.step-check { color: white; font-weight: 700; font-size: 13px; }
.step-label { white-space: nowrap; font-weight: 500; }
.step-item.active .step-label { color: var(--color-primary); font-weight: 600; }
.step-item.completed .step-label { color: var(--text-primary); }
.step-line {
  width: 48px;
  height: 2px;
  background: var(--border-color);
  margin: 0 10px;
  transition: background 0.3s ease;
}
.step-item.completed .step-line { background: #52c41a; }
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 3px var(--color-primary-bg); }
  50% { box-shadow: 0 0 0 8px var(--color-primary-bg); }
}

/* Toolbar */
.wps-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: var(--bg-content);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}
.current-file-name { font-size: 14px; font-weight: 500; }
.no-file-hint { font-size: 13px; color: var(--text-tertiary); }
.toolbar-right { display: flex; gap: 8px; }
.toolbar-btn {
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  background: var(--bg-hover);
  color: var(--text-primary);
  font-size: 13px;
  transition: all var(--transition-fast);
}
.toolbar-btn:hover:not(:disabled) { background: var(--border-color); }
.toolbar-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Content */
.wps-content { flex: 1; overflow: auto; background: var(--bg-main); }

/* No file */
.no-file-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}
.no-file-icon { font-size: 56px; margin-bottom: 16px; }
.no-file-state h2 { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
.no-file-state > p { color: var(--text-secondary); margin-bottom: 32px; }
.feature-list { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; max-width: 520px; }
.feature-item {
  display: flex;
  gap: 12px;
  padding: 14px;
  background: var(--bg-content);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
  text-align: left;
}
.feature-icon { font-size: 24px; flex-shrink: 0; }
.feature-item strong { font-size: 13px; }
.feature-item p { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }

/* Loading / Error */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
  color: var(--text-secondary);
}
.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border-color);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.loading-spinner.small { width: 18px; height: 18px; border-width: 2px; }
@keyframes spin { to { transform: rotate(360deg); } }
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--text-secondary);
}
.error-icon { font-size: 48px; }

/* Excel */
.excel-preview { padding: 16px; }
.excel-toolbar { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
.sheet-name {
  padding: 4px 12px;
  background: var(--color-primary);
  color: white;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;
}
.row-count { font-size: 12px; color: var(--text-secondary); }
.excel-table-wrapper {
  overflow: auto;
  background: var(--bg-content);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}
.excel-table { border-collapse: collapse; font-size: 13px; width: max-content; min-width: 100%; }
.excel-table th, .excel-table td { border: 1px solid var(--border-light); padding: 6px 12px; white-space: nowrap; min-width: 80px; }
.excel-table th { background: var(--bg-hover); font-weight: 600; position: sticky; top: 0; }
.excel-table .row-header { background: var(--bg-hover); color: var(--text-tertiary); font-size: 11px; text-align: center; min-width: 40px; }
.excel-table tbody tr:hover { background: var(--color-primary-bg); }
.more-rows-hint {
  text-align: center;
  padding: 12px;
  font-size: 12px;
  color: var(--text-tertiary);
  background: var(--bg-content);
  border: 1px solid var(--border-light);
  border-top: none;
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
}

/* Word */
.word-preview { padding: 24px; height: 100%; overflow: auto; }
.word-paper {
  max-width: 720px;
  margin: 0 auto;
  background: white;
  padding: 48px 56px;
  border-radius: var(--radius-md);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  min-height: 500px;
}
.word-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e8e8e8;
  text-align: center;
}
.word-body { line-height: 2; color: #333; }
.word-paragraph { text-indent: 2em; margin-bottom: 8px; font-size: 15px; line-height: 1.8; }
.word-stats { display: flex; gap: 20px; justify-content: center; margin-top: 16px; font-size: 12px; color: var(--text-tertiary); }
.word-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  gap: 8px;
}

/* Image */
.image-preview { display: flex; flex-direction: column; align-items: center; padding: 24px; height: 100%; }
.image-container { flex: 1; display: flex; align-items: center; justify-content: center; overflow: auto; max-width: 100%; }
.preview-image { max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: var(--radius-sm); box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1); }
.image-info { margin-top: 12px; font-size: 13px; color: var(--text-secondary); }

/* AI result panel */
.ai-result-panel {
  margin: 16px;
  background: var(--bg-content);
  border: 1px solid var(--color-primary-light);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.ai-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--color-primary-bg);
  font-size: 14px;
  font-weight: 500;
}
.close-result-btn { width: 24px; height: 24px; border-radius: 50%; background: transparent; font-size: 18px; color: var(--text-secondary); }
.close-result-btn:hover { background: var(--bg-hover); }
.ai-result-body { padding: 16px; font-size: 14px; line-height: 1.8; white-space: pre-wrap; max-height: 300px; overflow-y: auto; }

/* Unsupported */
.unsupported-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  gap: 8px;
}
.unsupported-icon { font-size: 56px; margin-bottom: 8px; }
.hint { font-size: 12px; color: var(--text-tertiary); }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: var(--bg-content);
  border-radius: var(--radius-lg);
  width: 560px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
}
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--border-color); }
.modal-header h3 { font-size: 16px; font-weight: 600; }
.modal-close { width: 28px; height: 28px; border-radius: 50%; background: transparent; font-size: 20px; color: var(--text-secondary); }
.modal-close:hover { background: var(--bg-hover); }
.modal-body { padding: 20px; }
.modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 16px 20px; border-top: 1px solid var(--border-color); }
.btn { padding: 8px 18px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; transition: all var(--transition-fast); }
.btn-primary { background: var(--color-primary); color: white; }
.btn-primary:hover:not(:disabled) { background: var(--color-primary-hover); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: var(--bg-hover); color: var(--text-primary); }
.btn-secondary:hover { background: var(--border-color); }

/* AI Dialog */
.ai-hint { font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; }
.modify-context { margin-bottom: 16px; padding: 12px; background: var(--bg-hover); border-radius: var(--radius-sm); max-height: 150px; overflow-y: auto; }
.context-label { font-size: 12px; font-weight: 600; margin-bottom: 6px; }
.context-preview { font-size: 12px; color: var(--text-secondary); line-height: 1.6; white-space: pre-wrap; }
.ai-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-input);
  resize: vertical;
  min-height: 80px;
  transition: border-color var(--transition-fast);
}
.ai-input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light); }
.modify-presets { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; align-items: center; }
.preset-label { font-size: 12px; color: var(--text-tertiary); margin-right: 4px; }
.preset-btn {
  padding: 4px 10px;
  border-radius: 12px;
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}
.preset-btn:hover { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-bg); }
.modify-progress { display: flex; align-items: center; gap: 10px; margin-top: 14px; padding: 10px 14px; background: var(--color-primary-bg); border-radius: var(--radius-sm); font-size: 13px; color: var(--color-primary); }

/* Format Dialog */
.format-options { display: flex; flex-direction: column; gap: 10px; }
.format-option {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}
.format-option:hover { background: var(--bg-hover); }
.format-option input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--color-primary); }
.ai-result { margin-top: 16px; padding: 14px; background: var(--bg-hover); border-radius: var(--radius-sm); }
.result-header { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
.result-content { font-size: 13px; color: var(--text-secondary); white-space: pre-wrap; line-height: 1.6; max-height: 250px; overflow-y: auto; }
</style>
