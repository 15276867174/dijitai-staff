import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatMessage, ChatSession, QuickCommand } from '../../types/chat'

export const useChatStore = defineStore('chat', () => {
  const sessions = ref<ChatSession[]>([])
  const currentSessionId = ref<string>('')
  const messages = ref<ChatMessage[]>([])
  const isStreaming = ref(false)
  const streamingContent = ref('')

  const quickCommands: QuickCommand[] = [
    { id: '1', label: '📊 分析表格', icon: '📊', prompt: '请帮我分析这份表格数据：' },
    { id: '2', label: '📝 生成周报', icon: '📝', prompt: '请帮我生成一份本周工作总结周报：' },
    { id: '3', label: '🔍 联网搜索', icon: '🔍', prompt: '请帮我搜索以下信息：' },
    { id: '4', label: '📋 创建任务', icon: '📋', prompt: '请帮我创建以下任务：' }
  ]

  function createSession(): string {
    const id = `session_${Date.now()}`
    const session: ChatSession = {
      id,
      title: '新对话',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    sessions.value.push(session)
    currentSessionId.value = id
    return id
  }

  function addMessage(message: ChatMessage): void {
    messages.value.push(message)
    const session = sessions.value.find((s) => s.id === currentSessionId.value)
    if (session) {
      session.messages.push(message)
      session.updatedAt = new Date().toISOString()
      if (session.messages.length === 1 && message.role === 'user') {
        session.title = message.content.slice(0, 30) || '新对话'
      }
    }
  }

  function startStreaming(): void {
    isStreaming.value = true
    streamingContent.value = ''
  }

  function appendStreamChunk(chunk: string): void {
    streamingContent.value += chunk
  }

  function finishStreaming(): void {
    if (streamingContent.value) {
      addMessage({
        id: `msg_${Date.now()}`,
        sessionId: currentSessionId.value,
        role: 'assistant',
        content: streamingContent.value,
        type: 'text',
        timestamp: new Date().toISOString()
      })
    }
    isStreaming.value = false
    streamingContent.value = ''
  }

  function clearMessages(): void {
    messages.value = []
    const session = sessions.value.find((s) => s.id === currentSessionId.value)
    if (session) {
      session.messages = []
    }
  }

  if (sessions.value.length === 0) {
    createSession()
  }

  return {
    sessions,
    currentSessionId,
    messages,
    isStreaming,
    streamingContent,
    quickCommands,
    createSession,
    addMessage,
    startStreaming,
    appendStreamChunk,
    finishStreaming,
    clearMessages
  }
})
