import sharp from 'sharp'
import { NoiseProfile, Region, Size } from '../types/inpainting.js'

export class NoiseMatchingEngine {
  async analyzeLocalNoise(image: sharp.Sharp, region: Region): Promise<NoiseProfile> {
    const expandedRegion = {
      x: Math.max(0, region.x - 20),
      y: Math.max(0, region.y - 20),
      width: Math.min(region.width + 40, (await image.metadata()).width! - region.x + 20),
      height: Math.min(region.height + 40, (await image.metadata()).height! - region.y + 20)
    }

    const regionBuffer = await image
      .extract({ left: expandedRegion.x, top: expandedRegion.y, width: expandedRegion.width, height: expandedRegion.height })
      .raw()
      .toBuffer({ resolveWithObject: true })

    const { data: pixels, info } = regionBuffer
    const { width, height, channels } = info

    const powerSpectrum = this.computePowerSpectralDensity(pixels, width, height, channels)
    const grainSize = this.estimateGrainSize(pixels, width, height, channels)
    const correlationLength = this.computeCorrelationLength(pixels, width, height, channels)
    const colorNoise = this.analyzeColorNoise(pixels, width, height, channels)

    return {
      powerSpectrum,
      grainSize,
      correlationLength,
      colorNoise
    }
  }

  computePowerSpectralDensity(pixels: Uint8Array, width: number, height: number, channels: number): Float32Array {
    const grayscale = this.convertToGrayscale(pixels, width, height, channels)
    const fftSize = Math.min(64, Math.min(width, height))
    const spectrum = new Float32Array(fftSize * fftSize)

    for (let blockY = 0; blockY <= height - fftSize; blockY += fftSize / 2) {
      for (let blockX = 0; blockX <= width - fftSize; blockX += fftSize / 2) {
        const block = this.extractBlock(grayscale, width, blockX, blockY, fftSize)
        const blockSpectrum = this.computeFFT2D(block, fftSize)
        
        for (let i = 0; i < spectrum.length; i++) {
          spectrum[i] += blockSpectrum[i]
        }
      }
    }

    const numBlocks = Math.floor((width - fftSize) / (fftSize / 2) + 1) * 
                     Math.floor((height - fftSize) / (fftSize / 2) + 1)
    
    for (let i = 0; i < spectrum.length; i++) {
      spectrum[i] /= numBlocks
    }

    return spectrum
  }

