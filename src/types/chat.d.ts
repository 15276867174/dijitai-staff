export type MessageType = 'text' | 'image' | 'file' | 'table_preview' | 'progress' | 'action_button' | 'ocr_result' | 'ocr_error'

export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  sessionId: string
  role: MessageRole
  content: string
  type: MessageType
  timestamp: string
  metadata?: MessageMetadata
}

export interface MessageMetadata {
  fileName?: string
  fileSize?: number
  fileType?: string
  imageUrl?: string
  tableData?: TablePreviewData
  progress?: number
  progressMessage?: string
  actions?: ActionButton[]
  // OCR-specific
  ocrText?: string
  ocrConfidence?: number
  ocrStage?: string
  ocrStructuredData?: Record<string, string>
  canRetry?: boolean
  retryImagePath?: string
}

export interface TablePreviewData {
  headers: string[]
  rows: unknown[][]
  totalRows: number
}

export interface ActionButton {
  label: string
  action: string
  variant?: 'primary' | 'secondary' | 'danger'
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface QuickCommand {
  id: string
  label: string
  icon: string
  prompt: string
}
