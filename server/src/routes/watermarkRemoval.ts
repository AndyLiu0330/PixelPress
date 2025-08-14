import { Router, Request, Response, NextFunction } from 'express'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'

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

watermarkRemovalRouter.post('/remove-watermark', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { imageId, watermarkArea }: { imageId: string; watermarkArea: WatermarkArea } = req.body

    if (!imageId) {
      res.status(400).json({
        error: true,
        message: 'Image ID is required',
        code: 'MISSING_IMAGE_ID',
        statusCode: 400
      })
      return
    }

    if (!watermarkArea || typeof watermarkArea.x !== 'number' || typeof watermarkArea.y !== 'number' || 
        typeof watermarkArea.width !== 'number' || typeof watermarkArea.height !== 'number') {
      res.status(400).json({
        error: true,
        message: 'Watermark area coordinates are required',
        code: 'MISSING_WATERMARK_AREA',
        statusCode: 400
      })
      return
    }

    const files = await fs.readdir(uploadDir)
    const imageFile = files.find(file => file.includes(imageId))

    if (!imageFile) {
      res.status(404).json({
        error: true,
        message: 'Image not found',
        code: 'IMAGE_NOT_FOUND',
        statusCode: 404
      })
      return
    }

    const inputPath = path.join(uploadDir, imageFile)
    const outputFileName = `${uuidv4()}.${path.extname(imageFile).substring(1)}`
    const outputPath = path.join(processedDir, outputFileName)

    // Get original image metadata
    const originalImage = sharp(inputPath)
    const metadata = await originalImage.metadata()
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to get image dimensions')
    }

    // Calculate the blur region coordinates
    const blurX = Math.max(0, Math.floor(watermarkArea.x))
    const blurY = Math.max(0, Math.floor(watermarkArea.y))
    const blurWidth = Math.min(metadata.width - blurX, Math.floor(watermarkArea.width))
    const blurHeight = Math.min(metadata.height - blurY, Math.floor(watermarkArea.height))

    // Extract the region to blur
    const regionToBlur = await sharp(inputPath)
      .extract({ left: blurX, top: blurY, width: blurWidth, height: blurHeight })
      .blur(50) // Apply heavy blur to obscure the watermark
      .toBuffer()

    // Composite the blurred region back onto the original image
    let processedImage = await sharp(inputPath)
      .composite([{
        input: regionToBlur,
        left: blurX,
        top: blurY
      }])

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

// Add a simple blur endpoint as an alternative
watermarkRemovalRouter.post('/blur-region', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { imageId, region }: { imageId: string; region: WatermarkArea } = req.body

    if (!imageId) {
      res.status(400).json({
        error: true,
        message: 'Image ID is required',
        code: 'MISSING_IMAGE_ID',
        statusCode: 400
      })
      return
    }

    const files = await fs.readdir(uploadDir)
    const imageFile = files.find(file => file.includes(imageId))

    if (!imageFile) {
      res.status(404).json({
        error: true,
        message: 'Image not found',
        code: 'IMAGE_NOT_FOUND',
        statusCode: 404
      })
      return
    }

    const inputPath = path.join(uploadDir, imageFile)
    const outputFileName = `${uuidv4()}.${path.extname(imageFile).substring(1)}`
    const outputPath = path.join(processedDir, outputFileName)

    // Simply blur the entire image as a fallback
    await sharp(inputPath)
      .blur(5)
      .toFile(outputPath)

    const stats = await fs.stat(outputPath)

    res.json({
      success: true,
      data: {
        url: `/api/download/${outputFileName}`,
        processedSize: stats.size,
        format: path.extname(imageFile).substring(1).toLowerCase()
      },
      message: 'Image processed successfully'
    })
  } catch (error) {
    console.error('Blur region error:', error)
    next(error)
  }
})