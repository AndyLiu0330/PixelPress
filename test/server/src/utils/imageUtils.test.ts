import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getImageMetadata,
  validateImageFormat,
  sanitizeFilename,
  ensureDirectoryExists,
  calculateOptimalQuality
} from '../../../../server/src/utils/imageUtils'
import fs from 'fs/promises'

// Mock sharp
const mockSharp = vi.hoisted(() => ({
  default: vi.fn(() => ({
    metadata: vi.fn()
  }))
}))

vi.mock('sharp', () => mockSharp)
vi.mock('fs/promises')

const mockFs = vi.mocked(fs)

describe('imageUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getImageMetadata', () => {
    it('should return image metadata successfully', async () => {
      const mockMetadata = {
        width: 1920,
        height: 1080,
        format: 'jpeg',
        channels: 3,
        density: 72
      }

      const sharpInstance = {
        metadata: vi.fn().mockResolvedValue(mockMetadata)
      }
      mockSharp.default.mockReturnValue(sharpInstance)

      const result = await getImageMetadata('/path/to/image.jpg')

      expect(result).toEqual({
        width: 1920,
        height: 1080,
        format: 'jpeg',
        channels: 3,
        density: 72
      })
    })

    it('should handle missing metadata properties', async () => {
      const sharpInstance = {
        metadata: vi.fn().mockResolvedValue({})
      }
      mockSharp.default.mockReturnValue(sharpInstance)

      const result = await getImageMetadata('/path/to/image.jpg')

      expect(result).toEqual({
        width: 0,
        height: 0,
        format: 'unknown',
        channels: 0,
        density: 0
      })
    })

    it('should throw error when sharp fails', async () => {
      const sharpInstance = {
        metadata: vi.fn().mockRejectedValue(new Error('Sharp error'))
      }
      mockSharp.default.mockReturnValue(sharpInstance)

      await expect(getImageMetadata('/invalid/path.jpg'))
        .rejects.toThrow('Failed to get image metadata: Error: Sharp error')
    })
  })

  describe('validateImageFormat', () => {
    it('should return true for supported formats', () => {
      const supportedFormats = ['jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff']
      
      supportedFormats.forEach(format => {
        expect(validateImageFormat(format)).toBe(true)
        expect(validateImageFormat(format.toUpperCase())).toBe(true)
      })
    })

    it('should return false for unsupported formats', () => {
      const unsupportedFormats = ['pdf', 'txt', 'doc', 'mp4', 'svg', 'ico']
      
      unsupportedFormats.forEach(format => {
        expect(validateImageFormat(format)).toBe(false)
      })
    })

    it('should handle empty string', () => {
      expect(validateImageFormat('')).toBe(false)
    })
  })

  describe('sanitizeFilename', () => {
    it('should remove special characters', () => {
      expect(sanitizeFilename('file@name#.jpg')).toBe('file_name_.jpg')
      expect(sanitizeFilename('test$file%.png')).toBe('test_file_.png')
    })

    it('should replace spaces with underscores', () => {
      expect(sanitizeFilename('my image file.jpg')).toBe('my_image_file.jpg')
      expect(sanitizeFilename('test   file.png')).toBe('test_file.png')
    })

    it('should preserve dots and hyphens', () => {
      expect(sanitizeFilename('test-file.jpg')).toBe('test-file.jpg')
      expect(sanitizeFilename('my.image.file.png')).toBe('my.image.file.png')
    })

    it('should remove leading and trailing underscores', () => {
      expect(sanitizeFilename('_test-file_')).toBe('test-file')
      expect(sanitizeFilename('__file__')).toBe('file')
    })

    it('should collapse multiple underscores', () => {
      expect(sanitizeFilename('test____file.jpg')).toBe('test_file.jpg')
      expect(sanitizeFilename('my___image___file.png')).toBe('my_image_file.png')
    })

    it('should handle empty string', () => {
      expect(sanitizeFilename('')).toBe('')
    })

    it('should handle string with only special characters', () => {
      expect(sanitizeFilename('@#$%')).toBe('')
    })
  })

  describe('ensureDirectoryExists', () => {
    it('should not create directory if it already exists', async () => {
      mockFs.access.mockResolvedValue(undefined)
      
      await ensureDirectoryExists('/existing/path')
      
      expect(mockFs.access).toHaveBeenCalledWith('/existing/path')
      expect(mockFs.mkdir).not.toHaveBeenCalled()
    })

    it('should create directory if it does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('Directory not found'))
      mockFs.mkdir.mockResolvedValue(undefined)
      
      await ensureDirectoryExists('/new/path')
      
      expect(mockFs.access).toHaveBeenCalledWith('/new/path')
      expect(mockFs.mkdir).toHaveBeenCalledWith('/new/path', { recursive: true })
    })

    it('should handle mkdir errors', async () => {
      mockFs.access.mockRejectedValue(new Error('Directory not found'))
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'))
      
      await expect(ensureDirectoryExists('/restricted/path'))
        .rejects.toThrow('Permission denied')
    })
  })

  describe('calculateOptimalQuality', () => {
    it('should return 50 when no target size is provided', () => {
      expect(calculateOptimalQuality(1000)).toBe(50)
    })

    it('should return high quality for small compression ratios', () => {
      expect(calculateOptimalQuality(1000, 900)).toBe(90) // 90% of original
      expect(calculateOptimalQuality(1000, 850)).toBe(90) // 85% of original
    })

    it('should return medium quality for moderate compression', () => {
      expect(calculateOptimalQuality(1000, 700)).toBe(80) // 70% of original (ratio 0.7 > 0.6)
      expect(calculateOptimalQuality(1000, 610)).toBe(80) // 61% of original (ratio 0.61 > 0.6)
    })

    it('should return lower quality for higher compression', () => {
      expect(calculateOptimalQuality(1000, 500)).toBe(70) // 50% of original (ratio 0.5 > 0.4)
      expect(calculateOptimalQuality(1000, 450)).toBe(70) // 45% of original (ratio 0.45 > 0.4)
      expect(calculateOptimalQuality(1000, 400)).toBe(60) // 40% of original (ratio 0.4 == 0.4, not > 0.4)
      expect(calculateOptimalQuality(1000, 300)).toBe(60) // 30% of original (ratio 0.3 >= 0.2)
      expect(calculateOptimalQuality(1000, 200)).toBe(60) // 20% of original (ratio 0.2 >= 0.2)
      expect(calculateOptimalQuality(1000, 100)).toBe(50) // 10% of original (ratio 0.1 < 0.2)
    })

    it('should handle edge cases', () => {
      expect(calculateOptimalQuality(1000, 0)).toBe(50)
      expect(calculateOptimalQuality(0, 100)).toBe(50) // Invalid ratio
      expect(calculateOptimalQuality(1000, 1200)).toBe(90) // Target larger than original
    })
  })
})