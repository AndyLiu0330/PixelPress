import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../../client/src/App'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Sparkles: () => <div data-testid="sparkles-icon">Sparkles</div>,
  Zap: () => <div data-testid="zap-icon">Zap</div>,
  Shield: () => <div data-testid="shield-icon">Shield</div>,
  Globe: () => <div data-testid="globe-icon">Globe</div>,
  Compress: () => <div data-testid="compress-icon">Compress</div>,
  Eraser: () => <div data-testid="eraser-icon">Eraser</div>
}))

// Mock the child components to isolate App component testing
vi.mock('../../../client/src/components/ImageUploader', () => ({
  ImageUploader: ({ onImageUpload }: { onImageUpload: (file: File) => void }) => (
    <div data-testid="image-uploader">
      <button onClick={() => onImageUpload(new File(['test'], 'test.jpg', { type: 'image/jpeg' }))}>
        Mock Upload
      </button>
    </div>
  )
}))

vi.mock('../../../client/src/components/ImagePreview', () => ({
  ImagePreview: ({ originalImage, processedImageUrl }: any) => (
    <div data-testid="image-preview">
      {originalImage && <div>Original: {originalImage.name}</div>}
      {processedImageUrl && <div>Processed: {processedImageUrl}</div>}
    </div>
  )
}))

vi.mock('../../../client/src/components/CompressionSettings', () => ({
  CompressionSettings: ({ image, onProcessed }: any) => (
    <div data-testid="compression-settings">
      <div>Compressing: {image.name}</div>
      <button onClick={() => onProcessed({ url: 'test-url', processedSize: 1000, format: 'jpeg' })}>
        Mock Compress
      </button>
    </div>
  )
}))

vi.mock('../../../client/src/components/WatermarkRemoval', () => ({
  WatermarkRemoval: ({ image, onProcessed }: any) => (
    <div data-testid="watermark-removal">
      <div>Removing watermark from: {image.name}</div>
      <button onClick={() => onProcessed({ url: 'test-url', processedSize: 900, format: 'png' })}>
        Mock Remove Watermark
      </button>
    </div>
  )
}))

describe('App', () => {
  it('renders header with correct title and description', () => {
    render(<App />)
    
    expect(screen.getByText('PixelPress')).toBeInTheDocument()
    expect(screen.getByText(/Transform your images with intelligent compression/)).toBeInTheDocument()
    expect(screen.getByText('Powered by cutting-edge compression')).toBeInTheDocument()
  })

  it('displays feature pills', () => {
    render(<App />)
    
    expect(screen.getByText('Lightning Fast')).toBeInTheDocument()
    expect(screen.getByText('Process images in seconds')).toBeInTheDocument()
    expect(screen.getByText('Secure')).toBeInTheDocument()
    expect(screen.getByText('Your images are safe')).toBeInTheDocument()
    expect(screen.getByText('Universal')).toBeInTheDocument()
    expect(screen.getByText('Support for all formats')).toBeInTheDocument()
  })

  it('displays footer', () => {
    render(<App />)
    
    expect(screen.getByText('Process images locally with zero data collection')).toBeInTheDocument()
  })

  it('shows placeholder when no image is uploaded', () => {
    render(<App />)
    
    expect(screen.getByText('Your image preview will appear here')).toBeInTheDocument()
    expect(screen.getByText('Upload an image to get started')).toBeInTheDocument()
  })

  it('handles image upload and shows tool tabs', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    // Upload an image
    const uploadButton = screen.getByText('Mock Upload')
    await user.click(uploadButton)
    
    // Tool tabs should appear
    expect(screen.getByText('Compress')).toBeInTheDocument()
    expect(screen.getByText('Remove Watermark')).toBeInTheDocument()
    
    // Compression settings should be shown by default
    expect(screen.getByTestId('compression-settings')).toBeInTheDocument()
    expect(screen.queryByTestId('watermark-removal')).not.toBeInTheDocument()
  })

  it('switches between compress and watermark tabs', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    // Upload an image first
    const uploadButton = screen.getByText('Mock Upload')
    await user.click(uploadButton)
    
    // Switch to watermark tab
    const watermarkTab = screen.getByText('Remove Watermark')
    await user.click(watermarkTab)
    
    expect(screen.getByTestId('watermark-removal')).toBeInTheDocument()
    expect(screen.queryByTestId('compression-settings')).not.toBeInTheDocument()
    
    // Switch back to compress tab
    const compressTab = screen.getByText('Compress')
    await user.click(compressTab)
    
    expect(screen.getByTestId('compression-settings')).toBeInTheDocument()
    expect(screen.queryByTestId('watermark-removal')).not.toBeInTheDocument()
  })

  it('shows image preview when image is uploaded', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    // Upload an image
    const uploadButton = screen.getByText('Mock Upload')
    await user.click(uploadButton)
    
    // Image preview should be shown
    expect(screen.getByTestId('image-preview')).toBeInTheDocument()
    expect(screen.getByText('Original: test.jpg')).toBeInTheDocument()
    
    // Placeholder should be hidden
    expect(screen.queryByText('Your image preview will appear here')).not.toBeInTheDocument()
  })

  it('handles image processing and updates preview', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    // Upload an image
    const uploadButton = screen.getByText('Mock Upload')
    await user.click(uploadButton)
    
    // Process the image
    const compressButton = screen.getByText('Mock Compress')
    await user.click(compressButton)
    
    // Preview should show processed image
    expect(screen.getByText('Processed: test-url')).toBeInTheDocument()
  })

  it('maintains processed data state across tab switches', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    // Upload an image
    const uploadButton = screen.getByText('Mock Upload')
    await user.click(uploadButton)
    
    // Process with compression
    const compressButton = screen.getByText('Mock Compress')
    await user.click(compressButton)
    
    // Switch to watermark tab
    const watermarkTab = screen.getByText('Remove Watermark')
    await user.click(watermarkTab)
    
    // Process with watermark removal
    const watermarkButton = screen.getByText('Mock Remove Watermark')
    await user.click(watermarkButton)
    
    // Should show the latest processed image
    expect(screen.getByText('Processed: test-url')).toBeInTheDocument()
  })

  it('applies correct tab styling for active/inactive states', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    // Upload an image
    const uploadButton = screen.getByText('Mock Upload')
    await user.click(uploadButton)
    
    const compressTab = screen.getByText('Compress')
    const watermarkTab = screen.getByText('Remove Watermark')
    
    // Compress tab should be active by default
    expect(compressTab.closest('button')).toHaveClass('bg-primary-500')
    expect(watermarkTab.closest('button')).toHaveClass('bg-white/10')
    
    // Switch to watermark tab
    await user.click(watermarkTab)
    
    expect(watermarkTab.closest('button')).toHaveClass('bg-primary-500')
    expect(compressTab.closest('button')).toHaveClass('bg-white/10')
  })
})