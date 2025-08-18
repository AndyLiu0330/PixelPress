import sharp from 'sharp'
import { DirectionalSamples, Patch, Region, Direction, PATCH_SIZE, SAMPLE_DISTANCE } from '../../types/inpainting.js'

export class MultiDirectionalSampler {
  async sampleSurroundingContent(
    image: sharp.Sharp,
    region: Region,
    sampleRadius: number
  ): Promise<DirectionalSamples> {
    const metadata = await image.metadata()
    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to get image dimensions')
    }

    const imageBuffer = await image.raw().toBuffer({ resolveWithObject: true })
    const { data: pixels, info } = imageBuffer
    const { width, height, channels } = info

    const directions: Direction[] = [
      'north', 'northeast', 'east', 'southeast',
      'south', 'southwest', 'west', 'northwest'
    ]

    const samples: DirectionalSamples = {
      north: [],
      northeast: [],
      east: [],
      southeast: [],
      south: [],
      southwest: [],
      west: [],
      northwest: []
    }

    for (const direction of directions) {
      samples[direction] = await this.extractPatchesInDirection(
        pixels, width, height, channels, region, direction, sampleRadius
      )
    }

    return samples
  }

  async extractPatchesInDirection(
    pixels: Uint8Array,
    width: number,
    height: number,
    channels: number,
    region: Region,
    direction: Direction,
    sampleRadius: number
  ): Promise<Patch[]> {
    const patches: Patch[] = []
    const directionVector = this.getDirectionVector(direction)
    
    const centerX = region.x + region.width / 2
    const centerY = region.y + region.height / 2

    const numSamples = Math.floor(sampleRadius / SAMPLE_DISTANCE)
    
    for (let i = 1; i <= numSamples; i++) {
      const sampleDistance = i * SAMPLE_DISTANCE
      const sampleX = Math.floor(centerX + directionVector.x * sampleDistance)
      const sampleY = Math.floor(centerY + directionVector.y * sampleDistance)

      if (this.isValidSamplePosition(sampleX, sampleY, width, height)) {
        const patch = this.extractPatchAt(
          pixels, width, height, channels, sampleX, sampleY
        )
        
        if (patch) {
          patches.push(patch)
        }
      }

      for (let offset = -PATCH_SIZE; offset <= PATCH_SIZE; offset += PATCH_SIZE / 2) {
        const offsetX = Math.floor(sampleX + directionVector.y * offset)
        const offsetY = Math.floor(sampleY - directionVector.x * offset)

        if (this.isValidSamplePosition(offsetX, offsetY, width, height)) {
          const patch = this.extractPatchAt(
            pixels, width, height, channels, offsetX, offsetY
          )
          
          if (patch) {
            patches.push(patch)
          }
        }
      }
    }

    return patches.slice(0, 20)
  }

  computePatchSimilarity(patch1: Patch, patch2: Patch): number {
    if (patch1.pixels.length !== patch2.pixels.length) {
      return 0
    }

    let sumSquaredDiff = 0
    let sumPatch1 = 0
    let sumPatch2 = 0

    for (let i = 0; i < patch1.pixels.length; i++) {
      const diff = patch1.pixels[i] - patch2.pixels[i]
      sumSquaredDiff += diff * diff
      sumPatch1 += patch1.pixels[i] * patch1.pixels[i]
      sumPatch2 += patch2.pixels[i] * patch2.pixels[i]
    }

    const mse = sumSquaredDiff / patch1.pixels.length
    const maxValue = 255 * 255
    const psnr = 10 * Math.log10(maxValue / (mse + 1e-10))

    const normalizedCorrelation = this.computeNormalizedCorrelation(patch1, patch2)
    
    const similarity = (psnr / 100) * 0.7 + normalizedCorrelation * 0.3
    return Math.max(0, Math.min(1, similarity))
  }

  async weightAndBlendPatches(patches: Patch[], weights: number[]): Promise<Buffer> {
    if (patches.length === 0 || patches.length !== weights.length) {
      throw new Error('Invalid patches or weights')
    }

    const channels = 3
    const blendedPixels = new Float32Array(PATCH_SIZE * PATCH_SIZE * channels)
    let totalWeight = 0

    for (let i = 0; i < patches.length; i++) {
      const weight = weights[i]
      totalWeight += weight

      for (let j = 0; j < patches[i].pixels.length; j++) {
        blendedPixels[j] += patches[i].pixels[j] * weight
      }
    }

    if (totalWeight > 0) {
      for (let i = 0; i < blendedPixels.length; i++) {
        blendedPixels[i] /= totalWeight
      }
    }

    const resultPixels = new Uint8Array(blendedPixels.length)
    for (let i = 0; i < blendedPixels.length; i++) {
      resultPixels[i] = Math.floor(Math.max(0, Math.min(255, blendedPixels[i])))
    }

    return Buffer.from(resultPixels)
  }

  async selectBestPatches(
    patches: Patch[],
    referencePatch: Patch,
    maxPatches: number = 5
  ): Promise<{ patches: Patch[]; weights: number[] }> {
    const patchSimilarities = patches.map(patch => ({
      patch,
      similarity: this.computePatchSimilarity(patch, referencePatch)
    }))

    patchSimilarities.sort((a, b) => b.similarity - a.similarity)

    const selectedPatches = patchSimilarities
      .slice(0, maxPatches)
      .map(item => item.patch)

    const selectedSimilarities = patchSimilarities
      .slice(0, maxPatches)
      .map(item => item.similarity)

    const weights = this.computeAdaptiveWeights(selectedSimilarities)

    return { patches: selectedPatches, weights }
  }

  private getDirectionVector(direction: Direction): { x: number; y: number } {
    const vectors: Record<Direction, { x: number; y: number }> = {
      north: { x: 0, y: -1 },
      northeast: { x: 0.707, y: -0.707 },
      east: { x: 1, y: 0 },
      southeast: { x: 0.707, y: 0.707 },
      south: { x: 0, y: 1 },
      southwest: { x: -0.707, y: 0.707 },
      west: { x: -1, y: 0 },
      northwest: { x: -0.707, y: -0.707 }
    }

    return vectors[direction]
  }

  private isValidSamplePosition(x: number, y: number, width: number, height: number): boolean {
    return x >= PATCH_SIZE && x < width - PATCH_SIZE &&
           y >= PATCH_SIZE && y < height - PATCH_SIZE
  }

  private extractPatchAt(
    pixels: Uint8Array,
    width: number,
    height: number,
    channels: number,
    centerX: number,
    centerY: number
  ): Patch | null {
    const halfPatch = Math.floor(PATCH_SIZE / 2)
    const startX = centerX - halfPatch
    const startY = centerY - halfPatch

    if (startX < 0 || startY < 0 || 
        startX + PATCH_SIZE >= width || startY + PATCH_SIZE >= height) {
      return null
    }

    const patchPixels = new Uint8Array(PATCH_SIZE * PATCH_SIZE * channels)
    let patchIndex = 0

    for (let y = startY; y < startY + PATCH_SIZE; y++) {
      for (let x = startX; x < startX + PATCH_SIZE; x++) {
        const imageIndex = (y * width + x) * channels
        
        for (let c = 0; c < channels; c++) {
          patchPixels[patchIndex++] = pixels[imageIndex + c]
        }
      }
    }

    return {
      pixels: patchPixels,
      position: { x: startX, y: startY },
      size: { width: PATCH_SIZE, height: PATCH_SIZE },
      similarity: 0
    }
  }

  private computeNormalizedCorrelation(patch1: Patch, patch2: Patch): number {
    let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, sumProduct = 0
    const n = patch1.pixels.length

    for (let i = 0; i < n; i++) {
      const p1 = patch1.pixels[i]
      const p2 = patch2.pixels[i]
      
      sum1 += p1
      sum2 += p2
      sum1Sq += p1 * p1
      sum2Sq += p2 * p2
      sumProduct += p1 * p2
    }

    const mean1 = sum1 / n
    const mean2 = sum2 / n

    const numerator = sumProduct - n * mean1 * mean2
    const denominator = Math.sqrt((sum1Sq - n * mean1 * mean1) * (sum2Sq - n * mean2 * mean2))

    if (denominator === 0) return 0
    return Math.abs(numerator / denominator)
  }

  private computeAdaptiveWeights(similarities: number[]): number[] {
    const maxSimilarity = Math.max(...similarities)
    const minSimilarity = Math.min(...similarities)
    const range = maxSimilarity - minSimilarity

    if (range === 0) {
      return similarities.map(() => 1 / similarities.length)
    }

    const normalizedSimilarities = similarities.map(sim => 
      (sim - minSimilarity) / range
    )

    const exponentialWeights = normalizedSimilarities.map(sim => 
      Math.exp(sim * 3)
    )

    const totalWeight = exponentialWeights.reduce((sum, weight) => sum + weight, 0)

    return exponentialWeights.map(weight => weight / totalWeight)
  }

  async createReferencePatch(region: Region, direction: Direction): Promise<Patch> {
    const directionVector = this.getDirectionVector(direction)
    const referenceX = region.x + region.width / 2 + directionVector.x * 10
    const referenceY = region.y + region.height / 2 + directionVector.y * 10

    const referencePatch: Patch = {
      pixels: new Uint8Array(PATCH_SIZE * PATCH_SIZE * 3),
      position: { x: referenceX, y: referenceY },
      size: { width: PATCH_SIZE, height: PATCH_SIZE },
      similarity: 1.0
    }

    for (let i = 0; i < referencePatch.pixels.length; i++) {
      referencePatch.pixels[i] = 128
    }

    return referencePatch
  }
}