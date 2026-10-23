"""Finds whole dialogue lines in a recorded chapter (out/<id>.mp4), so the montage never cuts a line short.
A cutscene line types into the dialogue box; when the page turns the box empties and the next line types in.
Prints (start, end) seconds of each line: from the moment its text begins until just before the next one clears.
Usage: python3 -I lines.py <chapter>"""
import subprocess, sys
import numpy as np
FPS = 10
W, H = 960, 540
name = sys.argv[1]
# the dialogue box's text area (inside its gold frame), in the 960x540 chapter videos
X0, Y0, X1, Y1 = 40, 420, 920, 505
raw = subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-i', f'out/{name}.mp4', '-vf', f'fps={FPS},crop={X1-X0}:{Y1-Y0}:{X0}:{Y0},format=gray',
                      '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
n = len(raw) // ((X1 - X0) * (Y1 - Y0))
frames = np.frombuffer(raw[: n * (X1 - X0) * (Y1 - Y0)], np.uint8).reshape(n, Y1 - Y0, X1 - X0)
ink = (frames > 150).sum(axis=(1, 2))           # bright text pixels
box = (frames > 25).mean(axis=(1, 2))             # the box itself is dark but not black
lines, start = [], None
for i in range(1, n):
    if ink[i] > 60 and ink[i - 1] <= 60:          # text appears
        start = i
    if start is not None and ink[i] <= 60 and ink[i - 1] > 60:   # text gone: page turned or scene over
        if i - start > FPS * 1.5:
            lines.append((start / FPS, (i - 1) / FPS))
        start = None
    if start is not None and i - start > 3 and ink[i] < ink[i - 1] * 0.45:   # a new line replaced the old at once
        if i - start > FPS * 1.5:
            lines.append((start / FPS, (i - 1) / FPS))
        start = i
for s, e in lines:
    print(f'{s:7.1f} {e:7.1f}  ({e - s:.1f}s)')
