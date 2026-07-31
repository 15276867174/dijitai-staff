import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FileInfo, FileTreeNode, ExcelData } from '../../types/file'

export type ProcessStep = 'idle' | 'reading' | 'analyzing' | 'modifying' | 'formatting' | 'done' | 'error'

export interface StepInfo {
  key: ProcessStep
  label: string
  icon: string
}

export const PROCESS_STEPS: StepInfo[] = [
  { key: 'reading', label: '读取文件', icon: '📖' },
  { key: 'analyzing', label: '分析内容', icon: '🔍' },
  { key: 'modifying', label: 'AI处理', icon: '🤖' },
  { key: 'formatting', label: '应用格式', icon: '🎨' },
  { key: 'done', label: '完成', icon: '✅' },
]

export const useFileStore = defineStore('file', () => {
  const files = ref<FileInfo[]>([])
  const currentFile = ref<FileInfo | null>(null)
  const excelData = ref<ExcelData | null>(null)
  const wordContent = ref<string>('')
  const wordParagraphs = ref<string[]>([])
  const fileTree = ref<FileTreeNode[]>([])
  const isPreviewLoading = ref(false)

  // Step tracking
  const currentStep = ref<ProcessStep>('idle')
  const completedSteps = ref<Set<ProcessStep>>(new Set())
  const stepError = ref<string>('')
  const aiModifyResult = ref<string>('')

  function setFiles(newFiles: FileInfo[]): void {
    files.value = newFiles
  }

  function selectFile(file: FileInfo): void {
    currentFile.value = file
  }

  function resetSteps(): void {
    currentStep.value = 'idle'
    completedSteps.value = new Set()
    stepError.value = ''
    aiModifyResult.value = ''
  }

  function setStep(step: ProcessStep): void {
    currentStep.value = step
    if (step !== 'idle' && step !== 'error') {
      completedSteps.value.add(step)
    }
  }

  async function loadExcelPreview(filePath: string): Promise<void> {
    isPreviewLoading.value = true
    resetSteps()
    setStep('reading')
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.excelPreview(filePath)
        excelData.value = {
          headers: result.headers,
          rows: result.rows,
          summary: {
            rowCount: result.totalRows,
            columnCount: result.headers.length,
            sheetName: 'Sheet1'
          }
        }
        wordContent.value = ''
        wordParagraphs.value = []
        setStep('analyzing')
        setStep('done')
      }
    } catch (error) {
      console.error('Failed to load Excel:', error)
      stepError.value = `读取失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      setStep('error')
    } finally {
      isPreviewLoading.value = false
    }
  }

  async function loadWordPreview(filePath: string): Promise<void> {
    isPreviewLoading.value = true
    resetSteps()
    setStep('reading')
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.wordRead(filePath)
        if (result.success) {
          wordContent.value = result.content
          wordParagraphs.value = result.paragraphs
          excelData.value = null
          setStep('analyzing')
          setStep('done')
        } else {
          stepError.value = `读取失败: ${(result as Record<string, unknown>).error || '未知错误'}`
          setStep('error')
        }
      }
    } catch (error) {
      console.error('Failed to load Word:', error)
      stepError.value = `读取失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      setStep('error')
    } finally {
      isPreviewLoading.value = false
    }
  }

  async function loadImagePreview(filePath: string): Promise<void> {
    isPreviewLoading.value = true
    resetSteps()
    setStep('reading')
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.readFileAsDataURL(filePath)
        if (result.success && result.dataUrl) {
          wordContent.value = result.dataUrl
          wordParagraphs.value = []
          excelData.value = null
          setStep('done')
        } else {
          stepError.value = '读取图片失败'
          setStep('error')
        }
      }
    } catch (error) {
      console.error('Failed to load image:', error)
      stepError.value = `读取失败: ${error instanceof Error ? error.message : 'Unknown error'}`
      setStep('error')
    } finally {
      isPreviewLoading.value = false
    }
  }

  async function openFile(): Promise<string | null> {
    if (!window.electronAPI) return null
    const result = await window.electronAPI.openFileDialog()
    if (result.canceled || !result.filePath) return null

    const fileName = result.filePath.split(/[/\\]/).pop() || 'unknown'
    const ext = fileName.split('.').pop()?.toLowerCase() || 'other'

    const fileInfo: FileInfo = {
      id: `file_${Date.now()}`,
      name: fileName,
      path: result.filePath,
      type: ext as FileInfo['type'],
      size: 0,
      lastModified: new Date().toISOString(),
      tags: []
    }

    files.value.push(fileInfo)
    currentFile.value = fileInfo

    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']
    if (['xlsx', 'xls'].includes(ext)) {
      await loadExcelPreview(result.filePath)
    } else if (['docx', 'doc'].includes(ext)) {
      await loadWordPreview(result.filePath)
    } else if (imageExts.includes(ext)) {
      await loadImagePreview(result.filePath)
    }

    return result.filePath
  }

  function clearCurrentFile(): void {
    currentFile.value = null
    excelData.value = null
    wordContent.value = ''
    wordParagraphs.value = []
    resetSteps()
  }

  return {
    files,
    currentFile,
    excelData,
    wordContent,
    wordParagraphs,
    fileTree,
    isPreviewLoading,
    currentStep,
    completedSteps,
    stepError,
    aiModifyResult,
    setFiles,
    selectFile,
    loadExcelPreview,
    loadWordPreview,
    loadImagePreview,
    openFile,
    clearCurrentFile,
    resetSteps,
    setStep
  }
})
