import { useState, useRef, useCallback } from 'react'
import axios from 'axios'

interface WatermarkRemovalProps {
  image: File
  onProcessed: (data: { url: string; processedSize: number; format: string }) => void
}

interface WatermarkArea {
  x: number
  y: number
  width: number
  height: number
}

export function WatermarkRemoval({ image, onProcessed }: WatermarkRemovalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [watermarkArea, setWatermarkArea] = useState<WatermarkArea | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const handleImageLoad = useCallback(() => {
    if (canvasRef.current && imageRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')!
      const img = imageRef.current

      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)
    }
  }, [])

  const getCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    }
  }

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting) return
    
    const coords = getCanvasCoordinates(event)
    setStartPoint(coords)
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !startPoint || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const coords = getCanvasCoordinates(event)

    // Clear canvas and redraw image
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (imageRef.current) {
      ctx.drawImage(imageRef.current, 0, 0)
    }

    // Draw selection rectangle
    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.strokeRect(
      startPoint.x,
      startPoint.y,
      coords.x - startPoint.x,
      coords.y - startPoint.y
    )
  }

  const handleMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !startPoint) return

    const coords = getCanvasCoordinates(event)
    const area: WatermarkArea = {
      x: Math.min(startPoint.x, coords.x),
      y: Math.min(startPoint.y, coords.y),
      width: Math.abs(coords.x - startPoint.x),
      height: Math.abs(coords.y - startPoint.y)
    }

    setWatermarkArea(area)
    setIsSelecting(false)
    setStartPoint(null)
  }

  const startSelection = () => {
    setIsSelecting(true)
    setWatermarkArea(null)
  }

  const clearSelection = () => {
    setWatermarkArea(null)
    setIsSelecting(false)
    setStartPoint(null)
    
    if (canvasRef.current && imageRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(imageRef.current, 0, 0)
    }
  }

  const handleRemoveWatermark = async () => {
    if (!watermarkArea) return

    setIsProcessing(true)
    setError(null)
    setSuccess(null)
    
    try {
      const formData = new FormData()
      formData.append('image', image)
      
      const uploadResponse = await axios.post('/api/upload', formData)
      const { id } = uploadResponse.data.data

      const removalResponse = await axios.post('/api/remove-watermark', {
        imageId: id,
        watermarkArea
      })

      onProcessed(removalResponse.data.data)
      setSuccess('Watermark removed successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (error: any) {
      console.error('Error removing watermark:', error)
      const errorMessage = error.response?.data?.message || 'Failed to remove watermark. Please try again.'
      setError(errorMessage)
      setTimeout(() => setError(null), 5000)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Watermark Removal</h2>
      
      <div className="mb-4 text-sm text-white/70">
        Instructions: Click "Select Watermark Area" then drag on the image to select the watermark area. Click "Remove Watermark" to process.
      </div>
      
      <div className="space-y-4">
        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-green-200 text-sm">
            {success}
          </div>
        )}

        <div className="relative">
          <img
            ref={imageRef}
            src={URL.createObjectURL(image)}
            alt="Original"
            className="hidden"
            onLoad={handleImageLoad}
          />
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto border border-white/20 rounded-lg cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              cursor: isSelecting ? 'crosshair' : 'default'
            }}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={startSelection}
            disabled={isSelecting || isProcessing}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:bg-gray-400"
          >
            {isSelecting ? 'Selecting...' : 'Select Watermark Area'}
          </button>
          
          <button
            onClick={clearSelection}
            disabled={isProcessing}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:bg-gray-400"
          >
            Clear Selection
          </button>
        </div>

        {watermarkArea && (
          <div className="text-sm text-white/70">
            Selected area: {Math.round(watermarkArea.width)} x {Math.round(watermarkArea.height)} pixels
          </div>
        )}

        <button
          onClick={handleRemoveWatermark}
          disabled={!watermarkArea || isProcessing}
          className="w-full px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors disabled:bg-gray-400"
        >
          {isProcessing ? 'Removing Watermark...' : 'Remove Watermark'}
        </button>
      </div>
    </div>
  )
}