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

interface TestImage {
  name: string
  width: number
  height: number
  format: string
  path: string
}

interface TestResult {
  image: TestImage
  watermarkSize: string
  region: string
  success: boolean
  processingTime: number
  qualityMetrics?: QualityMetrics
  method?: string
  textureComplexity?: number
  edgeStrength?: number
  error?: string
}

test.describe('Comprehensive Enhanced Watermark Removal Tests', () => {
  let apiContext: APIRequestContext
  const testResults: TestResult[] = []
  
  const testImages: TestImage[] = [
    { name: 'small-test-image.png', width: 300, height: 200, format: 'PNG', path: '' },
    { name: 'small-test-image.jpg', width: 300, height: 200, format: 'JPEG', path: '' },
    { name: 'medium-test-image.png', width: 800, height: 600, format: 'PNG', path: '' },
    { name: 'medium-test-image.jpg', width: 800, height: 600, format: 'JPEG', path: '' },
    { name: 'large-test-image.png', width: 1920, height: 1080, format: 'PNG', path: '' },
    { name: 'large-test-image.jpg', width: 1920, height: 1080, format: 'JPEG', path: '' },
    { name: 'test_image_for_api.webp', width: 800, height: 600, format: 'WEBP', path: '' }
  ]

  const watermarkSizes = [
    { name: 'small', width: 10, height: 10 },
    { name: 'medium', width: 50, height: 50 },
    { name: 'large', width: 100, height: 100 }
  ]

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL: 'http://localhost:3002'
    })

    // Set up test image paths
    for (const image of testImages) {
      if (image.name === 'test_image_for_api.webp') {
        image.path = path.join(process.cwd(), image.name)
      } else {
        image.path = path.join(process.cwd(), 'test-images', image.name)
      }
    }
  })

  test.afterAll(async () => {
    await apiContext.dispose()
    
    // Generate comprehensive test report
    console.log('\n' + '='.repeat(80))
    console.log('COMPREHENSIVE ENHANCED WATERMARK REMOVAL TEST REPORT')
    console.log('='.repeat(80))
    
    const successCount = testResults.filter(r => r.success).length
    const failCount = testResults.filter(r => !r.success).length
    
    console.log(`\n📊 SUMMARY:`)
    console.log(`✅ Successful tests: ${successCount}`)
    console.log(`❌ Failed tests: ${failCount}`)
    console.log(`📋 Total tests: ${testResults.length}`)
    console.log(`📈 Success rate: ${((successCount / testResults.length) * 100).toFixed(1)}%`)
    
    // Group results by image format
    const formatResults = new Map<string, TestResult[]>()
    testResults.forEach(result => {
      const format = result.image.format
      if (!formatResults.has(format)) {
        formatResults.set(format, [])
      }
      formatResults.get(format)!.push(result)
    })
    
    console.log(`\n📸 RESULTS BY FORMAT:`)
    formatResults.forEach((results, format) => {
      const success = results.filter(r => r.success).length
      const total = results.length
      const avgTime = results.filter(r => r.success).reduce((sum, r) => sum + r.processingTime, 0) / success || 0
      console.log(`${format}: ${success}/${total} success (${((success/total)*100).toFixed(1)}%) - Avg time: ${avgTime.toFixed(0)}ms`)
    })
    
    // Performance analysis
    console.log(`\n⚡ PERFORMANCE ANALYSIS:`)
    const successfulResults = testResults.filter(r => r.success)
    if (successfulResults.length > 0) {
      const avgProcessingTime = successfulResults.reduce((sum, r) => sum + r.processingTime, 0) / successfulResults.length
      const minTime = Math.min(...successfulResults.map(r => r.processingTime))
      const maxTime = Math.max(...successfulResults.map(r => r.processingTime))
      
      console.log(`Average processing time: ${avgProcessingTime.toFixed(0)}ms`)
      console.log(`Fastest processing: ${minTime}ms`)
      console.log(`Slowest processing: ${maxTime}ms`)
    }
    
    // Quality metrics analysis
    console.log(`\n🎯 QUALITY METRICS:`)
    const withMetrics = successfulResults.filter(r => r.qualityMetrics)
    if (withMetrics.length > 0) {
      const avgPSNR = withMetrics.reduce((sum, r) => sum + r.qualityMetrics!.psnr, 0) / withMetrics.length
      const avgSSIM = withMetrics.reduce((sum, r) => sum + r.qualityMetrics!.ssim, 0) / withMetrics.length
      const avgVisualQuality = withMetrics.reduce((sum, r) => sum + r.qualityMetrics!.visualQuality, 0) / withMetrics.length
      const avgArtifactLevel = withMetrics.reduce((sum, r) => sum + r.qualityMetrics!.artifactLevel, 0) / withMetrics.length
      
      console.log(`Average PSNR: ${avgPSNR.toFixed(2)}`)
      console.log(`Average SSIM: ${avgSSIM.toFixed(3)}`)
      console.log(`Average Visual Quality: ${avgVisualQuality.toFixed(1)}`)
      console.log(`Average Artifact Level: ${avgArtifactLevel.toFixed(1)}`)
    }
    
    // Failed tests details
    const failedTests = testResults.filter(r => !r.success)
    if (failedTests.length > 0) {
      console.log(`\n❌ FAILED TESTS DETAILS:`)
      failedTests.forEach(result => {
        console.log(`- ${result.image.name} (${result.watermarkSize} watermark, ${result.region}): ${result.error}`)
      })
    }
    
    console.log('\n' + '='.repeat(80))
  })

  // Test each image with different watermark sizes and positions
  for (const image of testImages) {
    for (const watermarkSize of watermarkSizes) {
      test(`should process ${image.name} with ${watermarkSize.name} watermark (${watermarkSize.width}x${watermarkSize.height})`, async () => {
        if (!fs.existsSync(image.path)) {
          console.log(`⚠️  Test image not found: ${image.path}`)
          testResults.push({
            image,
            watermarkSize: watermarkSize.name,
            region: 'center',
            success: false,
            processingTime: 0,
            error: 'Test image not found'
          })
          return
        }

        try {
          // Upload the test image
          const uploadResponse = await apiContext.post('/api/upload', {
            multipart: {
              'image': fs.createReadStream(image.path)
            }
          })

          expect(uploadResponse.ok()).toBeTruthy()
          const uploadData: UploadResponse = await uploadResponse.json()
          const imageId = uploadData.data.id

          // Test center region
          const centerWatermarkArea: WatermarkArea = {
            x: Math.max(0, Math.floor(image.width / 2 - watermarkSize.width / 2)),
            y: Math.max(0, Math.floor(image.height / 2 - watermarkSize.height / 2)),
            width: watermarkSize.width,
            height: watermarkSize.height
          }

          const startTime = Date.now()
          const response = await apiContext.post('/api/remove-watermark-advanced', {
            data: {
              imageId,
              watermarkArea: centerWatermarkArea
            }
          })
          const endTime = Date.now()
          const processingTime = endTime - startTime

          expect(response.ok()).toBeTruthy()
          const data: EnhancedWatermarkResponse = await response.json()

          // Verify response structure
          expect(data.success).toBe(true)
          expect(data.data).toBeDefined()
          expect(data.data.url).toMatch(/^\/api\/download\/enhanced_.+\.(webp|png|jpg|jpeg)$/)
          expect(data.data.processedSize).toBeGreaterThan(0)
          expect(data.data.format).toBeTruthy()

          // Verify quality metrics
          expect(data.data.qualityMetrics).toBeDefined()
          expect(data.data.qualityMetrics.psnr).toBeGreaterThan(0)
          expect(data.data.qualityMetrics.ssim).toBeGreaterThan(0)
          expect(data.data.qualityMetrics.ssim).toBeLessThanOrEqual(1)
          expect(data.data.qualityMetrics.visualQuality).toBeGreaterThan(0)
          expect(data.data.qualityMetrics.visualQuality).toBeLessThanOrEqual(100)

          // Verify processing time and analysis
          expect(data.data.processingTime).toBeGreaterThan(0)
          expect(data.data.method).toBeTruthy()
          expect(typeof data.data.textureComplexity).toBe('number')
          expect(typeof data.data.edgeStrength).toBe('number')

          // Verify processed image is accessible
          const downloadResponse = await apiContext.get(data.data.url)
          expect(downloadResponse.ok()).toBeTruthy()
          expect(downloadResponse.headers()['content-type']).toMatch(/^image\//)

          testResults.push({
            image,
            watermarkSize: watermarkSize.name,
            region: 'center',
            success: true,
            processingTime: data.data.processingTime,
            qualityMetrics: data.data.qualityMetrics,
            method: data.data.method,
            textureComplexity: data.data.textureComplexity,
            edgeStrength: data.data.edgeStrength
          })

          console.log(`✅ ${image.name} (${watermarkSize.name} watermark): ${data.data.processingTime}ms, Quality: ${data.data.qualityMetrics.visualQuality.toFixed(1)}`)

        } catch (error) {
          testResults.push({
            image,
            watermarkSize: watermarkSize.name,
            region: 'center',
            success: false,
            processingTime: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          throw error
        }
      })
    }
  }

  test('should test different regions for medium image', async () => {
    const image = testImages.find(img => img.name === 'medium-test-image.png')
    if (!image || !fs.existsSync(image.path)) {
      console.log('⚠️  Medium test image not found, skipping region tests')
      return
    }

    // Upload the test image
    const uploadResponse = await apiContext.post('/api/upload', {
      multipart: {
        'image': fs.createReadStream(image.path)
      }
    })

    expect(uploadResponse.ok()).toBeTruthy()
    const uploadData: UploadResponse = await uploadResponse.json()
    const imageId = uploadData.data.id

    const regions = [
      { name: 'top-left', x: 10, y: 10 },
      { name: 'top-right', x: image.width - 60, y: 10 },
      { name: 'bottom-left', x: 10, y: image.height - 60 },
      { name: 'bottom-right', x: image.width - 60, y: image.height - 60 },
      { name: 'center', x: image.width / 2 - 25, y: image.height / 2 - 25 }
    ]

    for (const region of regions) {
      const watermarkArea: WatermarkArea = {
        x: Math.max(0, Math.floor(region.x)),
        y: Math.max(0, Math.floor(region.y)),
        width: 50,
        height: 50
      }

      try {
        const response = await apiContext.post('/api/remove-watermark-advanced', {
          data: {
            imageId,
            watermarkArea
          }
        })

        expect(response.ok()).toBeTruthy()
        const data: EnhancedWatermarkResponse = await response.json()
        expect(data.success).toBe(true)

        testResults.push({
          image,
          watermarkSize: 'medium',
          region: region.name,
          success: true,
          processingTime: data.data.processingTime,
          qualityMetrics: data.data.qualityMetrics,
          method: data.data.method,
          textureComplexity: data.data.textureComplexity,
          edgeStrength: data.data.edgeStrength
        })

        console.log(`✅ Region ${region.name}: ${data.data.processingTime}ms`)

      } catch (error) {
        testResults.push({
          image,
          watermarkSize: 'medium',
          region: region.name,
          success: false,
          processingTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        console.log(`❌ Region ${region.name} failed: ${error}`)
      }
    }
  })

  test('should compare basic vs enhanced methods', async () => {
    const image = testImages.find(img => img.name === 'medium-test-image.png')
    if (!image || !fs.existsSync(image.path)) {
      console.log('⚠️  Medium test image not found, skipping comparison')
      return
    }

    // Upload the test image
    const uploadResponse = await apiContext.post('/api/upload', {
      multipart: {
        'image': fs.createReadStream(image.path)
      }
    })

    expect(uploadResponse.ok()).toBeTruthy()
    const uploadData: UploadResponse = await uploadResponse.json()
    const imageId = uploadData.data.id

    const watermarkArea: WatermarkArea = {
      x: 200,
      y: 200,
      width: 80,
      height: 80
    }

    // Test basic method
    const basicStartTime = Date.now()
    const basicResponse = await apiContext.post('/api/remove-watermark', {
      data: {
        imageId,
        watermarkArea
      }
    })
    const basicEndTime = Date.now()
    const basicTime = basicEndTime - basicStartTime

    expect(basicResponse.ok()).toBeTruthy()
    const basicData = await basicResponse.json()

    // Test enhanced method  
    const enhancedStartTime = Date.now()
    const enhancedResponse = await apiContext.post('/api/remove-watermark-advanced', {
      data: {
        imageId,
        watermarkArea
      }
    })
    const enhancedEndTime = Date.now()
    const enhancedTime = enhancedEndTime - enhancedStartTime

    expect(enhancedResponse.ok()).toBeTruthy()
    const enhancedData: EnhancedWatermarkResponse = await enhancedResponse.json()

    console.log('\n🔄 BASIC vs ENHANCED COMPARISON:')
    console.log(`Basic method total time: ${basicTime}ms`)
    console.log(`Enhanced method total time: ${enhancedTime}ms`)
    console.log(`Enhanced processing time: ${enhancedData.data.processingTime}ms`)
    console.log(`Enhanced quality metrics:`)
    console.log(`  - PSNR: ${enhancedData.data.qualityMetrics.psnr}`)
    console.log(`  - SSIM: ${enhancedData.data.qualityMetrics.ssim}`)
    console.log(`  - Visual Quality: ${enhancedData.data.qualityMetrics.visualQuality}`)
    console.log(`  - Artifact Level: ${enhancedData.data.qualityMetrics.artifactLevel}`)
    console.log(`  - Method: ${enhancedData.data.method}`)
    console.log(`  - Texture Complexity: ${enhancedData.data.textureComplexity}`)
    console.log(`  - Edge Strength: ${enhancedData.data.edgeStrength}`)

    // Enhanced method should provide quality metrics
    expect(enhancedData.data.qualityMetrics).toBeDefined()
    expect(enhancedData.data.qualityMetrics.psnr).toBeGreaterThan(0)
    expect(enhancedData.data.qualityMetrics.ssim).toBeGreaterThan(0)
  })

  test('should handle error cases properly', async () => {
    // Test with non-existent image ID
    const invalidResponse = await apiContext.post('/api/remove-watermark-advanced', {
      data: {
        imageId: 'non-existent-id',
        watermarkArea: { x: 10, y: 10, width: 50, height: 50 }
      }
    })

    expect(invalidResponse.status()).toBe(404)
    const invalidData = await invalidResponse.json()
    expect(invalidData.error).toBe(true)
    expect(invalidData.code).toBe('IMAGE_NOT_FOUND')

    // Test with missing watermark area
    const missingAreaResponse = await apiContext.post('/api/remove-watermark-advanced', {
      data: {
        imageId: 'some-id'
      }
    })

    expect(missingAreaResponse.status()).toBe(400)
    const missingAreaData = await missingAreaResponse.json()
    expect(missingAreaData.error).toBe(true)
    expect(missingAreaData.code).toBe('MISSING_WATERMARK_AREA')

    console.log('✅ Error handling tests passed')
  })
})