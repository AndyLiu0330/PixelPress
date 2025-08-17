export interface InpaintingOptions {
  featherRadius: number
  samplingRadius: number
  textureAnalysisDepth: number
  noiseMatching: boolean
  edgePreservation: boolean
  qualityLevel: 'fast' | 'balanced' | 'high'
}

export interface WatermarkArea {
  x: number
  y: number
  width: number
  height: number
}

export interface Region {
  x: number
  y: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

export interface ColorStats {
  mean: { r: number; g: number; b: number }
  variance: { r: number; g: number; b: number }
  histogram: { r: number[]; g: number[]; b: number[] }
}

export interface StructureInfo {
  orientation: number
  coherence: number
  energy: number
}

export interface TextureDescriptor {
  dominantFrequencies: Float32Array
  localBinaryPatterns: Uint8Array
  gaborResponses: Float32Array
  structuralElements: StructureInfo[]
  colorDistribution: ColorStats
}

export interface Patch {
  pixels: Uint8Array
  position: { x: number; y: number }
  size: Size
  similarity: number
}

export interface DirectionalSamples {
  north: Patch[]
  northeast: Patch[]
  east: Patch[]
  southeast: Patch[]
  south: Patch[]
  southwest: Patch[]
  west: Patch[]
  northwest: Patch[]
}

export interface NoiseProfile {
  powerSpectrum: Float32Array
  grainSize: number
  correlationLength: number
  colorNoise: { r: number; g: number; b: number }
}

export interface ContextAnalysis {
  textureComplexity: number
  edgeStrength: number
  colorVariation: number
  patternRepetition: number
  recommendedMethod: InpaintingMethod
}

export interface ProcessingResult {
  buffer: Buffer
  size: number
  qualityMetrics: QualityMetrics
  duration: number
}

export interface QualityMetrics {
  psnr: number
  ssim: number
  visualQuality: number
  artifactLevel: number
}

export interface ProcessingLayers {
  textureLayer: Buffer
  noiseLayer: Buffer
  edgeLayer: Buffer
}

export interface EdgeMap {
  gradientX: Float32Array
  gradientY: Float32Array
  magnitude: Float32Array
  direction: Float32Array
}

export type InpaintingMethod = 'basic' | 'texture-synthesis' | 'patch-based' | 'hybrid'
export type InterpolationMethod = 'bicubic' | 'lanczos' | 'edge-directed' | 'anisotropic'
export type Direction = 'north' | 'northeast' | 'east' | 'southeast' | 'south' | 'southwest' | 'west' | 'northwest'

export interface BlendingLayers {
  base: Buffer
  detail: Buffer
  noise: Buffer
}

export const ANALYSIS_RADIUS = 50
export const DEFAULT_FEATHER_RADIUS = 20
export const PATCH_SIZE = 16
export const SAMPLE_DISTANCE = 8

export const HIGH_PERFORMANCE_OPTIONS: InpaintingOptions = {
  featherRadius: 15,
  samplingRadius: 30,
  textureAnalysisDepth: 2,
  noiseMatching: false,
  edgePreservation: true,
  qualityLevel: 'fast'
}

export const BALANCED_OPTIONS: InpaintingOptions = {
  featherRadius: 20,
  samplingRadius: 40,
  textureAnalysisDepth: 3,
  noiseMatching: true,
  edgePreservation: true,
  qualityLevel: 'balanced'
}

export const HIGH_QUALITY_OPTIONS: InpaintingOptions = {
  featherRadius: 25,
  samplingRadius: 60,
  textureAnalysisDepth: 4,
  noiseMatching: true,
  edgePreservation: true,
  qualityLevel: 'high'
}