import { describe, it, expect } from 'vitest'
import type {
  ImageProcessingOptions,
  ProcessedImage,
  ApiResponse,
  ApiError,
  UploadResponse
} from '../../../shared/types/index'

describe('Shared Types', () => {
  describe('ImageProcessingOptions', () => {
    it('should accept valid processing options', () => {
      const options: ImageProcessingOptions = {
        quality: 80,
        format: 'jpeg',
        width: 1920,
        height: 1080,
        maintainAspectRatio: true
      }

      expect(options.quality).toBe(80)
      expect(options.format).toBe('jpeg')
      expect(options.width).toBe(1920)
      expect(options.height).toBe(1080)
      expect(options.maintainAspectRatio).toBe(true)
    })

    it('should accept partial options', () => {
      const options1: ImageProcessingOptions = {}
      const options2: ImageProcessingOptions = { quality: 90 }
      const options3: ImageProcessingOptions = { format: 'png', width: 800 }

      expect(options1).toBeDefined()
      expect(options2.quality).toBe(90)
      expect(options3.format).toBe('png')
      expect(options3.width).toBe(800)
    })

    it('should only accept valid formats', () => {
      const validFormats: Array<'jpeg' | 'png' | 'webp'> = ['jpeg', 'png', 'webp']
      
      validFormats.forEach(format => {
        const options: ImageProcessingOptions = { format }
        expect(options.format).toBe(format)
      })
    })
  })

  describe('ProcessedImage', () => {
    it('should require all properties', () => {
      const processedImage: ProcessedImage = {
        id: 'test-123',
        originalName: 'test.jpg',
        originalSize: 1024000,
        processedSize: 512000,
        format: 'jpeg',
        url: 'http://example.com/processed.jpg',
        createdAt: new Date()
      }

      expect(processedImage.id).toBe('test-123')
      expect(processedImage.originalName).toBe('test.jpg')
      expect(processedImage.originalSize).toBe(1024000)
      expect(processedImage.processedSize).toBe(512000)
      expect(processedImage.format).toBe('jpeg')
      expect(processedImage.url).toBe('http://example.com/processed.jpg')
      expect(processedImage.createdAt).toBeInstanceOf(Date)
    })
  })

  describe('ApiResponse', () => {
    it('should work with generic data types', () => {
      const stringResponse: ApiResponse<string> = {
        success: true,
        data: 'test data',
        message: 'Success'
      }

      const numberResponse: ApiResponse<number> = {
        success: true,
        data: 42,
        message: 'Number response'
      }

      const objectResponse: ApiResponse<{ id: string; name: string }> = {
        success: true,
        data: { id: '123', name: 'test' },
        message: 'Object response'
      }

      expect(stringResponse.data).toBe('test data')
      expect(numberResponse.data).toBe(42)
      expect(objectResponse.data?.id).toBe('123')
    })

    it('should work without data property', () => {
      const response: ApiResponse = {
        success: false,
        message: 'Error occurred'
      }

      expect(response.success).toBe(false)
      expect(response.data).toBeUndefined()
      expect(response.message).toBe('Error occurred')
    })

    it('should work with any data type when no generic is specified', () => {
      const response: ApiResponse = {
        success: true,
        data: { anything: 'goes here', numbers: [1, 2, 3] },
        message: 'Any data type'
      }

      expect(response.data).toBeDefined()
      expect(response.data.anything).toBe('goes here')
    })
  })

  describe('ApiError', () => {
    it('should require all error properties', () => {
      const error: ApiError = {
        error: true,
        message: 'Something went wrong',
        code: 'INTERNAL_ERROR',
        statusCode: 500
      }

      expect(error.error).toBe(true)
      expect(error.message).toBe('Something went wrong')
      expect(error.code).toBe('INTERNAL_ERROR')
      expect(error.statusCode).toBe(500)
    })

    it('should work with different error codes and status codes', () => {
      const errors: ApiError[] = [
        {
          error: true,
          message: 'Not found',
          code: 'NOT_FOUND',
          statusCode: 404
        },
        {
          error: true,
          message: 'Bad request',
          code: 'BAD_REQUEST',
          statusCode: 400
        },
        {
          error: true,
          message: 'Unauthorized',
          code: 'UNAUTHORIZED',
          statusCode: 401
        }
      ]

      errors.forEach(err => {
        expect(err.error).toBe(true)
        expect(typeof err.message).toBe('string')
        expect(typeof err.code).toBe('string')
        expect(typeof err.statusCode).toBe('number')
      })
    })
  })

  describe('UploadResponse', () => {
    it('should require all upload properties', () => {
      const uploadResponse: UploadResponse = {
        id: 'upload-123',
        filename: 'processed_image.jpg',
        originalSize: 2048000,
        mimeType: 'image/jpeg'
      }

      expect(uploadResponse.id).toBe('upload-123')
      expect(uploadResponse.filename).toBe('processed_image.jpg')
      expect(uploadResponse.originalSize).toBe(2048000)
      expect(uploadResponse.mimeType).toBe('image/jpeg')
    })

    it('should work with different MIME types', () => {
      const responses: UploadResponse[] = [
        {
          id: '1',
          filename: 'test.jpg',
          originalSize: 1000,
          mimeType: 'image/jpeg'
        },
        {
          id: '2',
          filename: 'test.png',
          originalSize: 2000,
          mimeType: 'image/png'
        },
        {
          id: '3',
          filename: 'test.webp',
          originalSize: 800,
          mimeType: 'image/webp'
        }
      ]

      responses.forEach(response => {
        expect(response.id).toBeDefined()
        expect(response.filename).toBeDefined()
        expect(typeof response.originalSize).toBe('number')
        expect(response.mimeType.startsWith('image/')).toBe(true)
      })
    })
  })

  describe('Type Compatibility', () => {
    it('should allow ProcessedImage to be used as ApiResponse data', () => {
      const processedImage: ProcessedImage = {
        id: 'test-123',
        originalName: 'test.jpg',
        originalSize: 1024000,
        processedSize: 512000,
        format: 'jpeg',
        url: 'http://example.com/processed.jpg',
        createdAt: new Date()
      }

      const response: ApiResponse<ProcessedImage> = {
        success: true,
        data: processedImage,
        message: 'Image processed successfully'
      }

      expect(response.data?.id).toBe(processedImage.id)
      expect(response.data?.originalName).toBe(processedImage.originalName)
    })

    it('should allow UploadResponse to be used as ApiResponse data', () => {
      const uploadData: UploadResponse = {
        id: 'upload-123',
        filename: 'test.jpg',
        originalSize: 1024000,
        mimeType: 'image/jpeg'
      }

      const response: ApiResponse<UploadResponse> = {
        success: true,
        data: uploadData,
        message: 'Upload successful'
      }

      expect(response.data?.id).toBe(uploadData.id)
      expect(response.data?.filename).toBe(uploadData.filename)
    })
  })
})