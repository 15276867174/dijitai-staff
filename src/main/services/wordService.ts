import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import mammoth from 'mammoth'

export interface WordContent {
  title?: string
  paragraphs: string[]
}

export class WordService {
  /**
   * Generate a .docx file. If no filePath is given, saves to temp dir.
   */
  async generateDocx(
    filePath: string | undefined,
    content: string | WordContent
  ): Promise<{ success: boolean; filePath: string; fileName: string }> {
    const { title, paragraphs } = typeof content === 'string'
      ? { title: undefined, paragraphs: content.split('\n').filter(p => p.trim()) }
      : content

    const children: Paragraph[] = []

    if (title) {
      children.push(new Paragraph({
        text: title,
        heading: HeadingLevel.TITLE,
        spacing: { after: 300 }
      }))
    }

    for (const text of paragraphs) {
      children.push(new Paragraph({
        children: this.parseRuns(text),
        spacing: { after: 120 }
      }))
    }

    const doc = new Document({ sections: [{ children }] })
    const buffer = await Packer.toBuffer(doc)

    const fileName = `${title || '文档'}_${Date.now()}.docx`
    const savePath = filePath || join(tmpdir(), 'digital-assistant', fileName)

    if (!filePath) {
      await mkdir(join(tmpdir(), 'digital-assistant'), { recursive: true })
    }

    await writeFile(savePath, buffer)
    return { success: true, filePath: savePath, fileName }
  }

  /**
   * Read text content from a .docx file
   */
  async readDocx(filePath: string): Promise<{ success: boolean; content: string; paragraphs: string[] }> {
    try {
      const buffer = await readFile(filePath)
      const result = await mammoth.extractRawText({ buffer })
      const text = result.value.trim()
      const paragraphs = text.split('\n').filter(p => p.trim())
      return { success: true, content: text, paragraphs }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, content: '', paragraphs: [], error: message }
    }
  }

  private parseRuns(text: string): TextRun[] {
    const runs: TextRun[] = []
    const regex = /\*\*(.+?)\*\*/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        runs.push(new TextRun({ text: text.slice(lastIndex, match.index) }))
      }
      runs.push(new TextRun({ text: match[1], bold: true }))
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      runs.push(new TextRun({ text: text.slice(lastIndex) }))
    }

    return runs.length > 0 ? runs : [new TextRun({ text })]
  }
}
