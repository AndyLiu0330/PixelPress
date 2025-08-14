import fs from 'fs/promises'
import path from 'path'

class CleanupService {
  private intervalId: NodeJS.Timeout | null = null
  private readonly uploadDir = process.env.UPLOAD_DIR || './temp/uploads'
  private readonly processedDir = './temp/processed'
  private readonly maxAge = 3600000 // 1 hour in milliseconds

  async cleanOldFiles(directory: string) {
    try {
      const files = await fs.readdir(directory)
      const now = Date.now()

      for (const file of files) {
        const filePath = path.join(directory, file)
        const stats = await fs.stat(filePath)
        const age = now - stats.mtimeMs

        if (age > this.maxAge) {
          await fs.unlink(filePath)
          console.log(`Deleted old file: ${file}`)
        }
      }
    } catch (error) {
      console.error(`Error cleaning directory ${directory}:`, error)
    }
  }

  start() {
    const interval = parseInt(process.env.CLEANUP_INTERVAL || '3600000')
    
    this.intervalId = setInterval(async () => {
      await this.cleanOldFiles(this.uploadDir)
      await this.cleanOldFiles(this.processedDir)
    }, interval)

    console.log('Cleanup service started')
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('Cleanup service stopped')
    }
  }
}

export const cleanupService = new CleanupService()