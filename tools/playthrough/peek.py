"""Contact sheet of one frame per given time (seconds) from out/<chapter>.mp4, labelled. Usage: peek.py <chapter> t1 t2 ..."""
import subprocess, sys
from PIL import Image, ImageDraw
name, times = sys.argv[1], [float(t) for t in sys.argv[2:]]
tiles = []
for t in times:
    raw = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-ss', str(t), '-i', f'out/{name}.mp4', '-frames:v', '1', '-vf', 'scale=480:270', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    if len(raw) < 480 * 270 * 3: continue
    im = Image.frombytes('RGB', (480, 270), raw[: 480 * 270 * 3])
    ImageDraw.Draw(im).text((4, 4), f'{name} {t}', fill=(255, 255, 0))
    tiles.append(im)
cols = 3
sheet = Image.new('RGB', (480 * cols, 270 * ((len(tiles) + cols - 1) // cols)))
for i, im in enumerate(tiles): sheet.paste(im, ((i % cols) * 480, (i // cols) * 270))
sheet.save(f'/tmp/claude-0/-home-user/e7e19507-8519-53f9-99cd-fc03263ef9a2/scratchpad/peek_{name}.png')
