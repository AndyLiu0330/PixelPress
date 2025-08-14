import express, { Request, Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'
import { uploadRouter } from './routes/upload.js'
import { compressionRouter } from './routes/compression.js'
import { watermarkRemovalRouter } from './routes/watermarkRemoval.js'
import { errorHandler } from './middleware/errorHandler.js'
import { cleanupService } from './services/cleanupService.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3002

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many requests from this IP, please try again later.'
})

app.use(cors())
app.use(express.json())

// Health check route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'PixelPress API Server',
    status: 'running',
    endpoints: {
      upload: 'POST /api/upload',
      compress: 'POST /api/compress',
      convert: 'POST /api/convert',
      download: 'GET /api/download/:filename',
      watermark: 'POST /api/watermark/remove'
    }
  })
})

app.use('/api', limiter)

app.use('/api', uploadRouter)
app.use('/api', compressionRouter)
app.use('/api', watermarkRemovalRouter)

app.use(errorHandler)

cleanupService.start()

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})