import sharp from 'sharp'
import { Region, Size } from '../types/inpainting.js'

export class EdgeFeatherer {
  async createFeatherMask(
    region: Region,
    imageSize: Size,
    featherRadius: number
  ): Promise<Buffer> {
    const maskWidth = imageSize.width
    const maskHeight = imageSize.height
    const maskPixels = new Uint8Array(maskWidth * maskHeight)

    for (let y = 0; y < maskHeight; y++) {
      for (let x = 0; x < maskWidth; x++) {
        const idx = y * maskWidth + x
        
        if (this.isInsideRegion(x, y, region)) {
          const distanceToEdge = this.distanceToRegionEdge(x, y, region)
          const falloff = this.generateGaussianFalloff(distanceToEdge, featherRadius)
          maskPixels[idx] = Math.floor(falloff * 255)
        } else {
          const distanceToRegion = this.distanceToRegion(x, y, region)
          if (distanceToRegion <= featherRadius) {
            const falloff = this.generateGaussianFalloff(featherRadius - distanceToRegion, featherRadius)
            maskPixels[idx] = Math.floor((1 - falloff) * 255)
          } else {
            maskPixels[idx] = 0
          }
        }
      }
    }

    return Buffer.from(maskPixels)
  }

  generateGaussianFalloff(distance: number, sigma: number): number {
    const normalizedDistance = distance / sigma
    return Math.exp(-(normalizedDistance * normalizedDistance) / 2)
  }

  async applyBilateralFiltering(mask: Buffer): Promise<Buffer> {
    const width = Math.sqrt(mask.length)
    const height = width
    const filteredMask = new Uint8Array(mask.length)
    
    const spatialSigma = 5
    const intensitySigma = 50
    const kernelSize = 9
    const halfKernel = Math.floor(kernelSize / 2)

    for (let y = halfKernel; y < height - halfKernel; y++) {
      for (let x = halfKernel; x < width - halfKernel; x++) {
        const centerIdx = y * width + x
        const centerIntensity = mask[centerIdx]
        
        let weightSum = 0
        let valueSum = 0

        for (let ky = -halfKernel; ky <= halfKernel; ky++) {
          for (let kx = -halfKernel; kx <= halfKernel; kx++) {
            const neighborX = x + kx
            const neighborY = y + ky
            const neighborIdx = neighborY * width + neighborX
            const neighborIntensity = mask[neighborIdx]

            const spatialDistance = Math.sqrt(kx * kx + ky * ky)
            const intensityDistance = Math.abs(centerIntensity - neighborIntensity)

            const spatialWeight = Math.exp(-(spatialDistance * spatialDistance) / (2 * spatialSigma * spatialSigma))
            const intensityWeight = Math.exp(-(intensityDistance * intensityDistance) / (2 * intensitySigma * intensitySigma))
            
            const weight = spatialWeight * intensityWeight
            weightSum += weight
            valueSum += weight * neighborIntensity
          }
        }

        filteredMask[centerIdx] = Math.floor(valueSum / weightSum)
      }
    }

    for (let i = 0; i < mask.length; i++) {
      if (filteredMask[i] === 0) {
        filteredMask[i] = mask[i]
      }
    }

    return Buffer.from(filteredMask)
  }

  async createAdaptiveFeathering(image: sharp.Sharp, region: Region): Promise<Buffer> {
    const metadata = await image.metadata()
    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to get image dimensions')
    }

    const imageSize = { width: metadata.width, height: metadata.height }
    
    const edgeMap = await this.detectEdges(image, region)
    const adaptiveRadius = this.calculateAdaptiveRadius(edgeMap, region)
    
    let featherMask = await this.createFeatherMask(region, imageSize, adaptiveRadius)
    featherMask = await this.applyBilateralFiltering(featherMask)
    featherMask = await this.applyEdgeAwareSmoothing(featherMask, edgeMap, imageSize)

