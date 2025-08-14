import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import { CompressionSettings } from '../../../../client/src/components/CompressionSettings'

// Mock axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn()
  }
}))
const mockedAxios = vi.mocked(axios)

describe('CompressionSettings', () => {
  const mockOnProcessed = vi.fn()
  const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
  
  beforeEach(() => {
    mockOnProcessed.mockClear()
    mockedAxios.post.mockClear()
  })

  it('renders compression settings correctly', () => {
    render(<CompressionSettings image={mockFile} onProcessed={mockOnProcessed} />)
    
    expect(screen.getByText('Compression Settings')).toBeInTheDocument()
    expect(screen.getByText('Quality: 80%')).toBeInTheDocument()
    expect(screen.getByText('Output Format')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Compress Image' })).toBeInTheDocument()
  })

  it('updates quality slider correctly', async () => {
    const user = userEvent.setup()
    render(<CompressionSettings image={mockFile} onProcessed={mockOnProcessed} />)
    
    const slider = screen.getByRole('slider')
    
    await user.click(slider)
    fireEvent.change(slider, { target: { value: '60' } })
    
    expect(screen.getByText('Quality: 60%')).toBeInTheDocument()
  })

  it('updates format selection correctly', async () => {
    const user = userEvent.setup()
    render(<CompressionSettings image={mockFile} onProcessed={mockOnProcessed} />)
    
    const select = screen.getByRole('combobox')
    
    await user.selectOptions(select, 'webp')
    
    expect(select).toHaveValue('webp')
  })

  it('handles successful compression', async () => {
    const user = userEvent.setup()
    
    const uploadResponse = {
      data: { data: { id: 'test-id' } }
    }
    const compressResponse = {
      data: { 
        data: { 
          url: 'test-url', 
          processedSize: 1000, 
          format: 'jpeg' 
        } 
      }
    }
    
    mockedAxios.post
      .mockResolvedValueOnce(uploadResponse)
      .mockResolvedValueOnce(compressResponse)
    
    render(<CompressionSettings image={mockFile} onProcessed={mockOnProcessed} />)
    
    const button = screen.getByRole('button', { name: 'Compress Image' })
    await user.click(button)
    
    expect(screen.getByText('Processing...')).toBeInTheDocument()
    expect(button).toBeDisabled()
    
    await waitFor(() => {
      expect(mockOnProcessed).toHaveBeenCalledWith({
        url: 'test-url',
        processedSize: 1000,
        format: 'jpeg'
      })
    })
    
    expect(mockedAxios.post).toHaveBeenCalledTimes(2)
    expect(mockedAxios.post).toHaveBeenNthCalledWith(1, '/api/upload', expect.any(FormData))
    expect(mockedAxios.post).toHaveBeenNthCalledWith(2, '/api/compress', {
      imageId: 'test-id',
      quality: 80,
      format: 'jpeg'
    })
  })

  it('handles compression with custom settings', async () => {
    const user = userEvent.setup()
    
    const uploadResponse = {
      data: { data: { id: 'test-id' } }
    }
    const compressResponse = {
      data: { 
        data: { 
          url: 'test-url', 
          processedSize: 800, 
          format: 'webp' 
        } 
      }
    }
    
    mockedAxios.post
      .mockResolvedValueOnce(uploadResponse)
      .mockResolvedValueOnce(compressResponse)
    
    render(<CompressionSettings image={mockFile} onProcessed={mockOnProcessed} />)
    
    // Change quality to 60
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '60' } })
    
    // Change format to WebP
    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'webp')
    
    const button = screen.getByRole('button', { name: 'Compress Image' })
    await user.click(button)
    
    await waitFor(() => {
      expect(mockOnProcessed).toHaveBeenCalledWith({
        url: 'test-url',
        processedSize: 800,
        format: 'webp'
      })
    })
    
    expect(mockedAxios.post).toHaveBeenNthCalledWith(2, '/api/compress', {
      imageId: 'test-id',
      quality: 60,
      format: 'webp'
    })
  })

  it('handles compression error', async () => {
    const user = userEvent.setup()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    mockedAxios.post.mockRejectedValue(new Error('Upload failed'))
    
    render(<CompressionSettings image={mockFile} onProcessed={mockOnProcessed} />)
    
    const button = screen.getByRole('button', { name: 'Compress Image' })
    await user.click(button)
    
    expect(screen.getByText('Processing...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Compress Image')).toBeInTheDocument()
      expect(button).not.toBeDisabled()
    })
    
    expect(consoleSpy).toHaveBeenCalledWith('Error processing image:', expect.any(Error))
    expect(mockOnProcessed).not.toHaveBeenCalled()
    
    consoleSpy.mockRestore()
  })

  it('disables button during processing', async () => {
    const user = userEvent.setup()
    
    // Mock a delayed response
    mockedAxios.post.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: { data: { id: 'test' } } }), 100))
    )
    
    render(<CompressionSettings image={mockFile} onProcessed={mockOnProcessed} />)
    
    const button = screen.getByRole('button', { name: 'Compress Image' })
    await user.click(button)
    
    expect(button).toBeDisabled()
    expect(screen.getByText('Processing...')).toBeInTheDocument()
  })
})