import sharp from 'sharp'
import { TextureDescriptor, Region, StructureInfo, ColorStats } from '../../types/inpainting.js'

export class TextureAnalyzer {
  async analyzeRegion(image: sharp.Sharp, region: Region): Promise<TextureDescriptor> {
    const regionBuffer = await image
      .extract({ left: region.x, top: region.y, width: region.width, height: region.height })
      .raw()
      .toBuffer({ resolveWithObject: true })

    const pixels = regionBuffer.data
    const { width, height, channels } = regionBuffer.info

    const dominantFrequencies = await this.computeDominantFrequencies(pixels, width, height, channels)
    const localBinaryPatterns = this.extractLBPFeatures(pixels, width, height, channels)
    const gaborResponses = this.computeGaborResponse(pixels, width, height, channels)
    const structuralElements = this.analyzeStructuralElements(pixels, width, height, channels)
    const colorDistribution = this.computeColorDistribution(pixels, width, height, channels)

    return {
      dominantFrequencies,
      localBinaryPatterns,
      gaborResponses,
      structuralElements,
      colorDistribution
    }
  }

  private async computeDominantFrequencies(pixels: Uint8Array, width: number, height: number, channels: number): Promise<Float32Array> {
    const grayscale = this.convertToGrayscale(pixels, width, height, channels)
    const frequencies = new Float32Array(64)
    
    const blockSize = 8
    for (let y = 0; y < height - blockSize; y += blockSize) {
      for (let x = 0; x < width - blockSize; x += blockSize) {
        const dctCoeffs = this.computeDCT(grayscale, x, y, blockSize, width)
        for (let i = 0; i < Math.min(dctCoeffs.length, frequencies.length); i++) {
          frequencies[i] += Math.abs(dctCoeffs[i])
        }
      }
    }

    const numBlocks = Math.floor(width / blockSize) * Math.floor(height / blockSize)
    for (let i = 0; i < frequencies.length; i++) {
      frequencies[i] /= numBlocks
    }

    return frequencies
  }

