import { join } from 'path'
import { app } from 'electron'
import { existsSync, statSync } from 'fs'
import { readFile } from 'fs/promises'
import { fork } from 'child_process'

// Lazy-load sharp — native module may fail in some Electron environments
let sharpAvailable = false
let preprocessImage: any = null
let preprocessLight: any = null
let rotateImage: any = null

function loadSharp(): void {
  if (sharpAvailable) return
  try {
    const mod = require('./imagePreprocessor')
    preprocessImage = mod.preprocessImage
    preprocessLight = mod.preprocessLight
    rotateImage = mod.rotateImage
    sharpAvailable = true
    console.log('[OCR] Sharp image preprocessor loaded successfully')
  } catch (e: any) {
    console.warn('[OCR] Sharp unavailable, will use raw OCR only:', e.message)
    sharpAvailable = false
  }
}

export interface OcrProgress {
  stage: string
  progress: number // 0-100
  message: string
}

export interface OcrResult {
  text: string
  confidence: number
  preprocessed: boolean
  rotationUsed: number
  stage: string
}

export class OcrService {
  /**
   * Full OCR pipeline with sharp-based preprocessing.
   * Uses a quality score (confidence × capped text length) to compare stages,
   * so long garbled output can't beat shorter accurate output.
   */
  async recognize(
    imagePath: string,
    onProgress?: (progress: OcrProgress) => void
  ): Promise<OcrResult> {
    const fileBuffer = await readFile(imagePath)

    const stat = statSync(imagePath)
    console.log('[OCR] Input file size:', stat.size, 'bytes')

    // Lazy-load sharp (may not be available in all environments)
    loadSharp()

    const langPath = this.findLangPath()
    if (!existsSync(join(langPath, 'chi_sim.traineddata.gz'))) {
      console.error('[OCR] Language data not found at', langPath)
      return { text: '', confidence: 0, preprocessed: false, rotationUsed: 0, stage: 'error:no_lang' }
    }

    // Score function: confidence weighted by log of useful text length.
    // This prevents long garbled text (low conf, high len) from beating short accurate text.
    const score = (conf: number, len: number) => conf * Math.log2(1 + Math.min(len, 500))

    let bestResult: OcrResult = { text: '', confidence: 0, preprocessed: false, rotationUsed: 0, stage: 'none' }
    let bestScore = 0

    // Helper: try a stage, update best if score improves
    const tryStage = async (
      stageName: string,
      preprocessed: boolean,
      rotationUsed: number,
      ocrImagePath: string
    ): Promise<boolean> => {
      try {
        const result = await this.runTesseract(ocrImagePath, langPath)
        const len = result.text?.length || 0
        const conf = result.confidence || 0
        const s = score(conf, len)
        console.log(`[OCR] ${stageName} — conf: ${conf}, len: ${len}, score: ${s.toFixed(1)}`)

        if (s > bestScore) {
          bestScore = s
          bestResult = { text: result.text, confidence: conf, preprocessed, rotationUsed, stage: stageName }
        }

        // Early return if very good
        if (conf >= 60 && len > 30) {
          return true
        }
        return false
      } catch (e: any) {
        console.error(`[OCR] ${stageName} error:`, e.message)
        return false
      }
    }

    // Stage 1: Full preprocessing (if sharp available)
    if (sharpAvailable) {
      onProgress?.({ stage: 'preprocess', progress: 15, message: '正在预处理图片（增强清晰度）...' })
      try {
        const preprocessed = await preprocessImage(fileBuffer)
        onProgress?.({ stage: 'ocr', progress: 35, message: '正在识别文字（优化模式）...' })
        if (await tryStage('full_preprocess', true, preprocessed.rotationCorrected, preprocessed.filePath)) {
          onProgress?.({ stage: 'done', progress: 100, message: `识别完成 ✓` })
          return bestResult
        }
      } catch (e: any) {
        console.error('[OCR] Stage 1 preprocess error:', e.message)
      }

      // Stage 2: Light preprocessing
      onProgress?.({ stage: 'preprocess', progress: 50, message: '尝试柔和增强模式...' })
      try {
        const light = await preprocessLight(fileBuffer)
        onProgress?.({ stage: 'ocr', progress: 60, message: '正在识别文字（柔和模式）...' })
        if (await tryStage('light_preprocess', true, 0, light.filePath)) {
          onProgress?.({ stage: 'done', progress: 100, message: `识别完成 ✓` })
          return bestResult
        }
      } catch (e: any) {
        console.error('[OCR] Stage 2 preprocess error:', e.message)
      }
    } else {
      console.log('[OCR] Sharp unavailable, skipping to raw OCR')
    }

    // Stage 3: Raw OCR on original image (always runs)
    onProgress?.({ stage: 'ocr', progress: 70, message: '正在识别文字（原始模式）...' })
    if (await tryStage('raw', false, 0, imagePath)) {
      onProgress?.({ stage: 'done', progress: 100, message: `识别完成 ✓` })
      return bestResult
    }

    // Stage 4: Multi-angle rotation fallback (if sharp available)
    if (sharpAvailable) {
      onProgress?.({ stage: 'ocr', progress: 85, message: '尝试旋转矫正识别...' })
      const rotations: (90 | 180 | 270)[] = [90, 180, 270]
      for (const deg of rotations) {
        try {
          const rotated = await rotateImage(fileBuffer, deg)
          onProgress?.({ stage: 'ocr', progress: 85 + (rotations.indexOf(deg) + 1) * 4,
            message: `尝试 ${deg}° 旋转矫正...` })
          if (await tryStage(`rotated_${deg}`, true, deg, rotated.filePath)) {
            break
          }
        } catch (e: any) {
          console.error(`[OCR] Stage 4 ${deg}° error:`, e.message)
        }
      }
    }

    if (bestResult.text) {
      onProgress?.({ stage: 'done', progress: 100,
        message: `识别完成（${bestResult.stage}, 置信度 ${bestResult.confidence}%）` })
    } else {
      onProgress?.({ stage: 'done', progress: 100, message: '识别完成（未检测到文字）' })
    }

    return bestResult
  }

