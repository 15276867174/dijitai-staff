import type { ChatCompletionTool } from 'openai/resources/chat/completions'

export const searchTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: '联网搜索最新信息，返回相关的搜索结果列表',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词'
          }
        },
        required: ['query']
      }
    }
  }
]