  extractLBPFeatures(pixels: Uint8Array, width: number, height: number, channels: number): Uint8Array {
    const grayscale = this.convertToGrayscale(pixels, width, height, channels)
    const lbpHistogram = new Uint8Array(256)

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const center = grayscale[y * width + x]
        let lbpValue = 0

        const neighbors = [
          grayscale[(y - 1) * width + (x - 1)],
          grayscale[(y - 1) * width + x],
          grayscale[(y - 1) * width + (x + 1)],
          grayscale[y * width + (x + 1)],
          grayscale[(y + 1) * width + (x + 1)],
          grayscale[(y + 1) * width + x],
          grayscale[(y + 1) * width + (x - 1)],
          grayscale[y * width + (x - 1)]
        ]

        for (let i = 0; i < 8; i++) {
          if (neighbors[i] >= center) {
            lbpValue |= (1 << i)
          }
        }

        lbpHistogram[lbpValue]++
      }
    }

    const totalPixels = (width - 2) * (height - 2)
    for (let i = 0; i < lbpHistogram.length; i++) {
      lbpHistogram[i] = Math.floor((lbpHistogram[i] / totalPixels) * 255)
    }

    return lbpHistogram
  }

  computeGaborResponse(pixels: Uint8Array, width: number, height: number, channels: number): Float32Array {
    const grayscale = this.convertToGrayscale(pixels, width, height, channels)
    const responses = new Float32Array(8)
    
    const orientations = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5]
    const frequency = 0.1
    const sigma = 2

    for (let i = 0; i < orientations.length; i++) {
      const theta = (orientations[i] * Math.PI) / 180
      let response = 0

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const gaborValue = this.gaborKernel(x - width/2, y - height/2, theta, frequency, sigma)
          response += grayscale[y * width + x] * gaborValue
        }
      }

      responses[i] = Math.abs(response) / (width * height)
    }

    return responses
  }

  private analyzeStructuralElements(pixels: Uint8Array, width: number, height: number, channels: number): StructureInfo[] {
    const grayscale = this.convertToGrayscale(pixels, width, height, channels)
    const structures: StructureInfo[] = []

    const gradientX = this.computeGradient(grayscale, width, height, true)
    const gradientY = this.computeGradient(grayscale, width, height, false)

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        const gx = gradientX[idx]
        const gy = gradientY[idx]
        
        const orientation = Math.atan2(gy, gx)
        const coherence = Math.sqrt(gx * gx + gy * gy)
        const energy = gx * gx + gy * gy

        if (energy > 100) {
          structures.push({
            orientation,
            coherence,
            energy
          })
        }
      }
    }

    return structures.slice(0, 100)
  }

  private computeColorDistribution(pixels: Uint8Array, width: number, height: number, channels: number): ColorStats {
    const rSum = { sum: 0, sumSq: 0 }
    const gSum = { sum: 0, sumSq: 0 }
    const bSum = { sum: 0, sumSq: 0 }
    
    const rHist = new Array(256).fill(0)
    const gHist = new Array(256).fill(0)
    const bHist = new Array(256).fill(0)

    const totalPixels = width * height

    for (let i = 0; i < totalPixels; i++) {
      const r = pixels[i * channels]
      const g = pixels[i * channels + 1]
      const b = pixels[i * channels + 2]

      rSum.sum += r
      gSum.sum += g
      bSum.sum += b

      rSum.sumSq += r * r
      gSum.sumSq += g * g
      bSum.sumSq += b * b

      rHist[r]++
      gHist[g]++
      bHist[b]++
    }

    const rMean = rSum.sum / totalPixels
    const gMean = gSum.sum / totalPixels
    const bMean = bSum.sum / totalPixels

    const rVar = (rSum.sumSq / totalPixels) - (rMean * rMean)
    const gVar = (gSum.sumSq / totalPixels) - (gMean * gMean)
    const bVar = (bSum.sumSq / totalPixels) - (bMean * bMean)

    return {
      mean: { r: rMean, g: gMean, b: bMean },
      variance: { r: rVar, g: gVar, b: bVar },
      histogram: { r: rHist, g: gHist, b: bHist }
    }
  }

  async generateTextureSynthesis(descriptor: TextureDescriptor): Promise<Buffer> {
    const synthesisWidth = 64
    const synthesisHeight = 64
    const channels = 3
    const synthesizedPixels = new Uint8Array(synthesisWidth * synthesisHeight * channels)

    for (let y = 0; y < synthesisHeight; y++) {
      for (let x = 0; x < synthesisWidth; x++) {
        const idx = (y * synthesisWidth + x) * channels

        const noiseR = Math.random() * 255
        const noiseG = Math.random() * 255
        const noiseB = Math.random() * 255

        const textureInfluence = this.getTextureInfluence(x, y, descriptor)
        
        synthesizedPixels[idx] = Math.floor(
          descriptor.colorDistribution.mean.r * (1 - textureInfluence) + noiseR * textureInfluence
        )
        synthesizedPixels[idx + 1] = Math.floor(
          descriptor.colorDistribution.mean.g * (1 - textureInfluence) + noiseG * textureInfluence
        )
        synthesizedPixels[idx + 2] = Math.floor(
          descriptor.colorDistribution.mean.b * (1 - textureInfluence) + noiseB * textureInfluence
        )
      }
    }

    return Buffer.from(synthesizedPixels)
  }

  private convertToGrayscale(pixels: Uint8Array, width: number, height: number, channels: number): Uint8Array {
    const grayscale = new Uint8Array(width * height)
    
    for (let i = 0; i < width * height; i++) {
      const r = pixels[i * channels]
      const g = pixels[i * channels + 1]
      const b = pixels[i * channels + 2]
      grayscale[i] = Math.floor(0.299 * r + 0.587 * g + 0.114 * b)
    }

    return grayscale
  }

  private computeDCT(pixels: Uint8Array, startX: number, startY: number, blockSize: number, width: number): Float32Array {
    const dctCoeffs = new Float32Array(blockSize * blockSize)
    
    for (let u = 0; u < blockSize; u++) {
      for (let v = 0; v < blockSize; v++) {
        let sum = 0
        
        for (let x = 0; x < blockSize; x++) {
          for (let y = 0; y < blockSize; y++) {
            const pixel = pixels[(startY + y) * width + (startX + x)]
            const cosU = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * blockSize))
            const cosV = Math.cos(((2 * y + 1) * v * Math.PI) / (2 * blockSize))
            sum += pixel * cosU * cosV
          }
        }
        
        const cu = u === 0 ? 1 / Math.sqrt(2) : 1
        const cv = v === 0 ? 1 / Math.sqrt(2) : 1
        dctCoeffs[u * blockSize + v] = (cu * cv * sum) / 4
      }
    }

    return dctCoeffs
  }

  private gaborKernel(x: number, y: number, theta: number, frequency: number, sigma: number): number {
    const xTheta = x * Math.cos(theta) + y * Math.sin(theta)
    const yTheta = -x * Math.sin(theta) + y * Math.cos(theta)
    
    const gaussian = Math.exp(-(xTheta * xTheta + yTheta * yTheta) / (2 * sigma * sigma))
    const sinusoid = Math.cos(2 * Math.PI * frequency * xTheta)
    
    return gaussian * sinusoid
  }

  private computeGradient(pixels: Uint8Array, width: number, height: number, horizontal: boolean): Float32Array {
    const gradient = new Float32Array(width * height)
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x
        
        if (horizontal) {
          gradient[idx] = pixels[idx + 1] - pixels[idx - 1]
        } else {
          gradient[idx] = pixels[(y + 1) * width + x] - pixels[(y - 1) * width + x]
        }
      }
    }

    return gradient
  }

  private getTextureInfluence(x: number, y: number, descriptor: TextureDescriptor): number {
    const freqIndex = Math.floor((x + y) % descriptor.dominantFrequencies.length)
    const normalizedFreq = descriptor.dominantFrequencies[freqIndex] / 255
    
    const lbpIndex = Math.floor((x * y) % descriptor.localBinaryPatterns.length)
    const normalizedLBP = descriptor.localBinaryPatterns[lbpIndex] / 255
    
    return (normalizedFreq + normalizedLBP) / 2
  }
}