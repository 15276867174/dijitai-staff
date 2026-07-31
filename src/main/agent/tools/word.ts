import type { ChatCompletionTool } from 'openai/resources/chat/completions'

export const wordTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'generate_word',
      description: '根据用户描述生成Word文档(.docx)，保存到指定路径。可以生成报告、合同、授权书、通知等各类文档',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: '生成的Word文档保存路径，如 C:/Users/xxx/Desktop/授权书.docx'
          },
          title: {
            type: 'string',
            description: '文档标题'
          },
          content: {
            type: 'string',
            description: '文档正文内容，可使用\\n分隔段落，使用**文字**标记加粗'
          }
        },
        required: ['filePath', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_word',
      description: '读取Word文档(.docx)的文本内容',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Word文档的完整路径'
          }
        },
        required: ['filePath']
      }
    }
  }
]
