import { Region, EdgeMap, InterpolationMethod } from '../../types/inpainting.js'

export class AdvancedInterpolator {
  async interpolateWithEdgePreservation(
    sourceRegions: Buffer[],
    targetRegion: Region,
    method: InterpolationMethod
  ): Promise<Buffer> {
    if (sourceRegions.length === 0) {
      throw new Error('No source regions provided for interpolation')
    }

    switch (method) {
      case 'bicubic':
        return this.bicubicInterpolation(sourceRegions, targetRegion)
      case 'lanczos':
        return this.lanczosInterpolation(sourceRegions, targetRegion)
      case 'edge-directed':
        return this.edgeDirectedInterpolation(sourceRegions, targetRegion)
      case 'anisotropic':
        return this.anisotropicDiffusionInterpolation(sourceRegions, targetRegion)
      default:
        return this.bicubicInterpolation(sourceRegions, targetRegion)
    }
  }

  async bicubicInterpolation(sourceRegions: Buffer[], targetRegion: Region): Promise<Buffer> {
    const { width, height } = targetRegion
    const channels = 3
    const result = new Uint8Array(width * height * channels)

    if (sourceRegions.length === 0) {
      result.fill(128)
      return Buffer.from(result)
    }

    const sourceData = sourceRegions[0]
    const sourceWidth = Math.sqrt(sourceData.length / channels)
    const sourceHeight = sourceWidth

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcX = (x / width) * sourceWidth
        const srcY = (y / height) * sourceHeight

        for (let c = 0; c < channels; c++) {
          const interpolatedValue = this.cubicInterpolate(sourceData, srcX, srcY, sourceWidth, sourceHeight, c, channels)
          const targetIdx = (y * width + x) * channels + c
          result[targetIdx] = Math.floor(Math.max(0, Math.min(255, interpolatedValue)))
        }
      }
    }

    return Buffer.from(result)
  }

  async lanczosInterpolation(sourceRegions: Buffer[], targetRegion: Region): Promise<Buffer> {
    const { width, height } = targetRegion
    const channels = 3
    const result = new Uint8Array(width * height * channels)
    const lanczosRadius = 3

    if (sourceRegions.length === 0) {
      result.fill(128)
      return Buffer.from(result)
    }

    const sourceData = sourceRegions[0]
    const sourceWidth = Math.sqrt(sourceData.length / channels)
    const sourceHeight = sourceWidth

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcX = (x / width) * sourceWidth
        const srcY = (y / height) * sourceHeight

        for (let c = 0; c < channels; c++) {
          let sum = 0
          let weightSum = 0

          for (let ky = -lanczosRadius; ky <= lanczosRadius; ky++) {
            for (let kx = -lanczosRadius; kx <= lanczosRadius; kx++) {
              const sampleX = Math.floor(srcX) + kx
              const sampleY = Math.floor(srcY) + ky

              if (sampleX >= 0 && sampleX < sourceWidth && 
                  sampleY >= 0 && sampleY < sourceHeight) {
                const weight = this.lanczosKernel(srcX - sampleX) * this.lanczosKernel(srcY - sampleY)
                const sampleIdx = (sampleY * sourceWidth + sampleX) * channels + c
                
                sum += sourceData[sampleIdx] * weight
                weightSum += weight
              }
            }
          }

          const targetIdx = (y * width + x) * channels + c
          result[targetIdx] = weightSum > 0 ? 
            Math.floor(Math.max(0, Math.min(255, sum / weightSum))) : 128
        }
      }
    }

    return Buffer.from(result)
  }

  async edgeDirectedInterpolation(sourceRegions: Buffer[], targetRegion: Region): Promise<Buffer> {
    const { width, height } = targetRegion
    const channels = 3
    const result = new Uint8Array(width * height * channels)

    if (sourceRegions.length === 0) {
      result.fill(128)
      return Buffer.from(result)
    }

    const sourceData = sourceRegions[0]
    const sourceWidth = Math.sqrt(sourceData.length / channels)
    const sourceHeight = sourceWidth

    const edgeMap = this.computeEdgeMap(sourceData, sourceWidth, sourceHeight, channels)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcX = (x / width) * sourceWidth
        const srcY = (y / height) * sourceHeight

        const edgeDirection = this.getEdgeDirection(edgeMap, srcX, srcY, sourceWidth, sourceHeight)
        
        for (let c = 0; c < channels; c++) {
          const interpolatedValue = this.interpolateAlongEdge(
            sourceData, srcX, srcY, sourceWidth, sourceHeight, c, channels, edgeDirection
          )
          const targetIdx = (y * width + x) * channels + c
          result[targetIdx] = Math.floor(Math.max(0, Math.min(255, interpolatedValue)))
        }
      }
    }

    return Buffer.from(result)
  }

  async anisotropicDiffusionInterpolation(sourceRegions: Buffer[], targetRegion: Region): Promise<Buffer> {
    let result = await this.bicubicInterpolation(sourceRegions, targetRegion)
    
    const iterations = 10
    const kappa = 30
    const gamma = 0.1

    for (let iter = 0; iter < iterations; iter++) {
      result = await this.applyAnisotropicDiffusion(result, targetRegion.width, targetRegion.height, kappa, gamma)
    }

    return result
  }

  async applyAnisotropicDiffusion(buffer: Buffer, width: number, height: number, kappa: number = 30, gamma: number = 0.1): Promise<Buffer> {
    const channels = 3
    const data = new Float32Array(buffer)
    const result = new Float32Array(data.length)

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < channels; c++) {
          const centerIdx = (y * width + x) * channels + c
          const centerValue = data[centerIdx]

          const neighbors = [
            data[((y-1) * width + x) * channels + c],
            data[((y+1) * width + x) * channels + c],
            data[(y * width + (x-1)) * channels + c],
            data[(y * width + (x+1)) * channels + c]
          ]

          let diffusionSum = 0

          for (const neighbor of neighbors) {
            const gradient = neighbor - centerValue
            const conductance = Math.exp(-(gradient * gradient) / (kappa * kappa))
            diffusionSum += conductance * gradient
          }

          result[centerIdx] = centerValue + gamma * diffusionSum
        }
      }
    }

    for (let i = 0; i < data.length; i++) {
      if (result[i] === 0) {
        result[i] = data[i]
      }
    }

    const resultBytes = new Uint8Array(result.length)
    for (let i = 0; i < result.length; i++) {
      resultBytes[i] = Math.floor(Math.max(0, Math.min(255, result[i])))
    }

    return Buffer.from(resultBytes)
  }

  private cubicInterpolate(
    data: Buffer, 
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    channel: number, 
    channels: number
  ): number {
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const dx = x - x0
    const dy = y - y0

    const values = new Array(16)
    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < 4; i++) {
        const sampleX = Math.max(0, Math.min(width - 1, x0 - 1 + i))
        const sampleY = Math.max(0, Math.min(height - 1, y0 - 1 + j))
        const idx = (sampleY * width + sampleX) * channels + channel
        values[j * 4 + i] = data[idx]
      }
    }

    const interpolatedRows = []
    for (let j = 0; j < 4; j++) {
      const rowValues = values.slice(j * 4, (j + 1) * 4)
      interpolatedRows.push(this.cubic1D(rowValues, dx))
    }

    return this.cubic1D(interpolatedRows, dy)
  }

  private cubic1D(values: number[], t: number): number {
    const [v0, v1, v2, v3] = values
    const a = -0.5 * v0 + 1.5 * v1 - 1.5 * v2 + 0.5 * v3
    const b = v0 - 2.5 * v1 + 2 * v2 - 0.5 * v3
    const c = -0.5 * v0 + 0.5 * v2
    const d = v1

    return a * t * t * t + b * t * t + c * t + d
  }

  private lanczosKernel(x: number): number {
    const a = 3
    if (x === 0) return 1
    if (Math.abs(x) >= a) return 0
    
    const piX = Math.PI * x
    return (a * Math.sin(piX) * Math.sin(piX / a)) / (piX * piX)
  }

  private computeEdgeMap(data: Buffer, width: number, height: number, channels: number): EdgeMap {
    const gradientX = new Float32Array(width * height)
    const gradientY = new Float32Array(width * height)
    const magnitude = new Float32Array(width * height)
    const direction = new Float32Array(width * height)

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x

        let gx = 0, gy = 0
        for (let c = 0; c < channels; c++) {
          const leftIdx = (y * width + (x - 1)) * channels + c
          const rightIdx = (y * width + (x + 1)) * channels + c
          const topIdx = ((y - 1) * width + x) * channels + c
          const bottomIdx = ((y + 1) * width + x) * channels + c

          gx += data[rightIdx] - data[leftIdx]
          gy += data[bottomIdx] - data[topIdx]
        }

        gx /= channels
        gy /= channels

        gradientX[idx] = gx
        gradientY[idx] = gy
        magnitude[idx] = Math.sqrt(gx * gx + gy * gy)
        direction[idx] = Math.atan2(gy, gx)
      }
    }

    return { gradientX, gradientY, magnitude, direction }
  }

  private getEdgeDirection(edgeMap: EdgeMap, x: number, y: number, width: number, height: number): number {
    const ix = Math.floor(Math.max(0, Math.min(width - 1, x)))
    const iy = Math.floor(Math.max(0, Math.min(height - 1, y)))
    const idx = iy * width + ix

    return edgeMap.direction[idx]
  }

  private interpolateAlongEdge(
    data: Buffer,
    x: number,
    y: number,
    width: number,
    height: number,
    channel: number,
    channels: number,
    edgeDirection: number
  ): number {
    const stepSize = 0.5
    const dx = Math.cos(edgeDirection) * stepSize
    const dy = Math.sin(edgeDirection) * stepSize

    let sum = 0
    let count = 0

    for (let i = -2; i <= 2; i++) {
      const sampleX = x + i * dx
      const sampleY = y + i * dy

      if (sampleX >= 0 && sampleX < width && sampleY >= 0 && sampleY < height) {
        const ix = Math.floor(sampleX)
        const iy = Math.floor(sampleY)
        const idx = (iy * width + ix) * channels + channel

        sum += data[idx]
        count++
      }
    }

    return count > 0 ? sum / count : 128
  }

  async createSmoothTransition(
    fromBuffer: Buffer,
    toBuffer: Buffer,
    maskBuffer: Buffer,
    width: number,
    height: number
  ): Promise<Buffer> {
    const channels = 3
    const result = new Uint8Array(width * height * channels)

    for (let i = 0; i < width * height; i++) {
      const maskValue = maskBuffer[i] / 255
      
      for (let c = 0; c < channels; c++) {
        const idx = i * channels + c
        const fromValue = fromBuffer[idx]
        const toValue = toBuffer[idx]
        
        result[idx] = Math.floor(fromValue * (1 - maskValue) + toValue * maskValue)
      }
    }

    return Buffer.from(result)
  }
}