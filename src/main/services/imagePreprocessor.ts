/**
 * Main-process image preprocessing using sharp.
 * Handles: DPI scaling, grayscale, contrast normalization,
 * sharpening, thresholding, and auto-rotation.
 */
import sharp from 'sharp'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'

const TARGET_SHORT_SIDE = 2400

export interface PreprocessResult {
  filePath: string
  width: number
  height: number
  /** EXIF-based rotation correction applied (degrees) */
  rotationCorrected: number
}

export interface PreprocessOptions {
  /** Output format, defaults to 'png' */
  format?: 'png' | 'jpeg'
  /** Skip binarization (for light preprocessing) */
  light?: boolean
  /** Target DPI-equivalent short side in pixels */
  targetSize?: number
}

/**
 * Full preprocessing: resize → grayscale → normalize → sharpen → threshold → denoise.
 * If light mode, skips threshold and denoise.
 */
export async function preprocessImage(
  input: Buffer | string,
  options: PreprocessOptions = {}
): Promise<PreprocessResult> {
  const { format = 'png', light = false, targetSize = TARGET_SHORT_SIDE } = options

  let pipeline = sharp(input)

  // Read metadata for auto-rotation
  const metadata = await pipeline.metadata()
  let rotationCorrected = 0

  // Apply EXIF-based auto-rotation
  if (metadata.orientation && metadata.orientation > 1) {
    pipeline = pipeline.rotate() // sharp auto-rotates based on EXIF
    rotationCorrected = getRotationDegrees(metadata.orientation)
  }

  // Resize to target DPI if needed
  const shortSide = Math.min(metadata.width || 9999, metadata.height || 9999)
  if (shortSide > 0 && shortSide < targetSize) {
    const ratio = targetSize / shortSide
    const newW = Math.round((metadata.width || targetSize) * ratio)
    const newH = Math.round((metadata.height || targetSize) * ratio)
    pipeline = pipeline.resize(newW, newH, { fit: 'fill' })
  }

  // Grayscale
  pipeline = pipeline.grayscale()

  // Normalize contrast (CLAHE-like stretch)
  pipeline = pipeline.normalize({ lower: 2, upper: 98 })

  if (!light) {
    // Moderate sharpen to enhance edges
    pipeline = pipeline.sharpen({ sigma: 0.8, m1: 0.6, m2: 0.15 })

    // Use adaptive-like threshold: clip extreme values instead of hard binary
    // Hard threshold(128) destroys text on photos with uneven lighting
    pipeline = pipeline.normalize({ lower: 3, upper: 97 })
    pipeline = pipeline.linear(1.3, -20) // boost contrast without going fully binary
    pipeline = pipeline.median(1) // light denoise
  }

  // Ensure alpha channel removed
  pipeline = pipeline.removeAlpha()

  const outputBuffer = await pipeline.toFormat(format).toBuffer()

  // Write to temp file for OCR
  const tmpDir = join(tmpdir(), 'digital-assistant')
  await mkdir(tmpDir, { recursive: true })
  const outPath = join(tmpDir, `preproc_${randomUUID()}.${format}`)
  await writeFile(outPath, outputBuffer)

  const finalMeta = await sharp(outputBuffer).metadata()
  return {
    filePath: outPath,
    width: finalMeta.width || 0,
    height: finalMeta.height || 0,
    rotationCorrected
  }
}

/**
 * Lightweight preprocessing — resize + grayscale + normalize only.
 */
export async function preprocessLight(
  input: Buffer | string
): Promise<PreprocessResult> {
  return preprocessImage(input, { light: true })
}

/**
 * Manual rotation by 90° increments using sharp.
 */
export async function rotateImage(
  input: Buffer | string,
  degrees: 90 | 180 | 270
): Promise<PreprocessResult> {
  let pipeline = sharp(input)
  pipeline = pipeline.rotate(degrees)

  const outputBuffer = await pipeline.png().toBuffer()
  const tmpDir = join(tmpdir(), 'digital-assistant')
  await mkdir(tmpDir, { recursive: true })
  const outPath = join(tmpDir, `rotated_${randomUUID()}.png`)
  await writeFile(outPath, outputBuffer)

  const meta = await sharp(outputBuffer).metadata()
  return {
    filePath: outPath,
    width: meta.width || 0,
    height: meta.height || 0,
    rotationCorrected: degrees
  }
}

function getRotationDegrees(orientation: number): number {
  // EXIF orientation → rotation degrees
  switch (orientation) {
    case 3: return 180
    case 6: return 90
    case 8: return 270
    default: return 0
  }
}
