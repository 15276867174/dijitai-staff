<template>
  <div class="message-input-area">
    <div class="input-container">
      <!-- Image previews -->
      <div v-if="attachedFiles.length > 0" class="file-previews">
        <div v-for="(file, index) in attachedFiles" :key="index" class="file-preview-item">
          <img v-if="file.dataUrl" :src="file.dataUrl" class="preview-img" />
          <span v-else class="preview-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M5 4c0-.6.4-1 1-1h5l6 6v11c0 .6-.4 1-1 1H6a1 1 0 01-1-1V4z" stroke="currentColor" stroke-width="1.6"/>
              <path d="M15 3v6h6" stroke="currentColor" stroke-width="1.6"/>
            </svg>
          </span>
          <span class="preview-name">{{ file.name }}</span>
          <button class="preview-remove" @click="removeFile(index)">×</button>
        </div>
      </div>

      <!-- Text input -->
      <div class="input-row">
        <textarea
          ref="textareaRef"
          v-model="inputText"
          class="input-textarea"
          :placeholder="placeholder"
          :rows="1"
          @keydown.enter.exact="handleEnter"
          @input="autoResize"
        ></textarea>

        <div class="input-actions">
          <button class="action-btn upload-btn" title="上传文件" @click="handleUpload">
            <img src="@/assets/icons/wjj.png" alt="上传" class="upload-icon" />
          </button>
          <button
            class="action-btn send-btn"
            :class="{ disabled: !canSend }"
            :disabled="!canSend"
            @click="handleSend"
            title="发送消息"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 4v16m0-16l-6 6m6-6l6 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="input-hint">
      <span>Enter 发送 · Shift+Enter 换行</span>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/bmp,.xlsx,.xls,.docx,.doc"
      class="file-input-hidden"
      @change="onNativeFileSelected"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { preprocessImage, preprocessLight, rotateImage } from '@/utils/imagePreprocessor'

export interface AttachedFile {
  name: string
  path: string
  dataUrl?: string
  ocrText?: string
  ocrLoading?: boolean
  ocrConfidence?: number
  ocrPromise?: Promise<void>
}

const props = defineProps<{
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  send: [text: string, files: AttachedFile[]]
}>()

const inputText = ref('')
const attachedFiles = ref<AttachedFile[]>([])
const textareaRef = ref<HTMLTextAreaElement>()
const fileInputRef = ref<HTMLInputElement>()

const canSend = computed(() => {
  return (inputText.value.trim().length > 0 || attachedFiles.value.length > 0) && !props.disabled
})

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']

function isImage(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return IMAGE_EXTS.includes(ext)
}

function handleEnter(e: KeyboardEvent): void {
  if (e.shiftKey) return
  e.preventDefault()
  handleSend()
}

function handleSend(): void {
  if (!canSend.value) return
  const text = inputText.value.trim()
  const files = [...attachedFiles.value]
  emit('send', text, files)
  inputText.value = ''
  attachedFiles.value = []
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
    }
  })
}

async function handleUpload(): Promise<void> {
  if (window.electronAPI) {
    const result = await window.electronAPI.openFileDialog({
      filters: [
        { name: 'All Supported', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'xlsx', 'xls', 'docx', 'doc'] },
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] },
        { name: 'Documents', extensions: ['xlsx', 'xls', 'docx', 'doc'] }
      ]
    })
    if (!result.canceled && result.filePath) {
      await addFile(result.filePath)
    }
  } else {
    fileInputRef.value?.click()
  }
}

async function onNativeFileSelected(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => {
    attachedFiles.value.push({
      name: file.name,
      path: file.name,
      dataUrl: isImage(file.name) ? (reader.result as string) : undefined
    })
  }
  if (isImage(file.name)) {
    reader.readAsDataURL(file)
  } else {
    reader.onload = null as unknown as (() => void)
    attachedFiles.value.push({ name: file.name, path: file.name })
  }
  input.value = ''
}

async function addFile(filePath: string): Promise<void> {
  const name = filePath.split(/[/\\]/).pop() || filePath
  const localUrl = `local-file:///${filePath.replace(/\\/g, '/')}`

  const fileEntry: AttachedFile = { name, path: filePath }

  if (isImage(name)) {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.readFileAsDataURL(filePath)
        fileEntry.dataUrl = result.success ? result.dataUrl : localUrl
      } catch {
        fileEntry.dataUrl = localUrl
      }
    } else {
      fileEntry.dataUrl = localUrl
    }
    attachedFiles.value.push(fileEntry)

    // Run preprocessing + OCR in background (non-blocking)
    // Store the promise so the send flow can await it
    if (window.electronAPI && fileEntry.dataUrl) {
      fileEntry.ocrLoading = true
      fileEntry.ocrPromise = runPreprocessedOCR(fileEntry)
    }
  } else {
    attachedFiles.value.push(fileEntry)
  }
}

