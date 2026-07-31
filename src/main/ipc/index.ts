import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFile, writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { Agent } from '../agent'
import { ExcelService } from '../services/excelService'
import { SearchService } from '../services/searchService'
import { OcrService } from '../services/ocrService'
import { WordService } from '../services/wordService'
import { LocalStore } from '../store'

const store = new LocalStore()
const agent = new Agent(store)
const excelService = new ExcelService()
const searchService = new SearchService()
const ocrService = new OcrService()
const wordService = new WordService()

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // Agent chat
  ipcMain.handle('agent:chat', async (_event, params: { message: string; files?: string[]; context?: Record<string, unknown> }) => {
    console.log('[Agent IPC] Received chat request, message:', params.message?.slice(0, 100))
    try {
      const stream = await agent.chat(params.message, params.files, params.context)
      console.log('[Agent IPC] Got stream, starting iteration')
      for await (const chunk of stream) {
        // Check for file download markers
        const match = chunk.match(/\[FILE_DOWNLOAD:(.+?)\|(.+?)\]/)
        if (match) {
          const cleanChunk = chunk.replace(/\[FILE_DOWNLOAD:(.+?)\|(.+?)\]\n?/, '')
          if (cleanChunk.trim()) {
            mainWindow.webContents.send('agent:stream', { chunk: cleanChunk, done: false })
          }
          mainWindow.webContents.send('agent:stream', {
            chunk: '',
            done: false,
            download: { filePath: match[1], fileName: match[2] }
          })
        } else {
          mainWindow.webContents.send('agent:stream', { chunk, done: false })
        }
      }
      console.log('[Agent IPC] Stream complete')
      mainWindow.webContents.send('agent:stream', { chunk: '', done: true })
      return { success: true }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('[Agent] Chat error:', message, error)
      mainWindow.webContents.send('agent:stream', { chunk: `请求失败: ${message}`, done: true, error: true })
      return { success: false, error: message }
    }
  })

  // File dialogs
  ipcMain.handle('dialog:openFile', async (_event, options?: { filters?: { name: string; extensions: string[] }[] }) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: options?.filters ?? [
        { name: 'All Supported', extensions: ['xlsx', 'xls', 'docx', 'doc', 'png', 'jpg', 'jpeg'] },
        { name: 'Excel', extensions: ['xlsx', 'xls'] },
        { name: 'Word', extensions: ['docx', 'doc'] },
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] }
      ]
    })
    if (result.canceled) return { canceled: true }
    return { canceled: false, filePath: result.filePaths[0] }
  })

  ipcMain.handle('dialog:saveFile', async (_event, options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: options?.defaultPath,
      filters: options?.filters ?? [
        { name: 'Excel', extensions: ['xlsx'] },
        { name: 'Word', extensions: ['docx'] }
      ]
    })
    if (result.canceled) return { canceled: true }
    return { canceled: false, filePath: result.filePath }
  })

  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    if (result.canceled) return { canceled: true }
    return { canceled: false, filePath: result.filePaths[0] }
  })

  // File operations
  ipcMain.handle('file:read', async (_event, { path }: { path: string }) => {
    try {
      const buffer = await readFile(path)
      return { success: true, data: buffer }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('file:readAsDataURL', async (_event, { path }: { path: string }) => {
    try {
      console.log('[IPC] readFileAsDataURL:', path)
      const buffer = await readFile(path)
      const ext = path.split('.').pop()?.toLowerCase()
      const mimeMap: Record<string, string> = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml'
      }
      const mime = mimeMap[ext || ''] || 'application/octet-stream'
      const base64 = buffer.toString('base64')
      console.log('[IPC] readFileAsDataURL success, size:', base64.length)
      return { success: true, dataUrl: `data:${mime};base64,${base64}` }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('[IPC] readFileAsDataURL error:', message)
      return { success: false, error: message }
    }
  })

  ipcMain.handle('file:write', async (_event, { path, data }: { path: string; data: Buffer }) => {
    try {
      await writeFile(path, data)
      return { success: true }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('file:getAppDataPath', () => {
    return store.getDataPath()
  })

  // Excel operations
  ipcMain.handle('excel:read', async (_event, { filePath }: { filePath: string }) => {
    return excelService.readExcel(filePath)
  })

  ipcMain.handle('excel:write', async (_event, params: { filePath: string; data: unknown[][]; sheetName?: string }) => {
    return excelService.writeExcel(params.filePath, params.data, params.sheetName)
  })

  ipcMain.handle('excel:generate', async (_event, { description }: { description: string }) => {
    return excelService.generateExcel(description)
  })

  ipcMain.handle('excel:preview', async (_event, { filePath }: { filePath: string }) => {
    return excelService.previewExcel(filePath)
  })

  // Word operations
  ipcMain.handle('word:read', async (_event, { filePath }: { filePath: string }) => {
    return wordService.readDocx(filePath)
  })

  // OCR — integrated pipeline with sharp preprocessing
  ipcMain.handle('ocr:recognize', async (_event, { imagePath }: { imagePath: string }) => {
    console.log('[OCR IPC] Integrated OCR pipeline for:', imagePath)
    try {
      const result = await ocrService.recognize(imagePath)
      return { success: true, ...result }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('[OCR IPC] Error:', message)
      return { success: false, text: '', confidence: 0, error: message }
    }
  })

  ipcMain.handle('ocr:recognizeBase64', async (_event, { base64 }: { base64: string }) => {
    try {
      const tmpDir = join(tmpdir(), 'digital-assistant')
      await mkdir(tmpDir, { recursive: true })
      const tmpPath = join(tmpDir, `ocr_pre_${randomUUID()}.png`)
      const raw = base64.replace(/^data:image\/\w+;base64,/, '')
      console.log('[OCR Base64] Writing temp file, base64 length:', base64.length, 'decoded:', raw.length)
      const buffer = Buffer.from(raw, 'base64')
      await writeFile(tmpPath, buffer)
      console.log('[OCR Base64] Temp file written:', tmpPath, 'size:', buffer.length)
      const result = await ocrService.recognize(tmpPath)
      console.log('[OCR Base64] Result confidence:', result.confidence, 'text len:', result.text.length)
      try { await unlink(tmpPath) } catch { /* ignore */ }
      return { success: true, ...result }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('[OCR Base64] Error:', message)
      return { success: false, text: '', confidence: 0, error: message }
    }
  })

  // Web search
  ipcMain.handle('search:web', async (_event, { query }: { query: string }) => {
    return searchService.search(query)
  })

  // Task CRUD
  ipcMain.handle('task:list', async () => {
    return store.getTasks()
  })

  ipcMain.handle('task:create', async (_event, task: Record<string, unknown>) => {
    return store.createTask(task)
  })

  ipcMain.handle('task:update', async (_event, { id, updates }: { id: string; updates: Record<string, unknown> }) => {
    return store.updateTask(id, updates)
  })

  ipcMain.handle('task:delete', async (_event, { id }: { id: string }) => {
    return store.deleteTask(id)
  })

  // Chat history
  ipcMain.handle('chat:history', async () => {
    return store.getChatHistory()
  })

  ipcMain.handle('chat:clearHistory', async () => {
    return store.clearChatHistory()
  })

  // Agent config
  ipcMain.handle('config:get', async (_event, { key }: { key: string }) => {
    return store.getConfig(key)
  })

  ipcMain.handle('config:set', async (_event, { key, value }: { key: string; value: unknown }) => {
    return store.setConfig(key, value)
  })
}
