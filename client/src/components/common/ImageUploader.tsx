import { useCallback, useState } from 'react'
import { Upload, Image, Sparkles } from 'lucide-react'

interface ImageUploaderProps {
  onImageUpload: (file: File) => void
}

export function ImageUploader({ onImageUpload }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true)
    } else if (e.type === 'dragleave') {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      onImageUpload(files[0])
      setUploadedFileName(files[0].name)
    }
  }, [onImageUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onImageUpload(files[0])
      setUploadedFileName(files[0].name)
    }
  }, [onImageUpload])

  return (
    <div className="relative group">
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 to-accent-600 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition duration-300"></div>
      
      <div
        className={`relative glass rounded-2xl p-8 transition-all duration-300 ${
          isDragging 
            ? 'scale-105 border-2 border-primary-400 bg-primary-500/10' 
            : 'hover:border-white/30'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="text-center">
          {/* Icon container with animation */}
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary-500/20 to-accent-500/20 flex items-center justify-center">
              {uploadedFileName ? (
                <Image className="w-10 h-10 text-primary-400 animate-pulse-slow" />
              ) : (
                <Upload className="w-10 h-10 text-primary-400 animate-float" />
              )}
            </div>
            {isDragging && (
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-accent-400 animate-pulse" />
            )}
          </div>

          {/* Upload text */}
          <h3 className="text-xl font-semibold text-white mb-2">
            {uploadedFileName ? 'Image Uploaded!' : 'Drop your image here'}
          </h3>
          
          {uploadedFileName ? (
            <p className="text-sm text-primary-300 mb-6 font-medium truncate max-w-xs mx-auto">
              {uploadedFileName}
            </p>
          ) : (
            <p className="text-sm text-gray-400 mb-6">
              or click to browse from your device
            </p>
          )}

          {/* Browse button */}
          <label className="inline-block cursor-pointer group/button">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Select image file"
            />
            <span className="relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium transition-all duration-300 hover:from-primary-600 hover:to-primary-700 hover:shadow-lg hover:shadow-primary-500/25 hover:-translate-y-0.5">
              <Upload className="w-4 h-4" />
              {uploadedFileName ? 'Choose Another' : 'Browse Files'}
            </span>
          </label>

          {/* Supported formats */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {['JPEG', 'PNG', 'WebP', 'GIF', 'BMP', 'TIFF'].map((format) => (
              <span
                key={format}
                className="px-2 py-1 text-xs rounded-full glass text-gray-300 border-white/10"
              >
                {format}
              </span>
            ))}
          </div>
          
          <p className="text-xs text-gray-500 mt-3">
            Maximum file size: 50MB
          </p>
        </div>

        {/* Animated border gradient on hover */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 rounded-2xl animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:200%_100%]"></div>
        </div>
      </div>
    </div>
  )
}