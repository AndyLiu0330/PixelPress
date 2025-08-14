import { describe, it, expect } from 'vitest'
import {
  formatFileSize,
  isValidImageType,
  calculateCompressionRatio,
  getFileExtension,
  generateThumbnailUrl
} from '../../../../client/src/utils/fileUtils'

describe('fileUtils', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
      expect(formatFileSize(1)).toBe('1 Bytes')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
      expect(formatFileSize(1048576)).toBe('1 MB')
      expect(formatFileSize(1073741824)).toBe('1 GB')
    })

    it('should handle large numbers', () => {
      expect(formatFileSize(2560000)).toBe('2.44 MB')
      expect(formatFileSize(10737418240)).toBe('10 GB')
    })

    it('should round to 2 decimal places', () => {
      expect(formatFileSize(1234567)).toBe('1.18 MB')
      expect(formatFileSize(123456)).toBe('120.56 KB')
    })
  })

  describe('isValidImageType', () => {
    it('should return true for valid image types', () => {
      const validFiles = [
        new File([''], 'test.jpg', { type: 'image/jpeg' }),
        new File([''], 'test.png', { type: 'image/png' }),
        new File([''], 'test.webp', { type: 'image/webp' }),
        new File([''], 'test.gif', { type: 'image/gif' }),
        new File([''], 'test.bmp', { type: 'image/bmp' }),
        new File([''], 'test.tiff', { type: 'image/tiff' })
      ]

      validFiles.forEach(file => {
        expect(isValidImageType(file)).toBe(true)
      })
    })

    it('should return false for invalid image types', () => {
      const invalidFiles = [
        new File([''], 'test.txt', { type: 'text/plain' }),
        new File([''], 'test.pdf', { type: 'application/pdf' }),
        new File([''], 'test.mp4', { type: 'video/mp4' }),
        new File([''], 'test.doc', { type: 'application/msword' })
      ]

      invalidFiles.forEach(file => {
        expect(isValidImageType(file)).toBe(false)
      })
    })

    it('should handle empty or undefined mime types', () => {
      const fileWithEmptyType = new File([''], 'test', { type: '' })
      expect(isValidImageType(fileWithEmptyType)).toBe(false)
    })
  })

  describe('calculateCompressionRatio', () => {
    it('should calculate compression ratio correctly', () => {
      expect(calculateCompressionRatio(1000, 500)).toBe(50)
      expect(calculateCompressionRatio(1000, 750)).toBe(25)
      expect(calculateCompressionRatio(1000, 100)).toBe(90)
      expect(calculateCompressionRatio(1000, 1000)).toBe(0)
    })

    it('should handle zero original size', () => {
      expect(calculateCompressionRatio(0, 100)).toBe(0)
    })

    it('should handle larger compressed size (negative compression)', () => {
      expect(calculateCompressionRatio(100, 200)).toBe(-100)
    })

    it('should round to nearest integer', () => {
      expect(calculateCompressionRatio(1000, 333)).toBe(67) // 66.7 rounded to 67
      expect(calculateCompressionRatio(1000, 666)).toBe(33) // 33.4 rounded to 33
    })
  })

  describe('getFileExtension', () => {
    it('should extract file extension correctly', () => {
      expect(getFileExtension('test.jpg')).toBe('jpg')
      expect(getFileExtension('image.PNG')).toBe('png')
      expect(getFileExtension('file.jpeg')).toBe('jpeg')
      expect(getFileExtension('document.pdf')).toBe('pdf')
    })

    it('should handle files with multiple dots', () => {
      expect(getFileExtension('my.image.file.jpg')).toBe('jpg')
      expect(getFileExtension('test.backup.png')).toBe('png')
    })

    it('should handle files without extension', () => {
      expect(getFileExtension('filename')).toBe('')
      expect(getFileExtension('')).toBe('')
    })

    it('should handle files ending with dot', () => {
      expect(getFileExtension('filename.')).toBe('')
    })

    it('should return lowercase extension', () => {
      expect(getFileExtension('test.JPG')).toBe('jpg')
      expect(getFileExtension('image.WEBP')).toBe('webp')
    })
  })

  describe('generateThumbnailUrl', () => {
    it('should generate thumbnail URL with default size', () => {
      expect(generateThumbnailUrl('http://example.com/image.jpg'))
        .toBe('http://example.com/image.jpg?thumb=200')
    })

    it('should generate thumbnail URL with custom size', () => {
      expect(generateThumbnailUrl('http://example.com/image.jpg', 150))
        .toBe('http://example.com/image.jpg?thumb=150')
    })

    it('should handle URLs with existing query parameters', () => {
      expect(generateThumbnailUrl('http://example.com/image.jpg?id=123', 100))
        .toBe('http://example.com/image.jpg?id=123&thumb=100')
    })

    it('should handle empty URL', () => {
      expect(generateThumbnailUrl('', 100))
        .toBe('?thumb=100')
    })
  })
})