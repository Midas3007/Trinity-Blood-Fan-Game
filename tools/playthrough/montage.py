"""The 30-second montage: shots cut from the clean trailer recordings, 4x pixel-exact to 1080p, captions, music bed, voices."""
import subprocess
from pathlib import Path
OUT = Path(__file__).parent / 'out'
M = Path(__file__).parent / 'montage'
VOICE = Path('/home/user/Trinity-Blood-Fan-Game/public/assets/audio/voice')
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'
REG = '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
W, H = 1920, 1080
# (source, start, duration, caption, sub-caption)
SHOTS = [
    ('s01', 0.3, 1.8, None, None),
    ('s02', 1.0, 2.2, None, None),
    ('s03', 0.2, 2.2, 'ISTVAN', 'a city freed from its vampire lord'),
    ('s04', 8.0, 3.0, "THE ATONER'S BLADE", 'sword, revolver, finishers'),
    ('s05', 0.3, 3.0, 'THE CRUSNIK', 'a vampire that feeds on vampires'),
    ('s06', 16.2, 1.8, None, None),
    ('s06', 21.9, 2.0, None, None),
    ('s08', 30.5, 3.0, 'SIX BOSSES', 'voiced, with a cutscene for each'),
    ('s10', 6.5, 2.5, None, None),
    ('c10wings', 9.5, 2.5, None, None),
    ('c10end', 7.0, 2.0, None, None),
]
CARD = 3.8
ENC = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', '30', '-profile:v', 'high']

def esc(t):
    return t.replace('\\', '\\\\').replace(':', '\\:').replace("'", '’').replace(',', '\\,')

def cap(text, sub):
    if not text:
        return ''
    f = (f",drawbox=x=0:y=70:w={W}:h=170:color=black@0.45:t=fill"
         f",drawtext=fontfile={BOLD}:text='{esc(text)}':fontsize=64:fontcolor=0xeadfc4:borderw=4:bordercolor=black:x=(w-text_w)/2:y=85")
    if sub:
        f += f",drawtext=fontfile={REG}:text='{esc(sub)}':fontsize=34:fontcolor=0xc4a04a:borderw=3:bordercolor=black:x=(w-text_w)/2:y=170"
    return f

parts = []
for i, (src, ss, d, text, sub) in enumerate(SHOTS):
    p = M / f'p{i:02d}.mp4'
    vf = f"scale={W}:{H}:flags=neighbor{cap(text, sub)}"
    if i == 0:
        vf += ',fade=t=in:st=0:d=0.5'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', str(ss), '-t', str(d), '-i', str(OUT / f'{src}.m.mp4'),
                    '-vf', vf, '-an', *ENC, str(p)], check=True)
    parts.append(p)
# end card
card = M / 'card.mp4'
vf = (f"drawtext=fontfile={BOLD}:text='TRINITY BLOOD':fontsize=110:fontcolor=0xeadfc4:borderw=3:bordercolor=0x6a1524:x=(w-text_w)/2:y=330"
      f",drawtext=fontfile={REG}:text='The Star of Sorrow':fontsize=56:fontcolor=0xc4a04a:x=(w-text_w)/2:y=470"
      f",drawtext=fontfile={REG}:text='{esc('a fan-made Metroidvania · playable on your phone')}':fontsize=38:fontcolor=0xeadfc4:x=(w-text_w)/2:y=580"
      f",drawtext=fontfile={REG}:text='{esc('Unofficial fan project. Not affiliated with or endorsed by the rights holders of Trinity Blood.')}':fontsize=26:fontcolor=0x8a8392:x=(w-text_w)/2:y=960"
      f",fade=t=in:st=0:d=0.6,fade=t=out:st={CARD-0.8}:d=0.8")
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', f'color=c=0x0b0a10:s={W}x{H}:d={CARD}:r=30', '-vf', vf, *ENC, str(card)], check=True)
parts.append(card)
(M / 'list.txt').write_text(''.join(f"file '{p.name}'\n" for p in parts))
video = M / 'video.mp4'
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(M / 'list.txt'), '-c', 'copy', str(video)], check=True)
total = sum(s[2] for s in SHOTS) + CARD
starts = []
t = 0.0
for s in SHOTS:
    starts.append(t); t += s[2]
v1 = starts[5]          # "Crusnik. Forty percent. ...Release."
v2 = starts[9]          # "Black wings... What are you?"
fc = (f"[1:a]atrim=0:{total},asetpts=N/SR/TB,volume=0.85,afade=t=in:st=0:d=0.6,afade=t=out:st={total-1.8}:d=1.8[bed];"
      f"[2:a]adelay={int(v1*1000)}|{int(v1*1000)},volume=1.9[va];"
      f"[3:a]adelay={int(v2*1000)}|{int(v2*1000)},volume=1.9[vb];"
      f"[va][vb]amix=inputs=2:normalize=0[vox];[vox]asplit=2[vox1][vox2];"
      f"[bed][vox1]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[duck];"
      f"[duck][vox2]amix=inputs=2:normalize=0,alimiter=limit=0.95[a]")
final = M / 'trinity_blood_montage.mp4'
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(video), '-i', str(OUT / 'bed.audio.webm'),
                '-i', str(VOICE / 'kampfer_awakening_2_1.mp3'), '-i', str(VOICE / 'gyula_wings_3_0.mp3'),
                '-filter_complex', fc, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
                '-t', f'{total:.2f}', '-movflags', '+faststart', str(final)], check=True)
print('total', total)
