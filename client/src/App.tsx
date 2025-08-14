import { useState } from 'react'
import { ImageUploader } from './components/ImageUploader'
import { ImagePreview } from './components/ImagePreview'
import { CompressionSettings } from './components/CompressionSettings'
import { WatermarkRemoval } from './components/WatermarkRemoval'
import { Sparkles, Zap, Shield, Globe, Archive, Eraser } from 'lucide-react'

function App() {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null)
  const [processedData, setProcessedData] = useState<{ url: string; processedSize: number; format: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'compress' | 'watermark'>('compress')

  const features = [
    { icon: Zap, text: 'Lightning Fast', description: 'Process images in seconds' },
    { icon: Shield, text: 'Secure', description: 'Your images are safe' },
    { icon: Globe, text: 'Universal', description: 'Support for all formats' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pattern-dots opacity-5"></div>
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500 rounded-full filter blur-3xl opacity-10 animate-float"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-500 rounded-full filter blur-3xl opacity-10 animate-float" style={{ animationDelay: '3s' }}></div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <header className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-white/80 text-sm mb-6 animate-slide-up">
            <Sparkles className="w-4 h-4" />
            <span>Powered by cutting-edge compression</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <span className="text-gradient">PixelPress</span>
          </h1>
          
          <p className="text-xl text-gray-300 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Transform your images with intelligent compression, format conversion, and watermark removal. 
            Reduce file sizes by up to 90% while maintaining stunning quality.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {features.map((feature, index) => (
              <div 
                key={feature.text}
                className="flex items-center gap-2 px-4 py-2 glass rounded-lg text-white/90 hover-lift animate-slide-up"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <feature.icon className="w-4 h-4 text-primary-400" />
                <div className="text-left">
                  <div className="text-sm font-semibold">{feature.text}</div>
                  <div className="text-xs text-white/60">{feature.description}</div>
                </div>
              </div>
            ))}
          </div>
        </header>

        {/* Main content */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left column - Upload and Settings */}
            <div className="space-y-6">
              <div className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
                <ImageUploader onImageUpload={setUploadedImage} />
              </div>
              
              {uploadedImage && (
                <div className="animate-slide-up">
                  {/* Tool Tabs */}
                  <div className="glass rounded-2xl p-6 mb-6">
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => setActiveTab('compress')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                          activeTab === 'compress'
                            ? 'bg-primary-500 text-white'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                      >
                        <Archive className="w-4 h-4" />
                        Compress
                      </button>
                      <button
                        onClick={() => setActiveTab('watermark')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                          activeTab === 'watermark'
                            ? 'bg-primary-500 text-white'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                      >
                        <Eraser className="w-4 h-4" />
                        Remove Watermark
                      </button>
                    </div>
                  </div>

                  {/* Tool Content */}
                  {activeTab === 'compress' && (
                    <CompressionSettings 
                      image={uploadedImage} 
                      onProcessed={(data) => {
                        setProcessedImageUrl(data.url)
                        setProcessedData(data)
                      }}
                    />
                  )}
                  
                  {activeTab === 'watermark' && (
                    <WatermarkRemoval 
                      image={uploadedImage} 
                      onProcessed={(data) => {
                        setProcessedImageUrl(data.url)
                        setProcessedData(data)
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Right column - Preview */}
            <div className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
              {(uploadedImage || processedImageUrl) && (
                <ImagePreview 
                  originalImage={uploadedImage}
                  processedImageUrl={processedImageUrl}
                  processedData={processedData}
                />
              )}
              
              {!uploadedImage && !processedImageUrl && (
                <div className="glass rounded-2xl p-12 text-center h-full flex items-center justify-center min-h-[400px]">
                  <div>
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary-500/20 to-accent-500/20 flex items-center justify-center">
                      <Sparkles className="w-12 h-12 text-primary-400 animate-pulse-slow" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Your image preview will appear here</h3>
                    <p className="text-gray-400">Upload an image to get started</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-24 pb-8 text-gray-400 text-sm animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <p>Process images locally with zero data collection</p>
        </footer>
      </div>
    </div>
  )
}

export default App