  /**
   * Run Tesseract via worker process (best-quality model with PSM cascade).
   */
  private async runTesseract(
    imagePath: string,
    langPath: string,
    timeoutMs = 25000
  ): Promise<{ text: string; confidence: number }> {
    try {
      const Tesseract = require('tesseract.js')
      console.log('[OCR Tesseract] Recognizing:', imagePath.slice(-40))

      // Race against timeout
      const run = async () => {
        // PSM 3: Auto page segmentation (good default for most images)
        const result = await Tesseract.recognize(imagePath, 'chi_sim+eng', {
          langPath,
          tessedit_pageseg_mode: '3'
        })
        const preview = (result.data.text || '').substring(0, 80).replace(/\n/g, ' ')
        console.log('[OCR Tesseract] PSM3 conf:', result.data.confidence, 'text:', preview)
        return { text: result.data.text.trim(), confidence: result.data.confidence }
      }

      const timeout = new Promise<{ text: string; confidence: number }>((_, reject) =>
        setTimeout(() => reject(new Error('Tesseract timed out')), timeoutMs)
      )

      const result = await Promise.race([run(), timeout])
      return result
    } catch (e: any) {
      console.error('[OCR Tesseract] Error:', e.message)
      return { text: '', confidence: 0 }
    }
  }

  private findLangPath(): string {
    const candidates = [
      join(app.getAppPath(), 'resources', 'tessdata'),
      join(app.getAppPath(), 'dist', 'tessdata'),
      join(process.resourcesPath, 'tessdata')
    ]
    return candidates.find(p => existsSync(p)) || candidates[0]
  }
}
