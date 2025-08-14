import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'

export async function getImageMetadata(filePath: string) {
  try {
    const metadata = await sharp(filePath).metadata()
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      channels: metadata.channels || 0,
      density: metadata.density || 0
    }
  } catch (error) {
    throw new Error(`Failed to get image metadata: ${error}`)
  }
}

export function validateImageFormat(format: string): boolean {
  const supportedFormats = ['jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff']
  return supportedFormats.includes(format.toLowerCase())
}

export function sanitizeFilename(filename: string): string {
  // Remove special characters and replace spaces with underscores
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath)
  } catch {
    await fs.mkdir(dirPath, { recursive: true })
  }
}

export function calculateOptimalQuality(originalSize: number, targetSize?: number): number {
  if (!targetSize || originalSize === 0) return 50
  
  // Simple heuristic: reduce quality based on how much compression is needed
  const ratio = targetSize / originalSize
  if (ratio > 0.8) return 90
  if (ratio > 0.6) return 80
  if (ratio > 0.4) return 70
  if (ratio >= 0.2) return 60
  return 50
}