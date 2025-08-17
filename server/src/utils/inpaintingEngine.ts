import sharp from 'sharp'
import { 
  InpaintingOptions, 
  WatermarkArea, 
  ProcessingResult, 
  ContextAnalysis, 
  QualityMetrics,
  BALANCED_OPTIONS,
  HIGH_PERFORMANCE_OPTIONS,
  HIGH_QUALITY_OPTIONS
} from '../types/inpainting.js'
import { TextureAnalyzer } from './textureAnalyzer.js'
import { EdgeFeatherer } from './edgeFeatherer.js'
import { MultiDirectionalSampler } from './multiDirectionalSampler.js'
import { NoiseMatchingEngine } from './noiseMatchingEngine.js'
import { AdvancedInterpolator } from './advancedInterpolator.js'

export class InpaintingEngine {
  private textureAnalyzer: TextureAnalyzer
  private edgeFeatherer: EdgeFeatherer
  private samplingEngine: MultiDirectionalSampler
  private noiseMatching: NoiseMatchingEngine
  private interpolator: AdvancedInterpolator

  constructor() {
    this.textureAnalyzer = new TextureAnalyzer()
    this.edgeFeatherer = new EdgeFeatherer()
    this.samplingEngine = new MultiDirectionalSampler()
    this.noiseMatching = new NoiseMatchingEngine()
    this.interpolator = new AdvancedInterpolator()
  }

