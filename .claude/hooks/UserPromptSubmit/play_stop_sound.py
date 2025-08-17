# play_stop_sound.py
# Plays stop.mp3 when user submits a prompt (for testing)

import os
import sys
import subprocess
import platform

def main():
    prompt = sys.stdin.read()
    
    # Find the stop.mp3 file
    stop_mp3_path = "c:\\Project\\PixelPress\\.claude\\hooks\\ResponseSubmit\\sound\\stop.mp3"
    
    if os.path.exists(stop_mp3_path):
        try:
            # Use Windows Media Player
            subprocess.run([
                "powershell", "-c", 
                f"Add-Type -AssemblyName presentationCore; " +
                f"$MediaPlayer = New-Object System.Windows.Media.MediaPlayer; " +
                f"$MediaPlayer.Open([uri]'{stop_mp3_path}'); " +
                f"$MediaPlayer.Play(); " +
                f"Start-Sleep -Seconds 3"
            ], check=False, capture_output=True, timeout=5)
        except:
            pass
    
    # Always output the prompt
    sys.stdout.write(prompt)

if __name__ == "__main__":
    main()
