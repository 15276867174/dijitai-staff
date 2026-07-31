import type { ChatCompletionTool } from 'openai/resources/chat/completions'

export const excelTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'read_excel',
      description: '读取Excel文件并返回数据，包括表头、行数据和摘要信息',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Excel文件的完整路径'
          }
        },
        required: ['filePath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_excel',
      description: '写入或修改Excel文件，可以对指定单元格进行修改',
      parameters: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Excel文件的完整路径'
          },
          data: {
            type: 'array',
            description: '要写入的二维数组数据',
            items: { type: 'array', items: {} }
          },
          sheetName: {
            type: 'string',
            description: '工作表名称，默认为Sheet1'
          }
        },
        required: ['filePath', 'data']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_excel',
      description: '根据用户的自然语言描述生成新的Excel文件',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: '对所需Excel的描述，如"生成一份月度销售报表，包含产品名称、销量、单价、总金额、增长率列"'
          }
        },
        required: ['description']
      }
    }
  },
]
