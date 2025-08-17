import { test, expect } from '@playwright/test'
import { request, APIRequestContext } from '@playwright/test'
import fs from 'fs'
import path from 'path'

interface WatermarkArea {
  x: number
  y: number
  width: number
  height: number
}

interface QualityMetrics {
  psnr: number
  ssim: number
  visualQuality: number
  artifactLevel: number
}

interface EnhancedWatermarkResponse {
  success: boolean
  data: {
    url: string
    processedSize: number
    format: string
    qualityMetrics: QualityMetrics
    processingTime: number
    method: string
    textureComplexity: number
    edgeStrength: number
  }
  message: string
}

interface UploadResponse {
  success: boolean
  data: {
    id: string
    filename: string
    originalName: string
    originalSize: number
    mimeType: string
    path: string
  }
}

test.describe('Enhanced Watermark Removal API', () => {
  let apiContext: APIRequestContext
  let uploadedImageId: string
  let imageDimensions: { width: number; height: number }

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL: 'http://localhost:3002'
    })
  })

  test.afterAll(async () => {
    await apiContext.dispose()
  })

  test.beforeEach(async () => {
    // Upload a test image before each test
    const testImagePath = path.join(process.cwd(), 'test_image_for_api.webp')
    
    if (!fs.existsSync(testImagePath)) {
      throw new Error(`Test image not found at ${testImagePath}`)
    }

    const uploadResponse = await apiContext.post('/api/upload', {
      multipart: {
        'image': fs.createReadStream(testImagePath)
      }
    })

    expect(uploadResponse.ok()).toBeTruthy()
    const uploadData: UploadResponse = await uploadResponse.json()
    
    uploadedImageId = uploadData.data.id
    // Set default dimensions since upload doesn't return them
    imageDimensions = { width: 800, height: 600 }
    
    console.log(`Uploaded image: ${uploadedImageId}, dimensions: ${imageDimensions.width}x${imageDimensions.height}`)
  })

  test('should successfully process enhanced watermark removal with small region (10x10)', async () => {
    const watermarkArea: WatermarkArea = {
      x: 50,
      y: 50,
      width: 10,
      height: 10
    }

    const startTime = Date.now()
    const response = await apiContext.post('/api/remove-watermark-advanced', {
      data: {
        imageId: uploadedImageId,
        watermarkArea
      }
    })

    const endTime = Date.now()
    const requestTime = endTime - startTime

    expect(response.ok()).toBeTruthy()
    const data: EnhancedWatermarkResponse = await response.json()

    // Verify response structure
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
    expect(data.data.url).toMatch(/^\/api\/download\/enhanced_.+\.(webp|png|jpg|jpeg)$/)
    expect(data.data.processedSize).toBeGreaterThan(0)
    expect(data.data.format).toBeTruthy()

    // Verify quality metrics are present and valid
    expect(data.data.qualityMetrics).toBeDefined()
    expect(data.data.qualityMetrics.psnr).toBeGreaterThan(0)
    expect(data.data.qualityMetrics.ssim).toBeGreaterThan(0)
    expect(data.data.qualityMetrics.ssim).toBeLessThanOrEqual(1)
    expect(data.data.qualityMetrics.visualQuality).toBeGreaterThan(0)
    expect(data.data.qualityMetrics.visualQuality).toBeLessThanOrEqual(100)
    expect(data.data.qualityMetrics.artifactLevel).toBeGreaterThanOrEqual(0)
    expect(data.data.qualityMetrics.artifactLevel).toBeLessThanOrEqual(100)

    // Verify processing time is reasonable
    expect(data.data.processingTime).toBeGreaterThan(0)
    expect(data.data.processingTime).toBeLessThan(30000) // Should complete within 30 seconds

    // Verify analysis metrics
    expect(data.data.method).toBeTruthy()
    expect(typeof data.data.textureComplexity).toBe('number')
    expect(typeof data.data.edgeStrength).toBe('number')
    expect(data.data.textureComplexity).toBeGreaterThanOrEqual(0)
    expect(data.data.edgeStrength).toBeGreaterThanOrEqual(0)

    console.log(`Small region test completed in ${requestTime}ms`)
    console.log(`Processing time: ${data.data.processingTime}ms`)
    console.log(`Quality metrics:`, data.data.qualityMetrics)
    console.log(`Method: ${data.data.method}`)
    console.log(`Texture complexity: ${data.data.textureComplexity}`)
    console.log(`Edge strength: ${data.data.edgeStrength}`)

    // Verify the processed image is accessible
    const downloadResponse = await apiContext.get(data.data.url)
    expect(downloadResponse.ok()).toBeTruthy()
    expect(downloadResponse.headers()['content-type']).toMatch(/^image\//)
  })

  test('should successfully process enhanced watermark removal with medium region (50x50)', async () => {
    const watermarkArea: WatermarkArea = {
      x: Math.max(0, Math.floor(imageDimensions.width * 0.3)),
      y: Math.max(0, Math.floor(imageDimensions.height * 0.3)),
      width: 50,
      height: 50
    }

    const startTime = Date.now()
    const response = await apiContext.post('/api/remove-watermark-advanced', {
      data: {
        imageId: uploadedImageId,
        watermarkArea
      }
    })
    const endTime = Date.now()
    const requestTime = endTime - startTime

    expect(response.ok()).toBeTruthy()
    const data: EnhancedWatermarkResponse = await response.json()

    expect(data.success).toBe(true)
    expect(data.data.qualityMetrics).toBeDefined()
    expect(data.data.processingTime).toBeGreaterThan(0)
    expect(data.data.method).toBeTruthy()

    console.log(`Medium region test completed in ${requestTime}ms`)
    console.log(`Processing time: ${data.data.processingTime}ms`)
    console.log(`Quality metrics:`, data.data.qualityMetrics)

    // Verify the processed image is accessible
    const downloadResponse = await apiContext.get(data.data.url)
    expect(downloadResponse.ok()).toBeTruthy()
  })

  test('should successfully process enhanced watermark removal with large region (100x100)', async () => {
    const watermarkArea: WatermarkArea = {
      x: Math.max(0, Math.floor(imageDimensions.width * 0.2)),
      y: Math.max(0, Math.floor(imageDimensions.height * 0.2)),
      width: Math.min(100, imageDimensions.width - Math.floor(imageDimensions.width * 0.2)),
      height: Math.min(100, imageDimensions.height - Math.floor(imageDimensions.height * 0.2))
    }

    const startTime = Date.now()
    const response = await apiContext.post('/api/remove-watermark-advanced', {
      data: {
        imageId: uploadedImageId,
        watermarkArea
      }
    })
    const endTime = Date.now()
    const requestTime = endTime - startTime

    expect(response.ok()).toBeTruthy()
    const data: EnhancedWatermarkResponse = await response.json()

    expect(data.success).toBe(true)
    expect(data.data.qualityMetrics).toBeDefined()
    expect(data.data.processingTime).toBeGreaterThan(0)
    expect(data.data.method).toBeTruthy()

    console.log(`Large region test completed in ${requestTime}ms`)
    console.log(`Processing time: ${data.data.processingTime}ms`)
    console.log(`Quality metrics:`, data.data.qualityMetrics)

    // Verify the processed image is accessible
    const downloadResponse = await apiContext.get(data.data.url)
    expect(downloadResponse.ok()).toBeTruthy()
  })

  test('should handle edge case: region near top-left boundary', async () => {
    const watermarkArea: WatermarkArea = {
      x: 5,
      y: 5,
      width: 30,
      height: 30
    }

    const response = await apiContext.post('/api/remove-watermark-advanced', {
      data: {
        imageId: uploadedImageId,
        watermarkArea
      }
    })

    expect(response.ok()).toBeTruthy()
    const data: EnhancedWatermarkResponse = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.qualityMetrics).toBeDefined()

    console.log('Top-left boundary test passed')
    console.log(`Quality metrics:`, data.data.qualityMetrics)
  })

  test('should handle edge case: region near bottom-right boundary', async () => {
    const watermarkArea: WatermarkArea = {
      x: Math.max(0, imageDimensions.width - 35),
      y: Math.max(0, imageDimensions.height - 35),
      width: 30,
      height: 30
    }

    const response = await apiContext.post('/api/remove-watermark-advanced', {
      data: {
        imageId: uploadedImageId,
        watermarkArea
      }
    })

    expect(response.ok()).toBeTruthy()
    const data: EnhancedWatermarkResponse = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.qualityMetrics).toBeDefined()

    console.log('Bottom-right boundary test passed')
    console.log(`Quality metrics:`, data.data.qualityMetrics)
  })

  test('should handle region that extends beyond image boundaries', async () => {
    const watermarkArea: WatermarkArea = {
      x: imageDimensions.width - 20,
      y: imageDimensions.height - 20,
      width: 50, // Extends beyond image
      height: 50  // Extends beyond image
    }

    const response = await apiContext.post('/api/remove-watermark-advanced', {
      data: {
        imageId: uploadedImageId,
        watermarkArea
      }
    })

    expect(response.ok()).toBeTruthy()
    const data: EnhancedWatermarkResponse = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.qualityMetrics).toBeDefined()

    console.log('Boundary overflow test passed')
    console.log(`Quality metrics:`, data.data.qualityMetrics)
  })

  test('should compare processing times between basic and advanced methods', async () => {
    const watermarkArea: WatermarkArea = {
      x: 100,
      y: 100,
      width: 50,
      height: 50
    }

    // Test basic method
    const basicStartTime = Date.now()
    const basicResponse = await apiContext.post('/api/remove-watermark', {
      data: {
        imageId: uploadedImageId,
        watermarkArea
      }
    })
    const basicEndTime = Date.now()
    const basicRequestTime = basicEndTime - basicStartTime

    expect(basicResponse.ok()).toBeTruthy()
    const basicData = await basicResponse.json()

    // Test advanced method
    const advancedStartTime = Date.now()
    const advancedResponse = await apiContext.post('/api/remove-watermark-advanced', {
      data: {
        imageId: uploadedImageId,
        watermarkArea
      }
    })
    const advancedEndTime = Date.now()
    const advancedRequestTime = advancedEndTime - advancedStartTime

    expect(advancedResponse.ok()).toBeTruthy()
    const advancedData: EnhancedWatermarkResponse = await advancedResponse.json()

    console.log(`\n=== Performance Comparison ===`)
    console.log(`Basic method total time: ${basicRequestTime}ms`)
    console.log(`Advanced method total time: ${advancedRequestTime}ms`)
    console.log(`Advanced method processing time: ${advancedData.data.processingTime}ms`)
    console.log(`Quality improvement with advanced:`)
    console.log(`- PSNR: ${advancedData.data.qualityMetrics.psnr}`)
    console.log(`- SSIM: ${advancedData.data.qualityMetrics.ssim}`)
    console.log(`- Visual Quality: ${advancedData.data.qualityMetrics.visualQuality}`)
    console.log(`- Artifact Level: ${advancedData.data.qualityMetrics.artifactLevel}`)
    console.log(`- Method Used: ${advancedData.data.method}`)
    console.log(`- Texture Complexity: ${advancedData.data.textureComplexity}`)
    console.log(`- Edge Strength: ${advancedData.data.edgeStrength}`)

    // Advanced method should provide quality metrics
    expect(advancedData.data.qualityMetrics).toBeDefined()
    expect(advancedData.data.qualityMetrics.psnr).toBeGreaterThan(0)
    expect(advancedData.data.qualityMetrics.ssim).toBeGreaterThan(0)
  })

  test('should accept and apply custom inpainting options', async () => {
    const watermarkArea: WatermarkArea = {
      x: 150,
      y: 150,
      width: 40,
      height: 40
    }

    const customOptions = {
      method: 'PATCH_MATCH',
      iterations: 3,
      patchSize: 7,
      searchRadius: 50
    }

    const response = await apiContext.post('/api/remove-watermark-advanced', {
      data: {
        imageId: uploadedImageId,
        watermarkArea,
        options: customOptions
      }
    })

    expect(response.ok()).toBeTruthy()
    const data: EnhancedWatermarkResponse = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.qualityMetrics).toBeDefined()

    console.log('Custom options test passed')
    console.log(`Applied method: ${data.data.method}`)
    console.log(`Quality with custom options:`, data.data.qualityMetrics)
  })

  test('should return error for missing imageId', async () => {
    const response = await apiContext.post('/api/remove-watermark-advanced', {
      data: {
        watermarkArea: { x: 10, y: 10, width: 50, height: 50 }
      }
    })

    expect(response.status()).toBe(400)
    const data = await response.json()
    expect(data.error).toBe(true)
    expect(data.code).toBe('MISSING_IMAGE_ID')
  })

  test('should return error for missing watermark area', async () => {
    const response = await apiContext.post('/api/remove-watermark-advanced', {
      data: {
        imageId: uploadedImageId
      }
    })

    expect(response.status()).toBe(400)
    const data = await response.json()
    expect(data.error).toBe(true)
    expect(data.code).toBe('MISSING_WATERMARK_AREA')
  })

  test('should return error for invalid watermark area coordinates', async () => {
    const response = await apiContext.post('/api/remove-watermark-advanced', {
      data: {
        imageId: uploadedImageId,
        watermarkArea: { x: 'invalid', y: 10, width: 50, height: 50 }
      }
    })

    expect(response.status()).toBe(400)
    const data = await response.json()
    expect(data.error).toBe(true)
    expect(data.code).toBe('MISSING_WATERMARK_AREA')
  })

  test('should return error for non-existent image', async () => {
    const response = await apiContext.post('/api/remove-watermark-advanced', {
      data: {
        imageId: 'non-existent-id',
        watermarkArea: { x: 10, y: 10, width: 50, height: 50 }
      }
    })

    expect(response.status()).toBe(404)
    const data = await response.json()
    expect(data.error).toBe(true)
    expect(data.code).toBe('IMAGE_NOT_FOUND')
  })
})