# play_stop_sound.py
# Plays stop.mp3 when Claude Code finishes responding

import os
import sys
import subprocess
import platform

def main():
    response = sys.stdin.read()
    
    # Debug: Create a log file to see if hook is running
    try:
        with open("c:\\Project\\PixelPress\\hook_debug.log", "a") as f:
            f.write(f"Hook executed at: {os.getcwd()}\n")
    except:
        pass
    
    # Find the stop.mp3 file (should be in project root)
    stop_mp3_path = None
    current_dir = os.getcwd()
    
    # Look for stop.mp3 in current directory and parent directories
    search_paths = [
        os.path.join(current_dir, "stop.mp3"),
        os.path.join(os.path.dirname(current_dir), "stop.mp3"),
        os.path.join(os.path.dirname(os.path.dirname(current_dir)), "stop.mp3"),
        "c:\\Project\\PixelPress\\.claude\\hooks\\ResponseSubmit\\sound\\stop.mp3",
        "c:\\Project\\PixelPress\\stop.mp3"
    ]
    
    for path in search_paths:
        if os.path.exists(path):
            stop_mp3_path = path
            break
    
    # Debug: Log if we found the file
    try:
        with open("c:\\Project\\PixelPress\\hook_debug.log", "a") as f:
            f.write(f"MP3 path found: {stop_mp3_path}\n")
    except:
        pass
    
    if stop_mp3_path:
        try:
            # Use a better Windows approach for MP3 playback
            system = platform.system()
            if system == "Windows":
                # Method 1: Try using Windows Media Player directly
                try:
                    subprocess.run([
                        "powershell", "-c", 
                        f"Add-Type -AssemblyName presentationCore; " +
                        f"$MediaPlayer = New-Object System.Windows.Media.MediaPlayer; " +
                        f"$MediaPlayer.Open([uri]'{stop_mp3_path}'); " +
                        f"$MediaPlayer.Play(); " +
                        f"Start-Sleep -Seconds 3"
                    ], check=True, capture_output=True, timeout=5)
                except:
                    # Method 2: Try using mciSendString (Windows multimedia API)
                    try:
                        subprocess.run([
                            "powershell", "-c", 
                            f"Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32 {{ [DllImport(\"winmm.dll\")] public static extern int mciSendString(string command, System.Text.StringBuilder returnValue, int returnLength, IntPtr winHandle); }}'; " +
                            f"[Win32]::mciSendString('open \"{stop_mp3_path}\" alias mp3', $null, 0, 0); " +
                            f"[Win32]::mciSendString('play mp3', $null, 0, 0); " +
                            f"Start-Sleep -Seconds 2; " +
                            f"[Win32]::mciSendString('close mp3', $null, 0, 0)"
                        ], check=True, capture_output=True, timeout=5)
                    except:
                        # Method 3: Try using start command to open with default player
                        subprocess.run([
                            "cmd", "/c", "start", "/min", "", stop_mp3_path
                        ], check=False, capture_output=True)
                
                # Debug: Log success
                try:
                    with open("c:\\Project\\PixelPress\\hook_debug.log", "a") as f:
                        f.write(f"Sound played successfully\n")
                except:
                    pass
                    
        except Exception as e:
            # Debug: Log the error
            try:
                with open("c:\\Project\\PixelPress\\hook_debug.log", "a") as f:
                    f.write(f"Error playing sound: {str(e)}\n")
            except:
                pass
    
    # Always output the response
    sys.stdout.write(response)

if __name__ == "__main__":
    main()
