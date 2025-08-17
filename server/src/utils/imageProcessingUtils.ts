import sharp from 'sharp'
import { Region, Size } from '../types/inpainting.js'

export async function validateInputs(imageId: string, watermarkArea: any): Promise<boolean> {
  if (!imageId || typeof imageId !== 'string') {
    return false
  }

  if (!watermarkArea || 
      typeof watermarkArea.x !== 'number' || 
      typeof watermarkArea.y !== 'number' ||
      typeof watermarkArea.width !== 'number' || 
      typeof watermarkArea.height !== 'number') {
    return false
  }

  if (watermarkArea.x < 0 || watermarkArea.y < 0 || 
      watermarkArea.width <= 0 || watermarkArea.height <= 0) {
    return false
  }

  return true
}

export async function resolveImagePath(imageId: string, uploadDir: string): Promise<string> {
  const fs = await import('fs/promises')
  const path = await import('path')
  
  const files = await fs.readdir(uploadDir)
  const imageFile = files.find(file => file.includes(imageId))
  
  if (!imageFile) {
    throw new Error('Image not found')
  }
  
  return path.join(uploadDir, imageFile)
}

export async function saveProcessedImage(buffer: Buffer, processedDir: string): Promise<string> {
  const fs = await import('fs/promises')
  const path = await import('path')
  const { v4: uuidv4 } = await import('uuid')
  
  await ensureDirectoryExists(processedDir)
  
  const fileName = `processed_${uuidv4()}.png`
  const outputPath = path.join(processedDir, fileName)
  
  await fs.writeFile(outputPath, buffer)
  return outputPath
}

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  const fs = await import('fs/promises')
  
  try {
    await fs.access(dirPath)
  } catch {
    await fs.mkdir(dirPath, { recursive: true })
  }
}

export function expandRegion(region: Region, expandBy: number): Region {
  return {
    x: Math.max(0, region.x - expandBy),
    y: Math.max(0, region.y - expandBy),
    width: region.width + (2 * expandBy),
    height: region.height + (2 * expandBy)
  }
}

export function clampRegionToImage(region: Region, imageSize: Size): Region {
  const clampedX = Math.max(0, Math.min(region.x, imageSize.width - 1))
  const clampedY = Math.max(0, Math.min(region.y, imageSize.height - 1))
  const maxWidth = imageSize.width - clampedX
  const maxHeight = imageSize.height - clampedY
  
  return {
    x: clampedX,
    y: clampedY,
    width: Math.min(region.width, maxWidth),
    height: Math.min(region.height, maxHeight)
  }
}

export async function getImageMetadata(imagePath: string): Promise<{ width: number; height: number; channels: number; format: string }> {
  const image = sharp(imagePath)
  const metadata = await image.metadata()
  
  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to get image dimensions')
  }
  
  return {
    width: metadata.width,
    height: metadata.height,
    channels: (metadata.channels as 1 | 2 | 3 | 4) || 3,
    format: metadata.format || 'unknown'
  }
}

export async function extractRegionBuffer(imagePath: string, region: Region): Promise<{
  buffer: Buffer;
  info: { width: number; height: number; channels: number }
}> {
  const image = sharp(imagePath)
  const result = await image
    .extract({ left: region.x, top: region.y, width: region.width, height: region.height })
    .raw()
    .toBuffer({ resolveWithObject: true })
    
  return {
    buffer: result.data,
    info: result.info
  }
}

export function calculateOptimalPatchSize(region: Region): number {
  const area = region.width * region.height
  
  if (area < 1000) return 8
  if (area < 5000) return 12
  if (area < 20000) return 16
  return 20
}

export function calculateOptimalSamplingRadius(region: Region): number {
  const maxDimension = Math.max(region.width, region.height)
  return Math.max(30, Math.min(100, maxDimension * 1.5))
}

export function calculateOptimalFeatherRadius(region: Region, edgeStrength: number): number {
  const baseFactor = Math.min(region.width, region.height) * 0.1
  const edgeFactor = edgeStrength > 0.6 ? 0.7 : 1.0
  return Math.max(10, Math.min(30, baseFactor * edgeFactor))
}

export async function createImageFromBuffer(
  buffer: Buffer, 
  width: number, 
  height: number, 
  channels: 1 | 2 | 3 | 4 = 3
): Promise<sharp.Sharp> {
  return sharp(buffer, {
    raw: { width, height, channels }
  })
}

