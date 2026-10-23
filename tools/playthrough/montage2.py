"""The 1-minute montage of both arcs (owner, 2026-10-23): shots cut from the recorded chapters (out/<id>.mp4),
2x pixel-exact to 1080p, each with the game's own sound. Dialogue shots are whole lines: they start as the line
appears and end as the page turns (turns measured on the dialogue box's text, then checked by eye), so no line is cut short."""
import subprocess
from pathlib import Path
OUT = Path(__file__).parent / 'out'
M = OUT / 'montage2'
M.mkdir(exist_ok=True)
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'
REG = '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
W, H = 1920, 1080
FADE = 0.12
# (chapter, start s, end s, caption or None). 'line' shots are whole dialogue lines.
SHOTS = [
    ('c01', 1.0, 4.0, None),                       # the title
    ('c01', 7.35, 14.2, None),                      # line: "Istvan... prettier than the reports said." (voiced)
    ('c02s', 21.0, 24.0, 'ACT I · ISTVAN'),        # the Atoner's Blade
    ('c05', 43.85, 48.9, None),                     # line: "Crusnik. Forty percent. ...Release." (voiced)
    ('c07', 32.0, 35.0, None),                     # the Marchesa
    ('c10', 59.9, 65.0, None),                     # line: "Black wings... What are you?" (voiced)
    ('e01', 7.5, 12.8, 'ACT II · THE EMPIRE'),     # line: arriving in Byzantium
    ('e03', 24.0, 26.5, None),                     # the phase-step
    ('e04', 44.0, 47.0, None),                     # the Janissary Captain
    ('e06', 9.5, 12.0, None),                      # the glass gardens
    ('e07', 91.5, 94.5, None),                     # Radu burning
    ('e08', 84.0, 89.0, None),                     # line: "Nanomachines, one hundred percent. Full release."
    ('e08', 104.5, 107.5, None),                   # the sky over the Spire
    ('e08', 170.5, 175.6, None),                   # line: "Esther... I'm coming home."
]
CARD = 4.0
ENC = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', '30',
       '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2']

def esc(t):
    return t.replace('\\', '\\\\').replace(':', '\\:').replace("'", '’').replace(',', '\\,')

parts = []
for i, (src, a, b, cap) in enumerate(SHOTS):
    d = b - a
    p = M / f's{i:02d}.mp4'
    vf = f'scale={W}:{H}:flags=neighbor,fade=t=in:st=0:d={FADE},fade=t=out:st={d - FADE:.2f}:d={FADE}'
    if cap:
        vf += (f",drawbox=x=0:y=60:w={W}:h=110:color=black@0.5:t=fill"
               f",drawtext=fontfile={BOLD}:text='{esc(cap)}':fontsize=56:fontcolor=0xeadfc4:borderw=4:bordercolor=black:x=(w-text_w)/2:y=85")
    af = f'afade=t=in:st=0:d={FADE},afade=t=out:st={d - FADE:.2f}:d={FADE}'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', f'{a}', '-t', f'{d}', '-i', str(OUT / f'{src}.mp4'),
                    '-vf', vf, '-af', af, *ENC, str(p)], check=True)
    parts.append(p)
card = M / 'card.mp4'
vf = (f"drawtext=fontfile={BOLD}:text='TRINITY BLOOD':fontsize=110:fontcolor=0xeadfc4:borderw=3:bordercolor=0x6a1524:x=(w-text_w)/2:y=330"
      f",drawtext=fontfile={REG}:text='{esc('The Star of Sorrow  ·  The Empire')}':fontsize=52:fontcolor=0xc4a04a:x=(w-text_w)/2:y=470"
      f",drawtext=fontfile={REG}:text='{esc('a fan-made Metroidvania · playable on your phone')}':fontsize=38:fontcolor=0xeadfc4:x=(w-text_w)/2:y=580"
      f",drawtext=fontfile={REG}:text='{esc('Unofficial fan project. Not affiliated with or endorsed by the rights holders of Trinity Blood.')}':fontsize=26:fontcolor=0x8a8392:x=(w-text_w)/2:y=960"
      f",fade=t=in:st=0:d=0.6,fade=t=out:st={CARD - 0.8}:d=0.8")
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', f'color=c=0x0b0a10:s={W}x{H}:d={CARD}:r=30',
                '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', str(CARD), '-vf', vf, *ENC, str(card)], check=True)
parts.append(card)
(M / 'list.txt').write_text(''.join(f"file '{p.name}'\n" for p in parts))
final = OUT / 'trinity_blood_montage_both_arcs.mp4'
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(M / 'list.txt'),
                '-c', 'copy', '-movflags', '+faststart', str(final)], check=True)
print('total', round(sum(b - a for _, a, b, _ in SHOTS) + CARD, 1))
