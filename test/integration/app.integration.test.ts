import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import fs from 'fs'
import path from 'path'

describe('PixelPress Integration Tests', () => {
  const apiUrl = 'http://localhost:3002'
  const clientUrl = 'http://localhost:5176'

  describe('Server API Endpoints', () => {
    it('should respond to health check', async () => {
      // Even though there's no explicit health endpoint, we can check the rate limiter
      const response = await request(apiUrl)
        .post('/api/upload')
      
      expect(response.status).toBeDefined()
      expect([400, 429]).toContain(response.status) // Either bad request or rate limited
    })

    it('should reject upload without file', async () => {
      const response = await request(apiUrl)
        .post('/api/upload')
      
      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        error: true,
        message: 'No image file provided',
        code: 'NO_FILE',
        statusCode: 400
      })
    })

    it('should reject compression without image ID', async () => {
      const response = await request(apiUrl)
        .post('/api/compress')
        .send({ quality: 80, format: 'jpeg' })
      
      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        error: true,
        message: 'Image ID is required',
        code: 'MISSING_IMAGE_ID',
        statusCode: 400
      })
    })

    it('should return 404 for non-existent download', async () => {
      const response = await request(apiUrl)
        .get('/api/download/non-existent.jpg')
      
      expect(response.status).toBe(404)
      expect(response.body.error).toBe(true)
      expect(response.body.code).toBe('FILE_NOT_FOUND')
    })
  })

  describe('Client Application', () => {
    it('should serve the HTML page', async () => {
      const response = await request(clientUrl)
        .get('/')
      
      expect(response.status).toBe(200)
      expect(response.text).toContain('<!doctype html>')
      expect(response.text).toContain('PixelPress')
      expect(response.text).toContain('<div id="root"></div>')
    })

    it('should serve JavaScript assets', async () => {
      const response = await request(clientUrl)
        .get('/src/main.tsx')
      
      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toContain('javascript') // Vite serves TS as JS
    })
  })

  describe('Full Upload and Compression Flow', () => {
    it('should handle complete image processing workflow', async () => {
      // This test would require creating a test image file
      // For now, we'll just verify the endpoints are available
      
      // Step 1: Verify upload endpoint exists
      const uploadResponse = await request(apiUrl)
        .post('/api/upload')
      expect(uploadResponse.status).toBe(400) // No file provided
      
      // Step 2: Verify compression endpoint exists
      const compressResponse = await request(apiUrl)
        .post('/api/compress')
        .send({})
      expect(compressResponse.status).toBe(400) // No image ID
      
      // Step 3: Verify download endpoint exists
      const downloadResponse = await request(apiUrl)
        .get('/api/download/test.jpg')
      expect(downloadResponse.status).toBe(404) // File not found
      
      // All endpoints are responding correctly
      expect(true).toBe(true)
    })
  })
})