  async synthesizeMatchingNoise(profile: NoiseProfile, size: Size): Promise<Buffer> {
    const { width, height } = size
    const channels = 3
    const noisePixels = new Uint8Array(width * height * channels)

    const baseNoise = this.generateWhiteNoise(width, height)
    const filteredNoise = this.applySpectralFiltering(baseNoise, profile.powerSpectrum, width, height)
    const correlatedNoise = this.applySpatialCorrelation(filteredNoise, profile.correlationLength, width, height)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const noiseIdx = y * width + x
        const pixelIdx = (y * width + x) * channels
        
        const baseValue = correlatedNoise[noiseIdx]
        
        noisePixels[pixelIdx] = Math.floor(baseValue + profile.colorNoise.r * (Math.random() - 0.5) * 20)
        noisePixels[pixelIdx + 1] = Math.floor(baseValue + profile.colorNoise.g * (Math.random() - 0.5) * 20)
        noisePixels[pixelIdx + 2] = Math.floor(baseValue + profile.colorNoise.b * (Math.random() - 0.5) * 20)

        for (let c = 0; c < channels; c++) {
          noisePixels[pixelIdx + c] = Math.max(0, Math.min(255, noisePixels[pixelIdx + c]))
        }
      }
    }

    return Buffer.from(noisePixels)
  }

  applySpatialCorrelation(noise: Float32Array, correlation: number, width: number, height: number): Float32Array {
    if (correlation <= 0) return noise

    const correlatedNoise = new Float32Array(noise.length)
    const kernelSize = Math.floor(correlation * 2) + 1
    const halfKernel = Math.floor(kernelSize / 2)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0
        let weightSum = 0

        for (let ky = -halfKernel; ky <= halfKernel; ky++) {
          for (let kx = -halfKernel; kx <= halfKernel; kx++) {
            const neighborY = y + ky
            const neighborX = x + kx

            if (neighborY >= 0 && neighborY < height && 
                neighborX >= 0 && neighborX < width) {
              const distance = Math.sqrt(kx * kx + ky * ky)
              const weight = Math.exp(-(distance * distance) / (2 * correlation * correlation))
              
              sum += noise[neighborY * width + neighborX] * weight
              weightSum += weight
            }
          }
        }

        correlatedNoise[y * width + x] = weightSum > 0 ? sum / weightSum : noise[y * width + x]
      }
    }

    return correlatedNoise
  }

  async blendNoiseWithContent(
    content: Buffer,
    noise: Buffer,
    blendStrength: number
  ): Promise<Buffer> {
    if (content.length !== noise.length) {
      throw new Error('Content and noise buffers must have the same length')
    }

    const blended = new Uint8Array(content.length)
    const alpha = Math.max(0, Math.min(1, blendStrength))

    for (let i = 0; i < content.length; i++) {
      const contentValue = content[i]
      const noiseValue = noise[i]
      
      blended[i] = Math.floor(contentValue * (1 - alpha) + noiseValue * alpha)
    }

    return Buffer.from(blended)
  }

  private convertToGrayscale(pixels: Uint8Array, width: number, height: number, channels: number): Float32Array {
    const grayscale = new Float32Array(width * height)
    
    for (let i = 0; i < width * height; i++) {
      const r = pixels[i * channels]
      const g = pixels[i * channels + 1]
      const b = pixels[i * channels + 2]
      grayscale[i] = 0.299 * r + 0.587 * g + 0.114 * b
    }

    return grayscale
  }

  private estimateGrainSize(pixels: Uint8Array, width: number, height: number, channels: number): number {
    const grayscale = this.convertToGrayscale(pixels, width, height, channels)
    
    let totalVariation = 0
    let count = 0

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const center = grayscale[y * width + x]
        const neighbors = [
          grayscale[(y-1) * width + x],
          grayscale[(y+1) * width + x],
          grayscale[y * width + (x-1)],
          grayscale[y * width + (x+1)]
        ]

        const variation = neighbors.reduce((sum, neighbor) => 
          sum + Math.abs(center - neighbor), 0) / 4
        
        totalVariation += variation
        count++
      }
    }

    const avgVariation = totalVariation / count
    return Math.max(1, Math.min(10, avgVariation / 10))
  }

  private computeCorrelationLength(pixels: Uint8Array, width: number, height: number, channels: number): number {
    const grayscale = this.convertToGrayscale(pixels, width, height, channels)
    const maxDistance = Math.min(width, height) / 4
    
    let bestCorrelation = 0
    let bestDistance = 1

    for (let distance = 1; distance <= maxDistance; distance++) {
      let correlation = 0
      let count = 0

      for (let y = 0; y < height - distance; y++) {
        for (let x = 0; x < width - distance; x++) {
          const pixel1 = grayscale[y * width + x]
          const pixel2 = grayscale[(y + distance) * width + (x + distance)]
          
          correlation += pixel1 * pixel2
          count++
        }
      }

      correlation /= count
      
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation
        bestDistance = distance
      }
    }

    return bestDistance
  }

  private analyzeColorNoise(pixels: Uint8Array, width: number, height: number, channels: number): { r: number; g: number; b: number } {
    let rVariance = 0, gVariance = 0, bVariance = 0
    let rSum = 0, gSum = 0, bSum = 0
    const totalPixels = width * height

    for (let i = 0; i < totalPixels; i++) {
      const r = pixels[i * channels]
      const g = pixels[i * channels + 1]
      const b = pixels[i * channels + 2]

      rSum += r
      gSum += g
      bSum += b
    }

    const rMean = rSum / totalPixels
    const gMean = gSum / totalPixels
    const bMean = bSum / totalPixels

    for (let i = 0; i < totalPixels; i++) {
      const r = pixels[i * channels]
      const g = pixels[i * channels + 1]
      const b = pixels[i * channels + 2]

      rVariance += (r - rMean) * (r - rMean)
      gVariance += (g - gMean) * (g - gMean)
      bVariance += (b - bMean) * (b - bMean)
    }

    return {
      r: Math.sqrt(rVariance / totalPixels) / 255,
      g: Math.sqrt(gVariance / totalPixels) / 255,
      b: Math.sqrt(bVariance / totalPixels) / 255
    }
  }

  private extractBlock(data: Float32Array, width: number, startX: number, startY: number, blockSize: number): Float32Array {
    const block = new Float32Array(blockSize * blockSize)
    
    for (let y = 0; y < blockSize; y++) {
      for (let x = 0; x < blockSize; x++) {
        const srcIdx = (startY + y) * width + (startX + x)
        const dstIdx = y * blockSize + x
        block[dstIdx] = data[srcIdx]
      }
    }

    return block
  }

  private computeFFT2D(data: Float32Array, size: number): Float32Array {
    const spectrum = new Float32Array(size * size)
    
    for (let u = 0; u < size; u++) {
      for (let v = 0; v < size; v++) {
        let realSum = 0
        let imagSum = 0

        for (let x = 0; x < size; x++) {
          for (let y = 0; y < size; y++) {
            const angle = -2 * Math.PI * ((u * x + v * y) / size)
            const value = data[y * size + x]
            
            realSum += value * Math.cos(angle)
            imagSum += value * Math.sin(angle)
          }
        }

        spectrum[u * size + v] = Math.sqrt(realSum * realSum + imagSum * imagSum)
      }
    }

    return spectrum
  }

  private generateWhiteNoise(width: number, height: number): Float32Array {
    const noise = new Float32Array(width * height)
    
    for (let i = 0; i < noise.length; i++) {
      noise[i] = (Math.random() - 0.5) * 255
    }

    return noise
  }

  private applySpectralFiltering(noise: Float32Array, spectrum: Float32Array, width: number, height: number): Float32Array {
    const filtered = new Float32Array(noise.length)
    const spectrumSize = Math.sqrt(spectrum.length)
    
    for (let i = 0; i < noise.length; i++) {
      const x = i % width
      const y = Math.floor(i / width)
      
      const u = Math.floor((x / width) * spectrumSize)
      const v = Math.floor((y / height) * spectrumSize)
      const spectrumIdx = v * spectrumSize + u
      
      const filterValue = spectrumIdx < spectrum.length ? spectrum[spectrumIdx] / 255 : 1
      filtered[i] = noise[i] * filterValue
    }

    return filtered
  }
}