export async function convertToGrayscale(image: sharp.Sharp): Promise<Buffer> {
  return await image.greyscale().raw().toBuffer()
}

export async function applyGaussianBlur(image: sharp.Sharp, sigma: number): Promise<Buffer> {
  return await image.blur(sigma).raw().toBuffer()
}

export function normalizePixelValues(pixels: Uint8Array): Float32Array {
  const normalized = new Float32Array(pixels.length)
  for (let i = 0; i < pixels.length; i++) {
    normalized[i] = pixels[i] / 255.0
  }
  return normalized
}

export function denormalizePixelValues(pixels: Float32Array): Uint8Array {
  const denormalized = new Uint8Array(pixels.length)
  for (let i = 0; i < pixels.length; i++) {
    denormalized[i] = Math.floor(Math.max(0, Math.min(255, pixels[i] * 255)))
  }
  return denormalized
}

export function computeImageStatistics(pixels: Uint8Array, channels: number): {
  mean: number[];
  variance: number[];
  min: number[];
  max: number[];
} {
  const pixelCount = pixels.length / channels
  const stats = {
    mean: new Array(channels).fill(0),
    variance: new Array(channels).fill(0),
    min: new Array(channels).fill(255),
    max: new Array(channels).fill(0)
  }

  for (let i = 0; i < pixelCount; i++) {
    for (let c = 0; c < channels; c++) {
      const value = pixels[i * channels + c]
      stats.mean[c] += value
      stats.min[c] = Math.min(stats.min[c], value)
      stats.max[c] = Math.max(stats.max[c], value)
    }
  }

  for (let c = 0; c < channels; c++) {
    stats.mean[c] /= pixelCount
  }

  for (let i = 0; i < pixelCount; i++) {
    for (let c = 0; c < channels; c++) {
      const value = pixels[i * channels + c]
      const diff = value - stats.mean[c]
      stats.variance[c] += diff * diff
    }
  }

  for (let c = 0; c < channels; c++) {
    stats.variance[c] /= pixelCount
  }

  return stats
}

export function isRegionValid(region: Region, imageSize: Size): boolean {
  return region.x >= 0 && 
         region.y >= 0 && 
         region.x + region.width <= imageSize.width && 
         region.y + region.height <= imageSize.height &&
         region.width > 0 && 
         region.height > 0
}

export function createProgressiveBlendMask(width: number, height: number): Uint8Array {
  const mask = new Uint8Array(width * height)
  const centerX = width / 2
  const centerY = height / 2
  const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
      const normalized = Math.min(1, distance / maxDistance)
      mask[y * width + x] = Math.floor(normalized * 255)
    }
  }

  return mask
}

export async function debugSaveBuffer(
  buffer: Buffer, 
  width: number, 
  height: number, 
  filename: string,
  processedDir: string
): Promise<void> {
  const path = await import('path')
  
  const image = sharp(buffer, {
    raw: { width, height, channels: 3 }
  })

  const outputPath = path.join(processedDir, `debug_${filename}`)
  await image.png().toFile(outputPath)
  console.log(`Debug image saved: ${outputPath}`)
}

export function logProcessingStep(step: string, duration: number, details?: any): void {
  console.log(`[InpaintingEngine] ${step} completed in ${duration}ms`, details ? details : '')
}

export function validateProcessingResult(
  buffer: Buffer, 
  expectedSize: number, 
  qualityThreshold: number = 0.5
): { isValid: boolean; issues: string[] } {
  const issues: string[] = []
  
  if (!buffer || buffer.length === 0) {
    issues.push('Result buffer is empty')
  }
  
  if (buffer.length !== expectedSize) {
    issues.push(`Buffer size mismatch: expected ${expectedSize}, got ${buffer.length}`)
  }
  
  const nonZeroPixels = Array.from(buffer).filter(pixel => pixel > 0).length
  const nonZeroRatio = nonZeroPixels / buffer.length
  
  if (nonZeroRatio < qualityThreshold) {
    issues.push(`Too many zero pixels: ${(1 - nonZeroRatio) * 100}% of image`)
  }
  
  return {
    isValid: issues.length === 0,
    issues
  }
}