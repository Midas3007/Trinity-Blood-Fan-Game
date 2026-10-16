"""Title cards + chapters -> one MP4 (all re-encoded to the same 960x540/30fps/AAC 48k stereo)."""
import subprocess
from pathlib import Path
OUT = Path("out")
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
FONT2 = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
CH = [
    ("c01", "I", "Arrival in Istvan", "the title, a new game, the opening, the streets"),
    ("c02", "II", "Beneath the Pavements", "down the market grate, through the sewer shaft"),
    ("c03", "III", "Sister Paula", "first mini boss - the blood meter wakes"),
    ("c04", "IV", "The Priest's Arts", "combo, crouch and air attacks, roll, parry, holy water, the revolver - Methuselah blood - the Codex"),
    ("c05", "V", "The Magus", "Abel's first transformation: forty percent"),
    ("c06", "VI", "The Crusnik's Arts", "transform, scythe, chain lash, high leap, slide, blood drain"),
    ("c07", "VII", "The Marchesa", "the ballroom"),
    ("c08", "VIII", "Brother Petros", "the Count's cellars"),
    ("c09", "IX", "The Cathedral", "the portal, the nave - Dietrich and his Grand Marionette"),
    ("c10", "X", "The Star of Sorrow", "Gyula - eighty percent - the ending, the credits, the next arc"),
]
ENC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2"]

def esc(t):
    return t.replace("\\", "\\\\").replace(":", "\\:").replace("'", "’").replace(",", "\\,")

def card(name, lines, secs):
    draws = []
    for text, size, y, color, font in lines:
        draws.append(f"drawtext=fontfile={font}:text='{esc(text)}':fontsize={size}:fontcolor={color}:x=(w-text_w)/2:y={y}")
    vf = ",".join(draws) + f",fade=t=in:st=0:d=0.5,fade=t=out:st={secs-0.5}:d=0.5"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", f"color=c=0x0b0a10:s=960x540:d={secs}:r=30",
                    "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", str(secs), "-vf", vf, *ENC, str(OUT / f"{name}.mp4")], check=True)

card("card_intro", [
    ("TRINITY BLOOD", 54, 150, "0xeadfc4", FONT),
    ("The Star of Sorrow", 28, 218, "0xc4a04a", FONT2),
    ("a full playthrough, played and recorded by a bot", 20, 290, "0xeadfc4", FONT2),
    ("Each chapter starts in its own room with the story so far; bosses start part-way down.", 15, 360, "0x8a8392", FONT2),
    ("Unofficial fan-made project. Not affiliated with or endorsed by the rights holders of Trinity Blood.", 13, 470, "0x8a8392", FONT2),
], 7)
parts = ["card_intro"]
for cid, num, title, sub in CH:
    card(f"card_{cid}", [(num, 30, 170, "0xd4283e", FONT), (title, 44, 220, "0xeadfc4", FONT), (sub, 17, 300, "0xc4a04a", FONT2)], 3.5)
    parts += [f"card_{cid}", cid]
# normalise every part, then concat
norm = []
for p in parts:
    n = OUT / f"n_{p}.mp4"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(OUT / f"{p}.mp4"), "-vf", "scale=960:540:flags=neighbor,fps=30,format=yuv420p", *ENC, str(n)], check=True)
    norm.append(n)
(OUT / "list.txt").write_text("".join(f"file '{n.name}'\n" for n in norm))
subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(OUT / "list.txt"), "-c", "copy", "-movflags", "+faststart", str(OUT / "playthrough.mp4")], check=True)
print("ok")
