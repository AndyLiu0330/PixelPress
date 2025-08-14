export interface ImageProcessingOptions {
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
}

export interface ProcessedImage {
  id: string;
  originalName: string;
  originalSize: number;
  processedSize: number;
  format: string;
  url: string;
  createdAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
}

export interface ApiError {
  error: boolean;
  message: string;
  code: string;
  statusCode: number;
}

export interface UploadResponse {
  id: string;
  filename: string;
  originalSize: number;
  mimeType: string;
}