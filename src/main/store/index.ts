import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

interface Task {
  id: string
  title: string
  date: string
  startTime?: string
  endTime?: string
  priority: 'low' | 'medium' | 'high'
  status: 'todo' | 'doing' | 'done'
  description?: string
  createdAt: string
  updatedAt: string
}

interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  type: 'text' | 'image' | 'file' | 'table_preview' | 'progress' | 'action_button'
  timestamp: string
}

interface StoreData {
  tasks: Task[]
  chatHistory: ChatMessage[]
  config: Record<string, unknown>
}

export class LocalStore {
  private dataDir: string
  private dataPath: string
  private data: StoreData

  constructor() {
    this.dataDir = join(app.getPath('userData'), 'data')
    this.dataPath = join(this.dataDir, 'store.json')

    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true })
    }

    this.data = this.load()
  }

  getDataPath(): string {
    return this.dataDir
  }

  private load(): StoreData {
    try {
      if (existsSync(this.dataPath)) {
        const raw = readFileSync(this.dataPath, 'utf-8')
        return JSON.parse(raw)
      }
    } catch {
      // Corrupted data, start fresh
    }

    return {
      tasks: [],
      chatHistory: [],
      config: {
        apiKey: '',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-chat'
      }
    }
  }

  private save(): void {
    writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2), 'utf-8')
  }

  // Task operations
  getTasks(): Task[] {
    return this.data.tasks
  }

  createTask(task: Record<string, unknown>): Task {
    const newTask: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: task.title as string,
      date: task.date as string,
      startTime: task.startTime as string | undefined,
      endTime: task.endTime as string | undefined,
      priority: (task.priority as Task['priority']) || 'medium',
      status: (task.status as Task['status']) || 'todo',
      description: task.description as string | undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    this.data.tasks.push(newTask)
    this.save()
    return newTask
  }

  updateTask(id: string, updates: Record<string, unknown>): Task | null {
    const index = this.data.tasks.findIndex((t) => t.id === id)
    if (index === -1) return null
    this.data.tasks[index] = {
      ...this.data.tasks[index],
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    } as Task
    this.save()
    return this.data.tasks[index]
  }

  deleteTask(id: string): boolean {
    const index = this.data.tasks.findIndex((t) => t.id === id)
    if (index === -1) return false
    this.data.tasks.splice(index, 1)
    this.save()
    return true
  }

  // Chat history
  getChatHistory(): ChatMessage[] {
    return this.data.chatHistory
  }

  saveChatMessage(message: ChatMessage): void {
    this.data.chatHistory.push(message)
    this.save()
  }

  clearChatHistory(): void {
    this.data.chatHistory = []
    this.save()
  }

  // Config
  getConfig(key: string): unknown {
    return this.data.config[key]
  }

  setConfig(key: string, value: unknown): void {
    this.data.config[key] = value
    this.save()
  }
}