  async processWatermarkRemoval(
    imageBuffer: Buffer,
    watermarkArea: WatermarkArea,
    options: InpaintingOptions = BALANCED_OPTIONS
  ): Promise<ProcessingResult> {
    const startTime = Date.now()

    try {
      const image = sharp(imageBuffer)
      const metadata = await image.metadata()
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Unable to get image dimensions')
      }

      // Ensure region is within image bounds and has valid dimensions
      const x = Math.max(0, Math.floor(watermarkArea.x))
      const y = Math.max(0, Math.floor(watermarkArea.y))
      const maxWidth = metadata.width - x
      const maxHeight = metadata.height - y
      const width = Math.max(1, Math.min(maxWidth, Math.floor(watermarkArea.width)))
      const height = Math.max(1, Math.min(maxHeight, Math.floor(watermarkArea.height)))

      if (width <= 0 || height <= 0 || x >= metadata.width || y >= metadata.height) {
        throw new Error(`Invalid region bounds: x=${x}, y=${y}, width=${width}, height=${height}, imageSize=${metadata.width}x${metadata.height}`)
      }

      const region = { x, y, width, height }

      const context = await this.analyzeContext(image, region)
      const adaptedOptions = this.adaptOptionsToContext(options, context)

      let processedImage: sharp.Sharp

      switch (context.recommendedMethod) {
        case 'texture-synthesis':
          processedImage = await this.textureBasedInpainting(image, region, adaptedOptions)
          break
        case 'patch-based':
          processedImage = await this.patchBasedInpainting(image, region, adaptedOptions)
          break
        case 'hybrid':
          processedImage = await this.hybridInpainting(image, region, adaptedOptions)
          break
        default:
          processedImage = await this.basicInpainting(image, region, adaptedOptions)
      }

      const resultBuffer = await processedImage.toBuffer()
      const stats = { size: resultBuffer.length }

      const qualityMetrics = await this.evaluateQuality(
        imageBuffer, resultBuffer, region, metadata.width, metadata.height
      )

      const duration = Date.now() - startTime

      return {
        buffer: resultBuffer,
        size: stats.size,
        qualityMetrics,
        duration
      }

    } catch (error) {
      console.error('Inpainting engine error:', error)
      throw new Error(`Inpainting failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async analyzeContext(image: sharp.Sharp, region: WatermarkArea): Promise<ContextAnalysis> {
    const expandedRegion = {
      x: Math.max(0, region.x - 30),
      y: Math.max(0, region.y - 30),
      width: region.width + 60,
      height: region.height + 60
    }

    const contextBuffer = await image
      .extract({ left: expandedRegion.x, top: expandedRegion.y, width: expandedRegion.width, height: expandedRegion.height })
      .raw()
      .toBuffer({ resolveWithObject: true })

    const { data: pixels, info } = contextBuffer
    const { width, height, channels } = info

    const textureComplexity = this.analyzeTextureComplexity(pixels, width, height, channels)
    const edgeStrength = this.analyzeEdgeStrength(pixels, width, height, channels)
    const colorVariation = this.analyzeColorVariation(pixels, width, height, channels)
    const patternRepetition = this.analyzePatternRepetition(pixels, width, height, channels)

    const recommendedMethod = this.determineInpaintingMethod(
      textureComplexity, edgeStrength, colorVariation, patternRepetition
    )

    return {
      textureComplexity,
      edgeStrength,
      colorVariation,
      patternRepetition,
      recommendedMethod
    }
  }

  private async textureBasedInpainting(
    image: sharp.Sharp,
    region: WatermarkArea,
    options: InpaintingOptions
  ): Promise<sharp.Sharp> {
    const regionForAnalysis = { x: region.x, y: region.y, width: region.width, height: region.height }
    const textureDescriptor = await this.textureAnalyzer.analyzeRegion(image, regionForAnalysis)
    const synthesizedTexture = await this.textureAnalyzer.generateTextureSynthesis(textureDescriptor)

    const regionForFeathering = { x: region.x, y: region.y, width: region.width, height: region.height }
    const featherMask = await this.edgeFeatherer.createAdaptiveFeathering(image, regionForFeathering)

    const textureImage = sharp(synthesizedTexture, {
      raw: { width: 64, height: 64, channels: 3 }
    }).resize(region.width, region.height)

    const textureBuffer = await textureImage.raw().toBuffer()

    if (options.noiseMatching) {
      const regionForNoise = { x: region.x, y: region.y, width: region.width, height: region.height }
      const noiseProfile = await this.noiseMatching.analyzeLocalNoise(image, regionForNoise)
      const matchingNoise = await this.noiseMatching.synthesizeMatchingNoise(
        noiseProfile, { width: region.width, height: region.height }
      )
      const blendedTexture = await this.noiseMatching.blendNoiseWithContent(
        textureBuffer, matchingNoise, 0.3
      )
      return await this.blendWithOriginal(image, blendedTexture, region, featherMask)
    }

    return await this.blendWithOriginal(image, textureBuffer, region, featherMask)
  }

  private async patchBasedInpainting(
    image: sharp.Sharp,
    region: WatermarkArea,
    options: InpaintingOptions
  ): Promise<sharp.Sharp> {
    const regionForSampling = { x: region.x, y: region.y, width: region.width, height: region.height }
    const samples = await this.samplingEngine.sampleSurroundingContent(
      image, regionForSampling, options.samplingRadius
    )

    const allPatches = Object.values(samples).flat()
    const regionForReference = { x: region.x, y: region.y, width: region.width, height: region.height }
    const referencePatch = await this.samplingEngine.createReferencePatch(regionForReference, 'north')
    
    const { patches: bestPatches, weights } = await this.samplingEngine.selectBestPatches(
      allPatches, referencePatch, 5
    )

    const blendedContent = await this.samplingEngine.weightAndBlendPatches(bestPatches, weights)

    const regionForInterpolation = { x: region.x, y: region.y, width: region.width, height: region.height }
    const interpolatedContent = await this.interpolator.interpolateWithEdgePreservation(
      [blendedContent], regionForInterpolation, options.edgePreservation ? 'edge-directed' : 'bicubic'
    )

    const regionForFeatherMask = { x: region.x, y: region.y, width: region.width, height: region.height }
    const featherMask = await this.edgeFeatherer.createFeatherMask(
      regionForFeatherMask, 
      { width: (await image.metadata()).width!, height: (await image.metadata()).height! },
      options.featherRadius
    )

    return await this.blendWithOriginal(image, interpolatedContent, region, featherMask)
  }

  private async hybridInpainting(
    image: sharp.Sharp,
    region: WatermarkArea,
    options: InpaintingOptions
  ): Promise<sharp.Sharp> {
    const textureResult = await this.textureBasedInpainting(image, region, options)
    const patchResult = await this.patchBasedInpainting(image, region, options)

    const textureBuffer = await textureResult.extract({ left: region.x, top: region.y, width: region.width, height: region.height }).raw().toBuffer()
    const patchBuffer = await patchResult.extract({ left: region.x, top: region.y, width: region.width, height: region.height }).raw().toBuffer()

    const hybridMask = await this.createHybridBlendingMask(region)
    
    const hybridContent = await this.interpolator.createSmoothTransition(
      textureBuffer, patchBuffer, hybridMask, region.width, region.height
    )

    const featherMask = await this.edgeFeatherer.createAdaptiveFeathering(image, region)

    return await this.blendWithOriginal(image, hybridContent, region, featherMask)
  }

  private async basicInpainting(
    image: sharp.Sharp,
    region: WatermarkArea,
    options: InpaintingOptions
  ): Promise<sharp.Sharp> {
    const regionForSampling = { x: region.x, y: region.y, width: region.width, height: region.height }
    const samples = await this.samplingEngine.sampleSurroundingContent(
      image, regionForSampling, options.samplingRadius
    )

    const allPatches = Object.values(samples).flat().slice(0, 10)
    
    if (allPatches.length === 0) {
      // Validate extract parameters before calling Sharp
      const metadata = await image.metadata()
      if (!metadata.width || !metadata.height) {
        throw new Error('Unable to get image dimensions for basic inpainting')
      }

      const extractParams = {
        left: Math.max(0, region.x),
        top: Math.max(0, region.y),
        width: Math.min(region.width, metadata.width - region.x),
        height: Math.min(region.height, metadata.height - region.y)
      }

      if (extractParams.width <= 0 || extractParams.height <= 0) {
        throw new Error(`Invalid extract parameters: ${JSON.stringify(extractParams)}`)
      }

      const blurredRegion = await image
        .extract(extractParams)
        .blur(30)
        .toBuffer()

      const regionForMask = { x: region.x, y: region.y, width: region.width, height: region.height }
      const featherMask = await this.edgeFeatherer.createFeatherMask(
        regionForMask,
        { width: (await image.metadata()).width!, height: (await image.metadata()).height! },
        options.featherRadius
      )

      return await this.blendWithOriginal(image, blurredRegion, region, featherMask)
    }

    const avgContent = await this.computeAverageContent(allPatches)
    
    const regionForInterp = { x: region.x, y: region.y, width: region.width, height: region.height }
    const interpolatedContent = await this.interpolator.interpolateWithEdgePreservation(
      [avgContent], regionForInterp, 'bicubic'
    )

    const regionForMask2 = { x: region.x, y: region.y, width: region.width, height: region.height }
    const featherMask = await this.edgeFeatherer.createFeatherMask(
      regionForMask2,
      { width: (await image.metadata()).width!, height: (await image.metadata()).height! },
      options.featherRadius
    )

    return await this.blendWithOriginal(image, interpolatedContent, region, featherMask)
  }

  private async blendWithOriginal(
    originalImage: sharp.Sharp,
    inpaintedContent: Buffer,
    region: WatermarkArea,
    _featherMask: Buffer
  ): Promise<sharp.Sharp> {
    const inpaintedImage = sharp(inpaintedContent, {
      raw: { width: region.width, height: region.height, channels: 3 }
    })

    return originalImage.composite([
      {
        input: await inpaintedImage.toBuffer(),
        left: region.x,
        top: region.y,
        blend: 'over'
      }
    ])
  }

  private async evaluateQuality(
    original: Buffer,
    processed: Buffer,
    region: WatermarkArea,
    width: number,
    height: number
  ): Promise<QualityMetrics> {
    const psnr = this.computePSNR(original, processed)
    const ssim = this.computeSSIM(original, processed, width, height)
    
    const visualQuality = (psnr / 50 + ssim) / 2
    const artifactLevel = this.detectArtifacts(processed, region, width, height)

    return {
      psnr: Math.round(psnr * 100) / 100,
      ssim: Math.round(ssim * 1000) / 1000,
      visualQuality: Math.round(visualQuality * 1000) / 1000,
      artifactLevel: Math.round(artifactLevel * 1000) / 1000
    }
  }

  private adaptOptionsToContext(options: InpaintingOptions, context: ContextAnalysis): InpaintingOptions {
    const adapted = { ...options }

    if (context.textureComplexity > 0.7) {
      adapted.textureAnalysisDepth = Math.max(adapted.textureAnalysisDepth, 4)
      adapted.samplingRadius = Math.max(adapted.samplingRadius, 60)
    }

    if (context.edgeStrength > 0.6) {
      adapted.edgePreservation = true
      adapted.featherRadius = Math.min(adapted.featherRadius, 15)
    }

    if (context.colorVariation > 0.8) {
      adapted.noiseMatching = true
    }

    return adapted
  }

  private analyzeTextureComplexity(pixels: Uint8Array, width: number, height: number, channels: number): number {
    let variance = 0
    let mean = 0
    const totalPixels = width * height

    for (let i = 0; i < totalPixels; i++) {
      const gray = 0.299 * pixels[i * channels] + 0.587 * pixels[i * channels + 1] + 0.114 * pixels[i * channels + 2]
      mean += gray
    }
    mean /= totalPixels

    for (let i = 0; i < totalPixels; i++) {
      const gray = 0.299 * pixels[i * channels] + 0.587 * pixels[i * channels + 1] + 0.114 * pixels[i * channels + 2]
      variance += (gray - mean) * (gray - mean)
    }
    variance /= totalPixels

    return Math.min(1, variance / 10000)
  }

  private analyzeEdgeStrength(pixels: Uint8Array, width: number, height: number, channels: number): number {
    let edgeStrength = 0
    let count = 0

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0
        for (let c = 0; c < channels; c++) {
          gx += pixels[y * width * channels + (x + 1) * channels + c] - pixels[y * width * channels + (x - 1) * channels + c]
          gy += pixels[(y + 1) * width * channels + x * channels + c] - pixels[(y - 1) * width * channels + x * channels + c]
        }
        edgeStrength += Math.sqrt(gx * gx + gy * gy)
        count++
      }
    }

    return Math.min(1, edgeStrength / (count * 255))
  }

  private analyzeColorVariation(pixels: Uint8Array, width: number, height: number, channels: number): number {
    const colorStats = { r: { sum: 0, sumSq: 0 }, g: { sum: 0, sumSq: 0 }, b: { sum: 0, sumSq: 0 } }
    const totalPixels = width * height

    for (let i = 0; i < totalPixels; i++) {
      const r = pixels[i * channels]
      const g = pixels[i * channels + 1]
      const b = pixels[i * channels + 2]

      colorStats.r.sum += r
      colorStats.g.sum += g
      colorStats.b.sum += b

      colorStats.r.sumSq += r * r
      colorStats.g.sumSq += g * g
      colorStats.b.sumSq += b * b
    }

    const rVar = (colorStats.r.sumSq / totalPixels) - Math.pow(colorStats.r.sum / totalPixels, 2)
    const gVar = (colorStats.g.sumSq / totalPixels) - Math.pow(colorStats.g.sum / totalPixels, 2)
    const bVar = (colorStats.b.sumSq / totalPixels) - Math.pow(colorStats.b.sum / totalPixels, 2)

    const avgVariance = (rVar + gVar + bVar) / 3
    return Math.min(1, avgVariance / 10000)
  }

  private analyzePatternRepetition(pixels: Uint8Array, width: number, height: number, channels: number): number {
    const blockSize = 8
    const correlations = []

    for (let y = 0; y <= height - blockSize * 2; y += blockSize) {
      for (let x = 0; x <= width - blockSize * 2; x += blockSize) {
        const block1 = this.extractBlock(pixels, width, channels, x, y, blockSize)
        const block2 = this.extractBlock(pixels, width, channels, x + blockSize, y, blockSize)
        
        correlations.push(this.computeBlockCorrelation(block1, block2))
      }
    }

    return correlations.length > 0 ? correlations.reduce((a, b) => a + b) / correlations.length : 0
  }

  private determineInpaintingMethod(
    textureComplexity: number,
    edgeStrength: number,
    colorVariation: number,
    patternRepetition: number
  ): 'basic' | 'texture-synthesis' | 'patch-based' | 'hybrid' {
    if (textureComplexity > 0.7 && patternRepetition > 0.6) {
      return 'texture-synthesis'
    } else if (edgeStrength > 0.6) {
      return 'patch-based'
    } else if (textureComplexity > 0.5 || colorVariation > 0.6) {
      return 'hybrid'
    } else {
      return 'basic'
    }
  }

  private async computeAverageContent(patches: any[]): Promise<Buffer> {
    if (patches.length === 0) {
      return Buffer.alloc(16 * 16 * 3, 128)
    }

    const avgPixels = new Float32Array(patches[0].pixels.length)
    
    for (const patch of patches) {
      for (let i = 0; i < patch.pixels.length; i++) {
        avgPixels[i] += patch.pixels[i]
      }
    }

    for (let i = 0; i < avgPixels.length; i++) {
      avgPixels[i] /= patches.length
    }

    const result = new Uint8Array(avgPixels.length)
    for (let i = 0; i < avgPixels.length; i++) {
      result[i] = Math.floor(Math.max(0, Math.min(255, avgPixels[i])))
    }

    return Buffer.from(result)
  }

  private async createHybridBlendingMask(region: WatermarkArea): Promise<Buffer> {
    const mask = new Uint8Array(region.width * region.height)
    
    for (let y = 0; y < region.height; y++) {
      for (let x = 0; x < region.width; x++) {
        const distFromCenter = Math.sqrt(
          Math.pow(x - region.width / 2, 2) + Math.pow(y - region.height / 2, 2)
        )
        const maxDist = Math.sqrt(Math.pow(region.width / 2, 2) + Math.pow(region.height / 2, 2))
        const normalized = distFromCenter / maxDist
        
        mask[y * region.width + x] = Math.floor(normalized * 255)
      }
    }

    return Buffer.from(mask)
  }

  private computePSNR(original: Buffer, processed: Buffer): number {
    let mse = 0
    const length = Math.min(original.length, processed.length)
    
    for (let i = 0; i < length; i++) {
      const diff = original[i] - processed[i]
      mse += diff * diff
    }
    
    mse /= length
    return mse > 0 ? 10 * Math.log10(255 * 255 / mse) : 100
  }

  private computeSSIM(original: Buffer, processed: Buffer, width: number, _height: number): number {
    const windowSize = 11
    const k1 = 0.01
    const k2 = 0.03
    const L = 255

    let ssim = 0
    let count = 0

    for (let y = 0; y <= _height - windowSize; y += windowSize) {
      for (let x = 0; x <= width - windowSize; x += windowSize) {
        const window1 = this.extractWindow(original, width, x, y, windowSize)
        const window2 = this.extractWindow(processed, width, x, y, windowSize)
        
        ssim += this.computeWindowSSIM(window1, window2, k1, k2, L)
        count++
      }
    }

    return count > 0 ? ssim / count : 1
  }

  private detectArtifacts(processed: Buffer, region: WatermarkArea, width: number, _height: number): number {
    let artifactScore = 0
    const channels = 3
    
    for (let y = region.y; y < region.y + region.height - 1; y++) {
      for (let x = region.x; x < region.x + region.width - 1; x++) {
        const idx = (y * width + x) * channels
        const rightIdx = (y * width + x + 1) * channels
        const downIdx = ((y + 1) * width + x) * channels
        
        for (let c = 0; c < channels; c++) {
          const horizontalDiff = Math.abs(processed[idx + c] - processed[rightIdx + c])
          const verticalDiff = Math.abs(processed[idx + c] - processed[downIdx + c])
          
          if (horizontalDiff > 50 || verticalDiff > 50) {
            artifactScore += 1
          }
        }
      }
    }
    
    const totalPixels = region.width * region.height
    return artifactScore / (totalPixels * channels)
  }

  private extractBlock(pixels: Uint8Array, width: number, channels: number, x: number, y: number, blockSize: number): Uint8Array {
    const block = new Uint8Array(blockSize * blockSize * channels)
    let blockIdx = 0

    for (let by = 0; by < blockSize; by++) {
      for (let bx = 0; bx < blockSize; bx++) {
        const srcIdx = ((y + by) * width + (x + bx)) * channels
        for (let c = 0; c < channels; c++) {
          block[blockIdx++] = pixels[srcIdx + c]
        }
      }
    }

    return block
  }

  private computeBlockCorrelation(block1: Uint8Array, block2: Uint8Array): number {
    let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, sumProduct = 0
    const n = block1.length

    for (let i = 0; i < n; i++) {
      sum1 += block1[i]
      sum2 += block2[i]
      sum1Sq += block1[i] * block1[i]
      sum2Sq += block2[i] * block2[i]
      sumProduct += block1[i] * block2[i]
    }

    const numerator = sumProduct - (sum1 * sum2) / n
    const denominator = Math.sqrt((sum1Sq - (sum1 * sum1) / n) * (sum2Sq - (sum2 * sum2) / n))

    return denominator > 0 ? Math.abs(numerator / denominator) : 0
  }

  private extractWindow(buffer: Buffer, width: number, x: number, y: number, windowSize: number): number[] {
    const window = []
    for (let wy = 0; wy < windowSize; wy++) {
      for (let wx = 0; wx < windowSize; wx++) {
        const idx = (y + wy) * width + (x + wx)
        window.push(buffer[idx])
      }
    }
    return window
  }

  private computeWindowSSIM(window1: number[], window2: number[], k1: number, k2: number, L: number): number {
    const n = window1.length
    let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, sumProduct = 0

    for (let i = 0; i < n; i++) {
      sum1 += window1[i]
      sum2 += window2[i]
      sum1Sq += window1[i] * window1[i]
      sum2Sq += window2[i] * window2[i]
      sumProduct += window1[i] * window2[i]
    }

    const mu1 = sum1 / n
    const mu2 = sum2 / n
    const sigma1Sq = (sum1Sq / n) - (mu1 * mu1)
    const sigma2Sq = (sum2Sq / n) - (mu2 * mu2)
    const sigma12 = (sumProduct / n) - (mu1 * mu2)

    const c1 = (k1 * L) * (k1 * L)
    const c2 = (k2 * L) * (k2 * L)

    const numerator = (2 * mu1 * mu2 + c1) * (2 * sigma12 + c2)
    const denominator = (mu1 * mu1 + mu2 * mu2 + c1) * (sigma1Sq + sigma2Sq + c2)

    return numerator / denominator
  }
}

export function generateProcessingOptions(context: ContextAnalysis): InpaintingOptions {
  if (context.textureComplexity > 0.7 || context.edgeStrength > 0.8) {
    return HIGH_QUALITY_OPTIONS
  } else if (context.colorVariation < 0.3 && context.patternRepetition < 0.4) {
    return HIGH_PERFORMANCE_OPTIONS
  } else {
    return BALANCED_OPTIONS
  }
}

export async function validateAndOptimize(result: ProcessingResult, _context: ContextAnalysis): Promise<ProcessingResult> {
  if (result.qualityMetrics.psnr < 20 || result.qualityMetrics.ssim < 0.7) {
    console.warn('Quality metrics below threshold, results may have visible artifacts')
  }

  if (result.duration > 10000) {
    console.warn('Processing time exceeded 10 seconds, consider using faster options')
  }

  return result
}