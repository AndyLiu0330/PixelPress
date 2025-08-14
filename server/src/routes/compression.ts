import { Router } from 'express'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'

export const compressionRouter = Router()

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

compressionRouter.post('/compress', async (req, res, next) => {
  try {
    const { imageId, quality = 80, format = 'jpeg' } = req.body

    if (!imageId) {
      return res.status(400).json({
        error: true,
        message: 'Image ID is required',
        code: 'MISSING_IMAGE_ID',
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
    const outputFileName = `${uuidv4()}.${format}`
    const outputPath = path.join(processedDir, outputFileName)

    let sharpInstance = sharp(inputPath)

    switch (format) {
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ quality })
        break
      case 'png':
        sharpInstance = sharpInstance.png({ quality })
        break
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality })
        break
      default:
        throw new Error('Unsupported format')
    }

    await sharpInstance.toFile(outputPath)

    const stats = await fs.stat(outputPath)

    res.json({
      success: true,
      data: {
        url: `/api/download/${outputFileName}`,
        processedSize: stats.size,
        format
      },
      message: 'Image compressed successfully'
    })
  } catch (error) {
    next(error)
  }
})

compressionRouter.get('/download/:filename', async (req, res, next) => {
  try {
    const { filename } = req.params
    const filePath = path.join(processedDir, filename)

    await fs.access(filePath)
    res.sendFile(path.resolve(filePath))
  } catch (error) {
    res.status(404).json({
      error: true,
      message: 'File not found',
      code: 'FILE_NOT_FOUND',
      statusCode: 404
    })
  }
})