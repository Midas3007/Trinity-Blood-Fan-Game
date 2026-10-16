"""Mux one chapter's canvas video and game audio into an MP4 (pixel-exact 2x upscale), lining them up by start time."""
import json, subprocess, sys
from pathlib import Path
out = Path(sys.argv[1]); name = sys.argv[2]
meta = json.loads((out / f"{name}.json").read_text())
t = meta.get("times") or {}
off = (t.get("audio", 0) - t.get("video", 0)) / 1000 if t.get("audio") and t.get("video") else 0
cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(out / f"{name}.video.webm"),
       "-itsoffset", f"{off:.3f}", "-i", str(out / f"{name}.audio.webm"),
       "-map", "0:v", "-map", "1:a?", "-vf", "scale=960:540:flags=neighbor,fps=30", "-c:v", "libx264", "-preset", "veryfast",
       "-crf", "22", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2", str(out / f"{name}.mp4")]
subprocess.run(cmd, check=True)
print(name, "offset", off)
