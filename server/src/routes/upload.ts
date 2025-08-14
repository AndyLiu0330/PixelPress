import { Router } from 'express'
import { upload } from '../middleware/upload.js'
import { v4 as uuidv4 } from 'uuid'

export const uploadRouter = Router()

uploadRouter.post('/upload', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: true,
        message: 'No image file provided',
        code: 'NO_FILE',
        statusCode: 400
      })
    }

    const response = {
      success: true,
      data: {
        id: uuidv4(),
        filename: req.file.filename,
        originalName: req.file.originalname,
        originalSize: req.file.size,
        mimeType: req.file.mimetype,
        path: req.file.path
      },
      message: 'Image uploaded successfully'
    }

    res.json(response)
  } catch (error) {
    next(error)
  }
})