async function runPreprocessedOCR(fileEntry: AttachedFile): Promise<void> {
  if (!window.electronAPI) {
    // Demo mode: use Canvas-based preprocessing fallback
    await runCanvasOcrPipeline(fileEntry)
    return
  }

  // Primary path: main-process sharp-based OCR pipeline
  try {
    console.log('[OCR] Starting main-process pipeline for:', fileEntry.path)
    const result = await window.electronAPI.ocrRecognize(fileEntry.path)

    if (result.success && result.text && result.text.length > 5) {
      fileEntry.ocrText = result.text
      fileEntry.ocrConfidence = result.confidence
      fileEntry.ocrLoading = false
      console.log('[OCR] Main-process pipeline success',
        'conf:', result.confidence,
        'stage:', (result as any).stage,
        'rotation:', (result as any).rotationUsed,
        'len:', result.text.length)
      return
    }

    console.warn('[OCR] Main-process returned empty or short, trying Canvas fallback...')
    fileEntry.ocrText = result.text || ''
    fileEntry.ocrLoading = false
  } catch (e: any) {
    console.error('[OCR] Main-process pipeline error:', e.message)
    // Fallback to Canvas pipeline
    try {
      await runCanvasOcrPipeline(fileEntry)
    } catch (e2: any) {
      console.error('[OCR] Canvas fallback also failed:', e2.message)
      fileEntry.ocrText = ''
      fileEntry.ocrLoading = false
    }
  }
}

/**
 * Canvas-based fallback: preprocess in renderer, then OCR via IPC.
 * Used when main-process sharp pipeline is unavailable or fails.
 */
async function runCanvasOcrPipeline(fileEntry: AttachedFile): Promise<void> {
  // Stage 1: Full preprocessing (scale + binarize + denoise)
  try {
    console.log('[OCR Canvas] Stage 1: Full preprocessing...')
    const processed = await preprocessImage(fileEntry.dataUrl!)
    const result = await window.electronAPI!.ocrRecognizeBase64(processed.dataUrl)

    if (result.success && result.text && result.text.length > 10) {
      fileEntry.ocrText = result.text
      fileEntry.ocrConfidence = result.confidence
      fileEntry.ocrLoading = false
      return
    }
  } catch (e) {
    console.error('[OCR Canvas] Stage 1 error:', e)
  }

  // Stage 2: Light preprocessing
  try {
    console.log('[OCR Canvas] Stage 2: Light preprocessing...')
    const light = await preprocessLight(fileEntry.dataUrl!)
    const result = await window.electronAPI!.ocrRecognizeBase64(light.dataUrl)

    if (result.success && result.text && result.text.length > 10) {
      fileEntry.ocrText = result.text
      fileEntry.ocrConfidence = result.confidence
      fileEntry.ocrLoading = false
      return
    }
  } catch (e) {
    console.error('[OCR Canvas] Stage 2 error:', e)
  }

  // Stage 3: Raw OCR
  try {
    console.log('[OCR Canvas] Stage 3: Raw OCR...')
    const result = await window.electronAPI!.ocrRecognize(fileEntry.path)
    fileEntry.ocrText = result.text || ''
  } catch (e) {
    console.error('[OCR Canvas] Stage 3 error:', e)
    fileEntry.ocrText = ''
  }

  if (fileEntry.ocrText && fileEntry.ocrText.length > 10) {
    fileEntry.ocrLoading = false
    return
  }

  // Stage 4: Rotation fallback
  const rotations: (90 | 180 | 270)[] = [90, 180, 270]
  let bestText = fileEntry.ocrText || ''

  for (const deg of rotations) {
    try {
      console.log(`[OCR Canvas] Stage 4: Trying ${deg}° rotation...`)
      const rotated = await rotateImage(fileEntry.dataUrl!, deg)
      const result = await window.electronAPI!.ocrRecognizeBase64(rotated.dataUrl)
      if (result.success && result.text && result.text.length > bestText.length) {
        bestText = result.text
        fileEntry.ocrConfidence = result.confidence || 0
      }
    } catch (e) {
      console.error(`[OCR Canvas] Stage 4 ${deg}° error:`, e)
    }
  }

  if (bestText.length > (fileEntry.ocrText?.length || 0)) {
    fileEntry.ocrText = bestText
  }

  fileEntry.ocrLoading = false
}

function removeFile(index: number): void {
  attachedFiles.value.splice(index, 1)
}

function autoResize(): void {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

defineExpose({ inputText, attachedFiles })
</script>

<style scoped>
.message-input-area {
  padding: 16px 24px 12px;
  background: var(--bg-content);
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.input-container {
  max-width: 800px;
  margin: 0 auto;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 8px 12px;
  transition: border-color var(--transition-fast);
}

.input-container:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.file-previews {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.file-preview-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px;
  background: var(--bg-content);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
  max-width: 80px;
}

.preview-img {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 6px;
}

.preview-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  background: var(--bg-hover);
  border-radius: 6px;
}

.preview-name {
  font-size: 10px;
  color: var(--text-secondary);
  max-width: 64px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

.preview-remove {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-danger);
  color: white;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.preview-remove:hover {
  background: #dc2626;
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.input-textarea {
  flex: 1;
  background: transparent;
  resize: none;
  line-height: 1.5;
  font-size: 14px;
  color: var(--text-primary);
  padding: 4px 0;
  min-height: 24px;
  max-height: 160px;
}

.input-textarea::placeholder {
  color: var(--text-tertiary);
}

.input-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all var(--transition-fast);
}

.upload-btn {
  background: transparent;
  color: var(--text-secondary);
}

.upload-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.upload-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
  display: block;
}

.send-btn {
  background: var(--color-primary);
  color: white;
  font-size: 18px;
  font-weight: 600;
}

.send-btn:hover {
  background: var(--color-primary-hover);
  transform: scale(1.05);
}

.send-btn.disabled {
  background: var(--border-color);
  color: var(--text-tertiary);
  cursor: not-allowed;
  transform: none;
}

.input-hint {
  text-align: center;
  padding: 6px 0 0;
  font-size: 11px;
  color: var(--text-tertiary);
}

.file-input-hidden {
  display: none;
}
</style>
