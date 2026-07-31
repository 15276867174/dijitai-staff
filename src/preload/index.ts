import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  // Agent
  agentChat: (params: { message: string; files?: string[]; context?: Record<string, unknown> }) => Promise<{ success: boolean; error?: string }>
  onAgentStream: (callback: (data: { chunk: string; done: boolean; error?: boolean; download?: { filePath: string; fileName: string } }) => void) => () => void

  // Window controls
  windowMinimize: () => Promise<void>
  windowMaximize: () => Promise<void>
  windowClose: () => Promise<void>
  windowIsMaximized: () => Promise<boolean>
  onWindowMaximizeChange: (callback: (maximized: boolean) => void) => () => void

  // File dialogs
  openFileDialog: (options?: { filters?: { name: string; extensions: string[] }[] }) => Promise<{ canceled: boolean; filePath?: string }>
  saveFileDialog: (options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<{ canceled: boolean; filePath?: string }>
  openDirectoryDialog: () => Promise<{ canceled: boolean; filePath?: string }>

  // File operations
  readFile: (path: string) => Promise<{ success: boolean; data?: Buffer; error?: string }>
  readFileAsDataURL: (path: string) => Promise<{ success: boolean; dataUrl?: string; error?: string }>
  writeFile: (path: string, data: Buffer) => Promise<{ success: boolean; error?: string }>
  getAppDataPath: () => Promise<string>

  // Excel
  excelRead: (filePath: string) => Promise<{ headers: string[]; rows: unknown[][]; summary: { rowCount: number; columnCount: number; sheetName: string } }>
  excelWrite: (filePath: string, data: unknown[][], sheetName?: string) => Promise<{ success: boolean; filePath: string }>
  excelGenerate: (description: string) => Promise<{ filePath: string; previewData: unknown }>
  excelPreview: (filePath: string) => Promise<{ headers: string[]; rows: unknown[][]; totalRows: number }>

  // Word
  wordRead: (filePath: string) => Promise<{ success: boolean; content: string; paragraphs: string[] }>

  // OCR
  ocrRecognize: (imagePath: string) => Promise<{ success: boolean; text: string; confidence: number; preprocessed: boolean; rotationUsed: number; stage: string }>
  ocrRecognizeBase64: (base64: string) => Promise<{ success: boolean; text: string; confidence: number }>
  onOcrProgress: (callback: (data: { stage: string; progress: number; message: string }) => void) => () => void

  // Search
  searchWeb: (query: string) => Promise<{ results: { title: string; url: string; snippet: string }[] }>

  // Tasks
  taskList: () => Promise<unknown[]>
  taskCreate: (task: Record<string, unknown>) => Promise<unknown>
  taskUpdate: (id: string, updates: Record<string, unknown>) => Promise<unknown>
  taskDelete: (id: string) => Promise<boolean>

  // Chat history
  chatHistory: () => Promise<unknown[]>
  chatClearHistory: () => Promise<void>

  // Config
  configGet: (key: string) => Promise<unknown>
  configSet: (key: string, value: unknown) => Promise<void>
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Agent
  agentChat: (params: { message: string; files?: string[]; context?: Record<string, unknown> }) => ipcRenderer.invoke('agent:chat', params),
  onAgentStream: (callback: (data: { chunk: string; done: boolean; error?: boolean; download?: { filePath: string; fileName: string } }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { chunk: string; done: boolean; error?: boolean; download?: { filePath: string; fileName: string } }) => {
      callback(data)
    }
    ipcRenderer.on('agent:stream', handler)
    return () => ipcRenderer.removeListener('agent:stream', handler)
  },

  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowMaximize: () => ipcRenderer.invoke('window:maximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),
  windowIsMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onWindowMaximizeChange: (callback: (maximized: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, maximized: boolean) => callback(maximized)
    ipcRenderer.on('window:maximizeChange', handler)
    return () => ipcRenderer.removeListener('window:maximizeChange', handler)
  },

  // File dialogs
  openFileDialog: (options?: { filters?: { name: string; extensions: string[] }[] }) => ipcRenderer.invoke('dialog:openFile', options),
  saveFileDialog: (options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => ipcRenderer.invoke('dialog:saveFile', options),
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:openDirectory'),

  // File operations
  readFile: (path: string) => ipcRenderer.invoke('file:read', { path }),
  readFileAsDataURL: (path: string) => ipcRenderer.invoke('file:readAsDataURL', { path }),
  writeFile: (path: string, data: Buffer) => ipcRenderer.invoke('file:write', { path, data }),
  getAppDataPath: () => ipcRenderer.invoke('file:getAppDataPath'),

  // Excel
  excelRead: (filePath: string) => ipcRenderer.invoke('excel:read', { filePath }),
  excelWrite: (filePath: string, data: unknown[][], sheetName?: string) => ipcRenderer.invoke('excel:write', { filePath, data, sheetName }),
  excelGenerate: (description: string) => ipcRenderer.invoke('excel:generate', { description }),
  excelPreview: (filePath: string) => ipcRenderer.invoke('excel:preview', { filePath }),

  // Word
  wordRead: (filePath: string) => ipcRenderer.invoke('word:read', { filePath }),

  // OCR — integrated pipeline with progress streaming
  ocrRecognize: (imagePath: string) => ipcRenderer.invoke('ocr:recognize', { imagePath }),
  ocrRecognizeBase64: (base64: string) => ipcRenderer.invoke('ocr:recognizeBase64', { base64 }),
  /** Stream OCR progress from main process */
  onOcrProgress: (callback: (data: { stage: string; progress: number; message: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { stage: string; progress: number; message: string }) => {
      callback(data)
    }
    ipcRenderer.on('ocr:progress', handler)
    return () => ipcRenderer.removeListener('ocr:progress', handler)
  },

  // Search
  searchWeb: (query: string) => ipcRenderer.invoke('search:web', { query }),

  // Tasks
  taskList: () => ipcRenderer.invoke('task:list'),
  taskCreate: (task: Record<string, unknown>) => ipcRenderer.invoke('task:create', task),
  taskUpdate: (id: string, updates: Record<string, unknown>) => ipcRenderer.invoke('task:update', { id, updates }),
  taskDelete: (id: string) => ipcRenderer.invoke('task:delete', { id }),

  // Chat history
  chatHistory: () => ipcRenderer.invoke('chat:history'),
  chatClearHistory: () => ipcRenderer.invoke('chat:clearHistory'),

  // Config
  configGet: (key: string) => ipcRenderer.invoke('config:get', { key }),
  configSet: (key: string, value: unknown) => ipcRenderer.invoke('config:set', { key, value })
} satisfies ElectronAPI)
