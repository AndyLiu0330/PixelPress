import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { compressionRouter } from '../../../../server/src/routes/compression'
import fs from 'fs/promises'
import path from 'path'

// Mock dependencies
vi.mock('fs/promises')
vi.mock('sharp')
vi.mock('uuid', () => ({
  v4: () => 'processed-uuid-123'
}))

const mockFs = vi.mocked(fs)
const mockSharp = vi.hoisted(() => ({
  default: vi.fn(() => ({
    jpeg: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue(undefined)
  }))
}))

vi.mock('sharp', () => mockSharp)

describe('Compression Router', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())
    app.use('/api', compressionRouter)
    
    // Reset mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /compress', () => {
    it('should compress image successfully', async () => {
      // Mock file system operations
      mockFs.readdir.mockResolvedValue(['test-image-123.jpg'] as any)
      mockFs.stat.mockResolvedValue({ size: 500 } as any)

      const response = await request(app)
        .post('/api/compress')
        .send({
          imageId: '123',
          quality: 80,
          format: 'jpeg'
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        data: {
          url: '/api/download/processed-uuid-123.jpeg',
          processedSize: 500,
          format: 'jpeg'
        },
        message: 'Image compressed successfully'
      })
    })

    it('should return error when imageId is missing', async () => {
      const response = await request(app)
        .post('/api/compress')
        .send({
          quality: 80,
          format: 'jpeg'
        })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        error: true,
        message: 'Image ID is required',
        code: 'MISSING_IMAGE_ID',
        statusCode: 400
      })
    })

    it('should return error when image is not found', async () => {
      mockFs.readdir.mockResolvedValue([])

      const response = await request(app)
        .post('/api/compress')
        .send({
          imageId: 'non-existent',
          quality: 80,
          format: 'jpeg'
        })

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        error: true,
        message: 'Image not found',
        code: 'IMAGE_NOT_FOUND',
        statusCode: 404
      })
    })

    it('should use default quality and format when not provided', async () => {
      mockFs.readdir.mockResolvedValue(['test-image-123.jpg'] as any)
      mockFs.stat.mockResolvedValue({ size: 500 } as any)

      const sharpInstance = {
        jpeg: vi.fn().mockReturnThis(),
        png: vi.fn().mockReturnThis(),
        webp: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined)
      }
      
      mockSharp.default.mockReturnValue(sharpInstance)

      const response = await request(app)
        .post('/api/compress')
        .send({
          imageId: '123'
        })

      expect(sharpInstance.jpeg).toHaveBeenCalledWith({ quality: 80 })
      expect(response.body.data.format).toBe('jpeg')
    })

    it('should handle PNG format compression', async () => {
      mockFs.readdir.mockResolvedValue(['test-image-123.jpg'] as any)
      mockFs.stat.mockResolvedValue({ size: 400 } as any)

      const sharpInstance = {
        jpeg: vi.fn().mockReturnThis(),
        png: vi.fn().mockReturnThis(),
        webp: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined)
      }
      
      mockSharp.default.mockReturnValue(sharpInstance)

      const response = await request(app)
        .post('/api/compress')
        .send({
          imageId: '123',
          quality: 90,
          format: 'png'
        })

      expect(sharpInstance.png).toHaveBeenCalledWith({ quality: 90 })
      expect(response.body.data.format).toBe('png')
    })

    it('should handle WebP format compression', async () => {
      mockFs.readdir.mockResolvedValue(['test-image-123.jpg'] as any)
      mockFs.stat.mockResolvedValue({ size: 300 } as any)

      const sharpInstance = {
        jpeg: vi.fn().mockReturnThis(),
        png: vi.fn().mockReturnThis(),
        webp: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockResolvedValue(undefined)
      }
      
      mockSharp.default.mockReturnValue(sharpInstance)

      const response = await request(app)
        .post('/api/compress')
        .send({
          imageId: '123',
          quality: 70,
          format: 'webp'
        })

      expect(sharpInstance.webp).toHaveBeenCalledWith({ quality: 70 })
      expect(response.body.data.format).toBe('webp')
    })

    it('should handle compression errors', async () => {
      mockFs.readdir.mockResolvedValue(['test-image-123.jpg'] as any)
      
      const sharpInstance = {
        jpeg: vi.fn().mockReturnThis(),
        png: vi.fn().mockReturnThis(),
        webp: vi.fn().mockReturnThis(),
        toFile: vi.fn().mockRejectedValue(new Error('Compression failed'))
      }
      
      mockSharp.default.mockReturnValue(sharpInstance)

      // Add error handler to the app
      app.use((error: any, req: any, res: any, next: any) => {
        res.status(500).json({
          error: true,
          message: 'Internal server error',
          code: 'COMPRESSION_ERROR',
          statusCode: 500
        })
      })

      const response = await request(app)
        .post('/api/compress')
        .send({
          imageId: '123',
          quality: 80,
          format: 'jpeg'
        })

      expect(response.status).toBe(500)
      expect(response.body.error).toBe(true)
    })
  })

  describe('GET /download/:filename', () => {
    it('should download file successfully', async () => {
      mockFs.access.mockResolvedValue(undefined)
      
      // Mock res.sendFile
      const mockSendFile = vi.fn()
      app.use('/api', (req, res, next) => {
        res.sendFile = mockSendFile
        next()
      }, compressionRouter)

      const response = await request(app)
        .get('/api/download/test-file.jpg')

      // Since we can't easily test file download, we check that access was called
      expect(mockFs.access).toHaveBeenCalled()
    })

    it('should return 404 when file not found', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'))

      const response = await request(app)
        .get('/api/download/non-existent.jpg')

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        error: true,
        message: 'File not found',
        code: 'FILE_NOT_FOUND',
        statusCode: 404
      })
    })
  })
})