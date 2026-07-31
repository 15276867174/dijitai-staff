import OpenAI from 'openai'
import { SYSTEM_PROMPT } from './prompts'
import { excelTools } from './tools/excel'
import { ocrTools } from './tools/ocr'
import { searchTools } from './tools/search'
import { wordTools } from './tools/word'
import { ExcelService } from '../services/excelService'
import { SearchService } from '../services/searchService'
import { OcrService } from '../services/ocrService'
import { WordService } from '../services/wordService'
import { LocalStore } from '../store'

export class Agent {
  private excelService: ExcelService
  private searchService: SearchService
  private ocrService: OcrService
  private wordService: WordService
  private store: LocalStore

  constructor(store: LocalStore) {
    this.excelService = new ExcelService()
    this.searchService = new SearchService()
    this.ocrService = new OcrService()
    this.wordService = new WordService()
    this.store = store
  }

  private getClient(): OpenAI {
    const apiKey = (this.store.getConfig('apiKey') as string) || process.env.OPENAI_API_KEY || ''
    const baseURL = (this.store.getConfig('baseUrl') as string) || process.env.OPENAI_BASE_URL || 'https://api.deepseek.com'
    return new OpenAI({ apiKey, baseURL })
  }

  private getAllTools() {
    return [...excelTools, ...ocrTools, ...searchTools, ...wordTools]
  }

  async *chat(
    message: string,
    files?: string[],
    context?: Record<string, unknown>
  ): AsyncGenerator<string> {
    console.log('[Agent] chat() started')
    const client = this.getClient()
    console.log('[Agent] Client created, apiKey present:', !!client.apiKey)
    const tools = this.getAllTools()

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ]

    // Include conversation history for context continuity
    if (context?.history) {
      const history = context.history as Array<{ role: string; content: string; type?: string; metadata?: Record<string, unknown> }>
      for (const msg of history) {
        if (msg.role === 'user') {
          if (msg.type === 'image' && msg.metadata?.fileName) {
            messages.push({ role: 'user', content: `[用户发送了图片: ${msg.metadata.fileName}]` })
          } else if (msg.type === 'file' && msg.metadata?.fileName) {
            messages.push({ role: 'user', content: `[用户发送了文件: ${msg.metadata.fileName}] ${msg.content}` })
          } else if (msg.content) {
            messages.push({ role: 'user', content: msg.content })
          }
        } else if (msg.role === 'assistant' && msg.content) {
          messages.push({ role: 'assistant', content: msg.content })
        }
      }
    }

    // User message (OCR text already included by frontend)
    messages.push({ role: 'user', content: message })

    // Notify about non-image files
    if (files && files.length > 0) {
      const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp']
      const nonImageFiles = files.filter(f => {
        const ext = f.split('.').pop()?.toLowerCase() || ''
        return !IMAGE_EXTS.includes(ext)
      })
      if (nonImageFiles.length > 0) {
        const fileInfo = nonImageFiles.map((f) => `[用户上传了文件: ${f}]`).join('\n')
        messages.push({ role: 'system', content: fileInfo })
      }
    }

    let iteration = 0
    const maxIterations = 5

    while (iteration < maxIterations) {
      iteration++

      const model = (this.store.getConfig('model') as string) || 'deepseek-chat'
      console.log('[Agent] Calling API, model:', model, 'messages count:', messages.length)
      const stream = await client.chat.completions.create({
        model,
        messages,
        tools,
        stream: true
      })
      console.log('[Agent] API stream created')

      let fullContent = ''
      let toolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map()

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta

        if (delta?.content) {
          fullContent += delta.content
          yield delta.content
        }

        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const index = tc.index ?? 0
            if (!toolCalls.has(index)) {
              toolCalls.set(index, { id: tc.id || '', name: tc.function?.name || '', arguments: '' })
            }
            const existing = toolCalls.get(index)!
            if (tc.id) existing.id = tc.id
            if (tc.function?.name) existing.name = tc.function.name
            if (tc.function?.arguments) existing.arguments += tc.function.arguments
          }
        }
      }

      if (toolCalls.size === 0) {
        break
      }

      messages.push({ role: 'assistant', content: fullContent || null, tool_calls: Array.from(toolCalls.values()).map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: { name: tc.name, arguments: tc.arguments }
      })) })

      for (const [, tc] of toolCalls) {
        yield `\n\n🔧 正在调用工具: ${tc.name}...\n\n`
        const result = await this.executeTool(tc.name, tc.arguments)
        // If word/excel was generated, emit download marker for frontend
        if (result && (result as Record<string, unknown>).success && (result as Record<string, unknown>).filePath) {
          const r = result as Record<string, unknown>
          yield `\n[FILE_DOWNLOAD:${r.filePath}|${r.fileName || 'download.docx'}]\n`
        }
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result)
        })
      }
    }
  }

  private async executeTool(name: string, argsStr: string): Promise<unknown> {
    try {
      const args = JSON.parse(argsStr)
      switch (name) {
        case 'read_excel':
          return await this.excelService.readExcel(args.filePath)
        case 'write_excel':
          return await this.excelService.writeExcel(args.filePath, args.data, args.sheetName)
        case 'generate_excel':
          return await this.excelService.generateExcel(args.description)
        case 'ocr_image':
          return await this.ocrService.recognize(args.imagePath)
        case 'search_web':
          return await this.searchService.search(args.query)
        case 'generate_word':
          return await this.wordService.generateDocx(
            args.filePath || undefined,
            { title: args.title, paragraphs: (args.content || '').split('\n').filter((p: string) => p.trim()) }
          )
        case 'read_word':
          return await this.wordService.readDocx(args.filePath)
        default:
          return { error: `Unknown tool: ${name}` }
      }
    } catch (error) {
      return { error: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
    }
  }
}
