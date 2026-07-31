/**
 * Image preprocessing pipeline for OCR quality improvement.
 * Uses Canvas API to: scale to high DPI, grayscale, enhance contrast,
 * Otsu binarization, and denoising.
 *
 * Based on research: 150→300 DPI improves character accuracy by 12-18%.
 */

const TARGET_SHORT_SIDE = 2400 // aim for ~300 DPI equivalent

export interface PreprocessResult {
  dataUrl: string
  width: number
  height: number
}

/**
 * Full preprocessing pipeline: scale → grayscale → contrast → binarize → denoise
 */
export async function preprocessImage(file: File | Blob | string): Promise<PreprocessResult> {
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  // Step 1: Scale to target DPI
  const { width, height } = calcTargetSize(img.width, img.height)
  canvas.width = width
  canvas.height = height
  ctx.drawImage(img, 0, 0, width, height)

  // Step 2-5: Process
  let imageData = ctx.getImageData(0, 0, width, height)
  const pixels = imageData.data
  toGrayscale(pixels)
  stretchContrast(pixels)
  const threshold = otsuThreshold(pixels)
  applyThreshold(pixels, threshold)
  medianFilter(pixels, width, height)

  ctx.putImageData(imageData, 0, 0)
  return { dataUrl: canvas.toDataURL('image/png'), width, height }
}

/**
 * Rotate an image data URL by 90° increments (0, 90, 180, 270).
 */
export async function rotateImage(
  src: string,
  degrees: 90 | 180 | 270
): Promise<PreprocessResult> {
  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  if (degrees === 90) {
    canvas.width = img.height
    canvas.height = img.width
    ctx.translate(canvas.width, 0)
    ctx.rotate(Math.PI / 2)
  } else if (degrees === 180) {
    canvas.width = img.width
    canvas.height = img.height
    ctx.translate(canvas.width, canvas.height)
    ctx.rotate(Math.PI)
  } else {
    canvas.width = img.height
    canvas.height = img.width
    ctx.translate(0, canvas.height)
    ctx.rotate(-Math.PI / 2)
  }

  ctx.drawImage(img, 0, 0)
  return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height }
}

/**
 * Lightweight preprocessing — only scale + grayscale + contrast.
 * Faster, use as fallback when binarization is too aggressive.
 */
export async function preprocessLight(file: File | Blob | string): Promise<PreprocessResult> {
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  const { width, height } = calcTargetSize(img.width, img.height)
  canvas.width = width
  canvas.height = height
  ctx.drawImage(img, 0, 0, width, height)

  const imageData = ctx.getImageData(0, 0, width, height)
  toGrayscale(imageData.data)
  stretchContrast(imageData.data)

  ctx.putImageData(imageData, 0, 0)
  return { dataUrl: canvas.toDataURL('image/png'), width, height }
}

// ─── helpers ────────────────────────────────────────────────

async function loadImage(src: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    if (typeof src === 'string') {
      img.src = src
    } else {
      img.src = URL.createObjectURL(src)
    }
  })
}

function calcTargetSize(w: number, h: number): { width: number; height: number } {
  const shortSide = Math.min(w, h)
  if (shortSide >= TARGET_SHORT_SIDE) return { width: w, height: h }
  const scale = TARGET_SHORT_SIDE / shortSide
  return { width: Math.round(w * scale), height: Math.round(h * scale) }
}

function toGrayscale(pixels: Uint8ClampedArray): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]
    pixels[i] = pixels[i + 1] = pixels[i + 2] = gray
  }
}

function stretchContrast(pixels: Uint8ClampedArray): void {
  let min = 255, max = 0
  for (let i = 0; i < pixels.length; i += 4) {
    const v = pixels[i]
    if (v < min) min = v
    if (v > max) max = v
  }
  if (max - min < 10) return // already flat, skip
  const range = max - min
  for (let i = 0; i < pixels.length; i += 4) {
    const stretched = ((pixels[i] - min) / range) * 255
    pixels[i] = pixels[i + 1] = pixels[i + 2] = stretched
  }
}

function otsuThreshold(pixels: Uint8ClampedArray): number {
  const histogram = new Array(256).fill(0)
  for (let i = 0; i < pixels.length; i += 4) {
    histogram[Math.round(pixels[i])]++
  }
  const total = pixels.length / 4
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * histogram[i]

  let sumB = 0, wB = 0, wF = 0, maxVariance = 0, threshold = 128

  for (let t = 0; t < 256; t++) {
    wB += histogram[t]
    if (wB === 0) continue
    wF = total - wB
    if (wF === 0) break
    sumB += t * histogram[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const variance = wB * wF * (mB - mF) * (mB - mF)
    if (variance > maxVariance) {
      maxVariance = variance
      threshold = t
    }
  }
  return threshold
}

function applyThreshold(pixels: Uint8ClampedArray, threshold: number): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const v = pixels[i] > threshold ? 255 : 0
    pixels[i] = pixels[i + 1] = pixels[i + 2] = v
  }
}

function medianFilter(pixels: Uint8ClampedArray, w: number, h: number): void {
  const copy = new Uint8ClampedArray(pixels)
  const get = (x: number, y: number) => copy[(y * w + x) * 4]

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const neighbors = [
        get(x - 1, y - 1), get(x, y - 1), get(x + 1, y - 1),
        get(x - 1, y),     get(x, y),     get(x + 1, y),
        get(x - 1, y + 1), get(x, y + 1), get(x + 1, y + 1)
      ].sort((a, b) => a - b)
      const median = neighbors[4]
      const idx = (y * w + x) * 4
      pixels[idx] = pixels[idx + 1] = pixels[idx + 2] = median
    }
  }
}
