export interface AgentTool {
  name: string
  description: string
  parameters: AgentToolParameter[]
}

export interface AgentToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  required: boolean
  defaultValue?: unknown
}

export interface AgentToolResult {
  success: boolean
  data?: unknown
  error?: string
}

export interface AgentContext {
  sessionId: string
  history: AgentMessage[]
  files: string[]
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  toolCalls?: AgentToolCall[]
  toolCallId?: string
}

export interface AgentToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface AgentConfig {
  apiKey: string
  baseUrl: string
  model: string
  maxTokens: number
  temperature: number
}

export interface AgentStreamEvent {
  type: 'text' | 'tool_call' | 'progress' | 'error' | 'done'
  content?: string
  toolCall?: AgentToolCall
  progress?: number
  error?: string
}
