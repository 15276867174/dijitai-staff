import type { ChatCompletionTool } from 'openai/resources/chat/completions'

export const ocrTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'ocr_image',
      description: '识别图片中的文字内容，支持中文和英文',
      parameters: {
        type: 'object',
        properties: {
          imagePath: {
            type: 'string',
            description: '图片文件的完整路径'
          }
        },
        required: ['imagePath']
      }
    }
  }
]
