export interface FileInfo {
  id: string
  name: string
  path: string
  type: FileType
  size: number
  lastModified: string
  tags: string[]
}

export type FileType = 'xlsx' | 'xls' | 'docx' | 'doc' | 'png' | 'jpg' | 'jpeg' | 'pdf' | 'other'

export interface ExcelData {
  headers: string[]
  rows: unknown[][]
  summary: {
    rowCount: number
    columnCount: number
    sheetName: string
  }
}

export interface ExcelModification {
  cell: string
  row: number
  col: number
  oldValue: unknown
  newValue: unknown
  type: 'added' | 'deleted' | 'modified'
}

export interface WordData {
  content: string
  paragraphs: string[]
}

export interface WordModification {
  paragraphIndex: number
  oldText: string
  newText: string
  type: 'added' | 'deleted' | 'modified'
}

export interface OcrResult {
  text: string
  confidence: number
  blocks?: OcrBlock[]
}

export interface OcrBlock {
  text: string
  confidence: number
  bbox: { x: number; y: number; width: number; height: number }
}

export interface FileTreeNode {
  id: string
  name: string
  type: 'file' | 'directory'
  path: string
  children?: FileTreeNode[]
  fileType?: FileType
  size?: number
}