    return featherMask
  }

  private async detectEdges(image: sharp.Sharp, region: Region): Promise<Buffer> {
    const expandedRegion = {
      x: Math.max(0, region.x - 50),
      y: Math.max(0, region.y - 50),
      width: region.width + 100,
      height: region.height + 100
    }

    const edgeBuffer = await image
      .extract({ left: expandedRegion.x, top: expandedRegion.y, width: expandedRegion.width, height: expandedRegion.height })
      .greyscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
      })
      .raw()
      .toBuffer()

    return edgeBuffer
  }

  private calculateAdaptiveRadius(edgeMap: Buffer, _region: Region): number {
    let edgeStrength = 0
    const sampleCount = Math.min(edgeMap.length, 1000)
    
    for (let i = 0; i < sampleCount; i += 10) {
      edgeStrength += edgeMap[i]
    }
    
    edgeStrength /= (sampleCount / 10)
    const normalizedEdgeStrength = edgeStrength / 255

    const baseRadius = 20
    const adaptiveComponent = normalizedEdgeStrength * 15
    return Math.max(10, Math.min(35, baseRadius + adaptiveComponent))
  }

  private async applyEdgeAwareSmoothing(
    mask: Buffer,
    edgeMap: Buffer,
    imageSize: Size
  ): Promise<Buffer> {
    const smoothedMask = new Uint8Array(mask.length)
    const kernelSize = 5
    const halfKernel = Math.floor(kernelSize / 2)

    for (let y = halfKernel; y < imageSize.height - halfKernel; y++) {
      for (let x = halfKernel; x < imageSize.width - halfKernel; x++) {
        const centerIdx = y * imageSize.width + x
        
        if (this.isNearEdge(x, y, edgeMap, imageSize)) {
          smoothedMask[centerIdx] = mask[centerIdx]
          continue
        }

        let sum = 0
        let count = 0

        for (let ky = -halfKernel; ky <= halfKernel; ky++) {
          for (let kx = -halfKernel; kx <= halfKernel; kx++) {
            const neighborX = x + kx
            const neighborY = y + ky
            
            if (neighborX >= 0 && neighborX < imageSize.width && 
                neighborY >= 0 && neighborY < imageSize.height) {
              const neighborIdx = neighborY * imageSize.width + neighborX
              sum += mask[neighborIdx]
              count++
            }
          }
        }

        smoothedMask[centerIdx] = Math.floor(sum / count)
      }
    }

    for (let i = 0; i < mask.length; i++) {
      if (smoothedMask[i] === 0) {
        smoothedMask[i] = mask[i]
      }
    }

    return Buffer.from(smoothedMask)
  }

  private isInsideRegion(x: number, y: number, region: Region): boolean {
    return x >= region.x && x < region.x + region.width &&
           y >= region.y && y < region.y + region.height
  }

  private distanceToRegionEdge(x: number, y: number, region: Region): number {
    const distToLeft = x - region.x
    const distToRight = (region.x + region.width) - x
    const distToTop = y - region.y
    const distToBottom = (region.y + region.height) - y

    return Math.min(distToLeft, distToRight, distToTop, distToBottom)
  }

  private distanceToRegion(x: number, y: number, region: Region): number {
    const dx = Math.max(0, Math.max(region.x - x, x - (region.x + region.width)))
    const dy = Math.max(0, Math.max(region.y - y, y - (region.y + region.height)))
    return Math.sqrt(dx * dx + dy * dy)
  }

  private isNearEdge(x: number, y: number, edgeMap: Buffer, imageSize: Size): boolean {
    const threshold = 100
    const checkRadius = 2

    for (let dy = -checkRadius; dy <= checkRadius; dy++) {
      for (let dx = -checkRadius; dx <= checkRadius; dx++) {
        const checkX = x + dx
        const checkY = y + dy
        
        if (checkX >= 0 && checkX < imageSize.width && 
            checkY >= 0 && checkY < imageSize.height) {
          const idx = checkY * imageSize.width + checkX
          if (idx < edgeMap.length && edgeMap[idx] > threshold) {
            return true
          }
        }
      }
    }

    return false
  }

  async createGradientMask(region: Region, imageSize: Size, direction: 'horizontal' | 'vertical'): Promise<Buffer> {
    const maskPixels = new Uint8Array(imageSize.width * imageSize.height)

    for (let y = 0; y < imageSize.height; y++) {
      for (let x = 0; x < imageSize.width; x++) {
        const idx = y * imageSize.width + x

        if (this.isInsideRegion(x, y, region)) {
          let gradientValue: number

          if (direction === 'horizontal') {
            const relativeX = (x - region.x) / region.width
            gradientValue = relativeX
          } else {
            const relativeY = (y - region.y) / region.height
            gradientValue = relativeY
          }

          maskPixels[idx] = Math.floor(gradientValue * 255)
        } else {
          maskPixels[idx] = 0
        }
      }
    }

    return Buffer.from(maskPixels)
  }
}