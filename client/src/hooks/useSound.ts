import { useCallback, useEffect, useRef, useState } from 'react'

interface UseSoundOptions {
  volume?: number
  loop?: boolean
  autoplay?: boolean
  preload?: boolean
  onLoad?: () => void
  onError?: (error: Error) => void
  onEnd?: () => void
}

interface UseSoundReturn {
  play: () => Promise<void>
  pause: () => void
  stop: () => void
  setVolume: (volume: number) => void
  isPlaying: boolean
  isLoading: boolean
  error: string | null
  duration: number | null
  currentTime: number
}

export const useSound = (
  src: string,
  options: UseSoundOptions = {}
): UseSoundReturn => {
  const {
    volume = 1,
    loop = false,
    autoplay = false,
    preload = true,
    onLoad,
    onError,
    onEnd
  } = options

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [duration, setDuration] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(0)

  // Initialize audio element
  useEffect(() => {
    if (!src) return

    const audio = new Audio()
    audioRef.current = audio

    // Set initial properties
    audio.volume = Math.max(0, Math.min(1, volume))
    audio.loop = loop
    audio.preload = preload ? 'auto' : 'none'

    // Event listeners
    const handleLoadStart = () => {
      setIsLoading(true)
      setError(null)
    }

    const handleCanPlayThrough = () => {
      setIsLoading(false)
      setDuration(audio.duration)
      onLoad?.()
      
      if (autoplay) {
        audio.play().catch((err) => {
          console.warn('Autoplay prevented:', err)
          setError('Autoplay prevented by browser')
        })
      }
    }

    const handlePlay = () => {
      setIsPlaying(true)
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      onEnd?.()
    }

    const handleError = (e: Event) => {
      const target = e.target as HTMLAudioElement
      const errorMessage = `Audio error: ${target.error?.message || 'Unknown error'}`
      setError(errorMessage)
      setIsLoading(false)
      onError?.(new Error(errorMessage))
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    // Add event listeners
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplaythrough', handleCanPlayThrough)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)

    // Set source and start loading
    audio.src = src

    return () => {
      // Cleanup
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplaythrough', handleCanPlayThrough)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      
      if (!audio.paused) {
        audio.pause()
      }
      
      audio.src = ''
      audioRef.current = null
    }
  }, [src, volume, loop, autoplay, preload, onLoad, onError, onEnd])

  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, volume))
    }
  }, [volume])

  // Update loop when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = loop
    }
  }, [loop])

  const play = useCallback(async (): Promise<void> => {
    if (!audioRef.current) {
      throw new Error('Audio not initialized')
    }

    try {
      setError(null)
      await audioRef.current.play()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to play audio'
      setError(errorMessage)
      throw new Error(errorMessage)
    }
  }, [])

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause()
    }
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setCurrentTime(0)
    }
  }, [])

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume))
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume
    }
  }, [])

  return {
    play,
    pause,
    stop,
    setVolume,
    isPlaying,
    isLoading,
    error,
    duration,
    currentTime
  }
}

// Simple hook for one-shot sound effects
export const useSoundEffect = (src: string, volume: number = 1) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (src) {
      const audio = new Audio(src)
      audio.volume = Math.max(0, Math.min(1, volume))
      audio.preload = 'auto'
      audioRef.current = audio

      return () => {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause()
        }
        audioRef.current = null
      }
    }
  }, [src, volume])

  const play = useCallback(async () => {
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0
        await audioRef.current.play()
      } catch (err) {
        console.warn('Sound effect play failed:', err)
      }
    }
  }, [])

  return { play }
}