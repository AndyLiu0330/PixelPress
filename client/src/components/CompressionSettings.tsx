import { useState } from 'react'
import axios from 'axios'

interface CompressionSettingsProps {
  image: File
  onProcessed: (data: { url: string; processedSize: number; format: string }) => void
}

export function CompressionSettings({ image, onProcessed }: CompressionSettingsProps) {
  const [quality, setQuality] = useState(80)
  const [format, setFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleCompress = async () => {
    setIsProcessing(true)
    
    try {
      const formData = new FormData()
      formData.append('image', image)
      
      const uploadResponse = await axios.post('/api/upload', formData)
      const { id } = uploadResponse.data.data

      const compressResponse = await axios.post('/api/compress', {
        imageId: id,
        quality,
        format
      })

      onProcessed(compressResponse.data.data)
    } catch (error) {
      console.error('Error processing image:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Compression Settings</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Quality: {quality}%
          </label>
          <input
            type="range"
            min="10"
            max="100"
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full accent-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Output Format
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as 'jpeg' | 'png' | 'webp')}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="jpeg" className="text-gray-900">JPEG</option>
            <option value="png" className="text-gray-900">PNG</option>
            <option value="webp" className="text-gray-900">WebP</option>
          </select>
        </div>

        <button
          onClick={handleCompress}
          disabled={isProcessing}
          className="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:bg-gray-400"
        >
          {isProcessing ? 'Processing...' : 'Compress Image'}
        </button>
      </div>
    </div>
  )
}