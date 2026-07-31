// Standalone OCR worker — spawned as child process
const Tesseract = require('tesseract.js')
const path = require('path')
const fs = require('fs')

process.on('message', async ({ imagePath, langPath }) => {
  try {
    if (!fs.existsSync(path.join(langPath, 'chi_sim.traineddata.gz'))) {
      process.send?.({ text: '', confidence: 0, error: 'Language data not found' })
      process.exit(0)
      return
    }

    // PSM 1: Auto page segmentation + OSD (orientation detection for rotated images)
    const result = await Tesseract.recognize(imagePath, 'chi_sim+eng', {
      langPath,
      tessedit_pageseg_mode: '1'
    })

    // If low confidence or empty, try PSM 3
    if (result.data.confidence < 50 || result.data.text.trim().length < 5) {
      const psm3 = await Tesseract.recognize(imagePath, 'chi_sim+eng', {
        langPath,
        tessedit_pageseg_mode: '3'
      })
      if (psm3.data.confidence > result.data.confidence && psm3.data.text.trim().length > 0) {
        process.send?.({ text: psm3.data.text.trim(), confidence: psm3.data.confidence })
        process.exit(0)
        return
      }
    }

    // If still low, try PSM 6 (uniform block)
    if (result.data.confidence < 40 || result.data.text.trim().length < 5) {
      const psm6 = await Tesseract.recognize(imagePath, 'chi_sim+eng', {
        langPath,
        tessedit_pageseg_mode: '6'
      })
      const current = result.data.text.trim()
      if (psm6.data.confidence > result.data.confidence || psm6.data.text.trim().length > current.length) {
        process.send?.({ text: psm6.data.text.trim(), confidence: psm6.data.confidence })
        process.exit(0)
        return
      }
    }

    process.send?.({ text: result.data.text.trim(), confidence: result.data.confidence })
  } catch (e) {
    process.send?.({ text: '', confidence: 0, error: e.message })
  }
  process.exit(0)
})
