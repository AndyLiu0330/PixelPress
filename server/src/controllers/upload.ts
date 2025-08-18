import { Router, Request, Response, NextFunction } from 'express'
import { upload } from '../middleware/upload.js'

export const uploadRouter = Router()

uploadRouter.post('/upload', upload.single('image'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        error: true,
        message: 'No image file provided',
        code: 'NO_FILE',
        statusCode: 400
      })
      return
    }

    // Use the filename (without extension) as the ID
    const fileId = req.file.filename.split('.')[0]
    
    const response = {
      success: true,
      data: {
        id: fileId,
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