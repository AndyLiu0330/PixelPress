import { useEffect, useState } from 'react'
import { Download, FileImage, TrendingDown, Maximize2 } from 'lucide-react'

interface ImagePreviewProps {
  originalImage: File | null
  processedImageUrl: string | null
  processedData?: { url: string; processedSize: number; format: string } | null
}

export function ImagePreview({ originalImage, processedImageUrl, processedData }: ImagePreviewProps) {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [showComparison, setShowComparison] = useState(false)

  useEffect(() => {
    if (originalImage) {
      const url = URL.createObjectURL(originalImage)
      setOriginalUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [originalImage])

  if (!originalUrl && !processedImageUrl) return null

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const compressionRate = originalImage && processedData ? 
    Math.round((1 - processedData.processedSize / originalImage.size) * 100) : 0

  return (
    <div className="relative group">
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary-500/20 to-accent-600/20 rounded-2xl blur-lg opacity-20 group-hover:opacity-30 transition duration-300"></div>
      
      <div className="relative glass rounded-2xl p-6 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <FileImage className="w-5 h-5 text-primary-400" />
            Image Preview
          </h2>
          
          {processedImageUrl && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowComparison(!showComparison)}
                className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
                aria-label="Toggle comparison view"
              >
                <Maximize2 className="w-4 h-4 text-gray-300" />
              </button>
              <a
                href={processedImageUrl}
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg text-sm font-medium hover:from-primary-600 hover:to-primary-700 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/25"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
            </div>
          )}
        </div>

        {/* Stats cards */}
        {processedData && originalImage && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="glass rounded-lg p-3 border-green-500/20">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-green-400" />
                <span className="text-xs text-gray-400">Compression</span>
              </div>
              <p className="text-lg font-bold text-green-400">{compressionRate}%</p>
            </div>
            
            <div className="glass rounded-lg p-3 border-blue-500/20">
              <div className="flex items-center gap-2 mb-1">
                <FileImage className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-400">New Size</span>
              </div>
              <p className="text-lg font-bold text-blue-400">
                {formatFileSize(processedData.processedSize)}
              </p>
            </div>
          </div>
        )}

        {/* Image display */}
        <div className={`space-y-4 ${showComparison ? 'lg:flex lg:gap-4 lg:space-y-0' : ''}`}>
          {originalUrl && (
            <div className={showComparison ? 'lg:flex-1' : ''}>
              <div className="relative overflow-hidden rounded-xl group/image">
                <div className="absolute top-2 left-2 z-10">
                  <span className="px-3 py-1 text-xs font-medium glass rounded-full text-white/90 backdrop-blur-md">
                    Original
                  </span>
                </div>
                <img 
                  src={originalUrl} 
                  alt="Original" 
                  className="w-full rounded-xl shadow-xl transition-transform duration-300 group-hover/image:scale-105"
                />
                {originalImage && (
                  <div className="absolute bottom-2 right-2 z-10">
                    <span className="px-3 py-1 text-xs glass rounded-full text-white/70 backdrop-blur-md">
                      {formatFileSize(originalImage.size)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {processedImageUrl && (
            <div className={showComparison ? 'lg:flex-1' : 'mt-4'}>
              <div className="relative overflow-hidden rounded-xl group/image">
                <div className="absolute top-2 left-2 z-10">
                  <span className="px-3 py-1 text-xs font-medium glass rounded-full text-white/90 backdrop-blur-md bg-gradient-to-r from-primary-500/30 to-accent-500/30">
                    Processed
                  </span>
                </div>
                <img 
                  src={processedImageUrl} 
                  alt="Processed" 
                  className="w-full rounded-xl shadow-xl transition-transform duration-300 group-hover/image:scale-105"
                />
                {processedData && (
                  <div className="absolute bottom-2 right-2 z-10">
                    <span className="px-3 py-1 text-xs glass rounded-full text-white/70 backdrop-blur-md">
                      {formatFileSize(processedData.processedSize)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Progress indicator for processing */}
        {!processedImageUrl && originalUrl && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-400 mb-2">Ready for processing</p>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full animate-shimmer bg-[length:200%_100%]"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}