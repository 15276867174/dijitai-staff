import * as XLSX from 'xlsx'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { app } from 'electron'

interface ExcelData {
  headers: string[]
  rows: unknown[][]
  summary: {
    rowCount: number
    columnCount: number
    sheetName: string
  }
}

export class ExcelService {
  private getTempDir(): string {
    return join(app.getPath('userData'), 'temp')
  }

  async readExcel(filePath: string): Promise<ExcelData> {
    const buffer = await readFile(filePath)
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 })

    if (jsonData.length === 0) {
      return { headers: [], rows: [], summary: { rowCount: 0, columnCount: 0, sheetName } }
    }

    const headers = (jsonData[0] as string[]) || []
    const rows = jsonData.slice(1) as unknown[][]

    return {
      headers,
      rows,
      summary: {
        rowCount: rows.length,
        columnCount: headers.length,
        sheetName
      }
    }
  }

  async previewExcel(filePath: string): Promise<{ headers: string[]; rows: unknown[][]; totalRows: number }> {
    const data = await this.readExcel(filePath)
    return {
      headers: data.headers,
      rows: data.rows.slice(0, 10),
      totalRows: data.summary.rowCount
    }
  }

  async writeExcel(filePath: string, data: unknown[][], sheetName: string = 'Sheet1'): Promise<{ success: boolean; filePath: string }> {
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    await writeFile(filePath, buffer)
    return { success: true, filePath }
  }

  async generateExcel(description: string): Promise<{ filePath: string; previewData: ExcelData }> {
    const fileName = `generated_${Date.now()}.xlsx`
    const filePath = join(this.getTempDir(), fileName)

    const sampleData = [
      ['示例列1', '示例列2', '示例列3'],
      ['数据1', '数据2', '数据3']
    ]

    await this.writeExcel(filePath, sampleData, 'Sheet1')

    return {
      filePath,
      previewData: {
        headers: sampleData[0],
        rows: sampleData.slice(1),
        summary: { rowCount: 1, columnCount: 3, sheetName: 'Sheet1' }
      }
    }
  }
}
