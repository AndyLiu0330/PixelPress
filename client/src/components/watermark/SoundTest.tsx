import React, { useState } from 'react'
import { useSound, useSoundEffect } from '../../hooks/useSound'

// You can use any audio file URL or local file path
const DEMO_SOUND_URL = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3'

export const SoundTest: React.FC = () => {
  const [soundUrl, setSoundUrl] = useState(DEMO_SOUND_URL)
  const [volume, setVolume] = useState(0.5)

  // Main sound hook with full controls
  const {
    play,
    pause,
    stop,
    setVolume: setSoundVolume,
    isPlaying,
    isLoading,
    error,
    duration,
    currentTime
  } = useSound(soundUrl, {
    volume,
    onLoad: () => console.log('Sound loaded successfully'),
    onError: (err) => console.error('Sound error:', err),
    onEnd: () => console.log('Sound ended')
  })

  // Simple sound effect hook
  const { play: playEffect } = useSoundEffect('/assets/sounds/click.wav', 0.3)

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    setSoundVolume(newVolume)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">🔊 Sound Hook Test</h2>
      
      {/* Sound URL Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Sound URL:
        </label>
        <input
          type="text"
          value={soundUrl}
          onChange={(e) => setSoundUrl(e.target.value)}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter sound URL or file path"
        />
      </div>

      {/* Volume Control */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Volume: {Math.round(volume * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Status Display */}
      <div className="mb-4 p-3 bg-gray-100 rounded">
        <div className="text-sm space-y-1">
          <div>Status: {isLoading ? '⏳ Loading...' : isPlaying ? '▶️ Playing' : '⏸️ Paused'}</div>
          {duration && (
            <div>Duration: {formatTime(duration)}</div>
          )}
          <div>Current: {formatTime(currentTime)}</div>
          {error && (
            <div className="text-red-600">❌ Error: {error}</div>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={play}
          disabled={isLoading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          ▶️ Play
        </button>
        <button
          onClick={pause}
          disabled={!isPlaying}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
        >
          ⏸️ Pause
        </button>
        <button
          onClick={stop}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          ⏹️ Stop
        </button>
      </div>

      {/* Sound Effect Test */}
      <div className="border-t pt-4">
        <h3 className="font-semibold mb-2">Sound Effect Test:</h3>
        <button
          onClick={playEffect}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          🔔 Play Effect
        </button>
      </div>

      {/* Debug Info */}
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-gray-600">
          🔍 Debug Info
        </summary>
        <pre className="text-xs bg-gray-100 p-2 mt-2 rounded overflow-auto">
          {JSON.stringify({
            soundUrl,
            volume,
            isPlaying,
            isLoading,
            error,
            duration,
            currentTime
          }, null, 2)}
        </pre>
      </details>
    </div>
  )
}

// Example usage in your main component
export const SoundExample: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <SoundTest />
      
      {/* Integration Example */}
      <div className="max-w-md mx-auto mt-8 p-4 bg-white rounded-lg shadow">
        <h3 className="font-bold mb-2">Integration Example:</h3>
        <code className="text-xs bg-gray-100 p-2 block rounded">
          {`// In your component:
import { useSound } from '../hooks/useSound'

const { play } = useSound('/sounds/success.mp3')

// In your watermark removal success handler:
const handleSuccess = async () => {
  await play() // Play success sound
  // ... rest of success logic
}`}
        </code>
      </div>
    </div>
  )
}