import { Router } from 'express'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import cv from '@techstark/opencv-js'

export const watermarkRemovalRouter = Router()

const uploadDir = process.env.UPLOAD_DIR || './temp/uploads'
const processedDir = './temp/processed'

async function ensureProcessedDir() {
  try {
    await fs.access(processedDir)
  } catch {
    await fs.mkdir(processedDir, { recursive: true })
  }
}

ensureProcessedDir()

interface WatermarkArea {
  x: number
  y: number
  width: number
  height: number
}

watermarkRemovalRouter.post('/remove-watermark', async (req, res, next) => {
  try {
    const { imageId, watermarkArea }: { imageId: string; watermarkArea: WatermarkArea } = req.body

    if (!imageId) {
      return res.status(400).json({
        error: true,
        message: 'Image ID is required',
        code: 'MISSING_IMAGE_ID',
        statusCode: 400
      })
    }

    if (!watermarkArea || !watermarkArea.x || !watermarkArea.y || !watermarkArea.width || !watermarkArea.height) {
      return res.status(400).json({
        error: true,
        message: 'Watermark area coordinates are required',
        code: 'MISSING_WATERMARK_AREA',
        statusCode: 400
      })
    }

    const files = await fs.readdir(uploadDir)
    const imageFile = files.find(file => file.includes(imageId))

    if (!imageFile) {
      return res.status(404).json({
        error: true,
        message: 'Image not found',
        code: 'IMAGE_NOT_FOUND',
        statusCode: 404
      })
    }

    const inputPath = path.join(uploadDir, imageFile)
    const outputFileName = `${uuidv4()}.${path.extname(imageFile).substring(1)}`
    const outputPath = path.join(processedDir, outputFileName)

    // Get original image metadata
    const originalMetadata = await sharp(inputPath).metadata()
    
    // Read image using Sharp and convert to buffer
    const imageBuffer = await sharp(inputPath).raw().toBuffer()
    
    // Initialize OpenCV
    const src = cv.matFromImageData({
      data: new Uint8ClampedArray(imageBuffer),
      width: originalMetadata.width!,
      height: originalMetadata.height!
    })

    // Create mask for the watermark area
    const mask = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1)
    const maskROI = new cv.Rect(
      Math.max(0, Math.floor(watermarkArea.x)),
      Math.max(0, Math.floor(watermarkArea.y)),
      Math.min(src.cols - Math.floor(watermarkArea.x), Math.floor(watermarkArea.width)),
      Math.min(src.rows - Math.floor(watermarkArea.y), Math.floor(watermarkArea.height))
    )
    
    // Set mask region to white (255) for inpainting
    const maskROImat = mask.roi(maskROI)
    maskROImat.setTo(new cv.Scalar(255))

    // Apply inpainting using Telea algorithm
    const dst = new cv.Mat()
    cv.inpaint(src, mask, dst, 3, cv.INPAINT_TELEA)

    // Convert result back to image buffer
    const resultBuffer = new Uint8Array(dst.data)
    
    // Use Sharp to save the processed image
    let processedImage = sharp(Buffer.from(resultBuffer), {
      raw: {
        width: dst.cols,
        height: dst.rows,
        channels: dst.channels()
      }
    })

    // Maintain original format
    const format = path.extname(imageFile).substring(1).toLowerCase()
    switch (format) {
      case 'jpg':
      case 'jpeg':
        processedImage = processedImage.jpeg({ quality: 95 })
        break
      case 'png':
        processedImage = processedImage.png()
        break
      case 'webp':
        processedImage = processedImage.webp({ quality: 95 })
        break
      default:
        processedImage = processedImage.jpeg({ quality: 95 })
    }

    await processedImage.toFile(outputPath)

    // Clean up OpenCV matrices
    src.delete()
    mask.delete()
    maskROImat.delete()
    dst.delete()

    const stats = await fs.stat(outputPath)

    res.json({
      success: true,
      data: {
        url: `/api/download/${outputFileName}`,
        processedSize: stats.size,
        format
      },
      message: 'Watermark removed successfully'
    })
  } catch (error) {
    console.error('Watermark removal error:', error)
    next(error)
  }
})