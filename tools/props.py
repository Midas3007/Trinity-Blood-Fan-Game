"""Draws prop sprites as original pixel art in the Requiem palette: the altar (48x64) and the dove (2 frames, 16x12).
Usage: python3 -I tools/props.py"""
from pathlib import Path
from PIL import Image

H = lambda s: tuple(int(s[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
C = {k: H(v) for k, v in dict(
    void="0b0a10", k2="1c1826", k3="251f30", k4="2e2836", g1="3b3444", g2="4a4252", g3="5c5464", g4="6f6676", g5="8a8392",
    g6="a59fb0", w1="c9c2d6", w2="ddd7e6", w3="efeaf2", r2="4a0f1b", r3="6a1524", r4="8e1b2c", r5="ad2a3a", b2="5a3618",
    b3="7a4a1e", y1="9c7a2c", y2="c4a04a", y3="e8c86a", y4="f6e3a3", o1="d9963a", u2="4f7c9e").items()}


def rect(px, x0, y0, x1, y1, c):
    for y in range(y0, y1):
        for x in range(x0, x1):
            px[x, y] = C[c]


def altar():
    im = Image.new("RGBA", (48, 64), (0, 0, 0, 0)); px = im.load()
    # retable (gilded altarpiece) with an arched top
    rect(px, 6, 10, 42, 46, "y1")
    for y in range(2, 12):
        half = int(18 * (1 - ((11 - y) / 10) ** 2) ** 0.5) if y < 11 else 18
        rect(px, 24 - half, y, 24 + half, y + 1, "y1")
    rect(px, 9, 13, 39, 44, "r2")                       # deep red panel
    for y in range(5, 13):                               # arch inner
        half = int(14 * (1 - ((12 - y) / 8) ** 2) ** 0.5) if y < 12 else 14
        rect(px, 24 - half, y, 24 + half, y + 1, "r2")
    rect(px, 6, 10, 7, 46, "y3"); rect(px, 41, 10, 42, 46, "b3")   # frame light / shadow
    rect(px, 7, 44, 41, 46, "b3")
    # crucifix
    rect(px, 23, 9, 25, 36, "y2"); rect(px, 18, 15, 30, 17, "y2"); rect(px, 23, 9, 24, 36, "y4"); rect(px, 18, 15, 30, 16, "y4")
    rect(px, 23, 17, 25, 26, "w1")                       # corpus
    # niches with saints
    for nx in (12, 32):
        rect(px, nx, 20, nx + 4, 34, "k3"); rect(px, nx + 1, 22, nx + 3, 33, "w1"); rect(px, nx + 1, 21, nx + 3, 23, "y3")
    # pillars and finials
    for x in (6, 40):
        rect(px, x, 4, x + 2, 10, "y2"); px[x, 3] = C["y3"]
    # altar table with white cloth, gold border and red cross
    rect(px, 4, 44, 44, 56, "w2"); rect(px, 4, 44, 44, 45, "w3"); rect(px, 4, 55, 44, 56, "g5")
    rect(px, 4, 46, 44, 47, "y2"); rect(px, 4, 53, 44, 54, "y2")
    rect(px, 23, 48, 25, 53, "r4"); rect(px, 21, 49, 27, 51, "r4")
    rect(px, 5, 47, 6, 53, "w1"); rect(px, 42, 47, 43, 53, "g6")
    # tabernacle
    rect(px, 20, 38, 28, 44, "y2"); rect(px, 21, 39, 27, 43, "y3"); rect(px, 23, 40, 25, 43, "r4"); rect(px, 20, 37, 28, 38, "y4")
    # candlesticks with candles and flames
    for x in (9, 37):
        rect(px, x, 40, x + 3, 44, "y2"); rect(px, x + 1, 31, x + 2, 40, "w3"); px[x + 1, 29] = C["o1"]; px[x + 1, 30] = C["y4"]
    # stone steps
    rect(px, 0, 56, 48, 60, "g3"); rect(px, 0, 56, 48, 57, "g5"); rect(px, 2, 60, 46, 64, "g2"); rect(px, 2, 60, 46, 61, "g4")
    return im


def dove():
    im = Image.new("RGBA", (32, 12), (0, 0, 0, 0)); px = im.load()
    for f, up in ((0, True), (1, False)):
        ox = f * 16
        rect(px, ox + 5, 6, ox + 12, 9, "w3")            # body
        rect(px, ox + 11, 5, ox + 14, 8, "w3"); px[ox + 13, 6] = C["void"]; px[ox + 14, 7] = C["o1"]   # head, eye, beak
        rect(px, ox + 2, 7, ox + 5, 9, "w2")             # tail
        rect(px, ox + 5, 8, ox + 12, 9, "w1")            # belly shade
        if up:
            for i in range(5):
                rect(px, ox + 6 + i, 1 + i // 2, ox + 7 + i, 6, "w3" if i % 2 else "w2")
        else:
            for i in range(5):
                rect(px, ox + 6 + i, 8, ox + 7 + i, 11 - i // 2, "w2" if i % 2 else "w1")
    return im


if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / "public/assets/props"
    out.mkdir(parents=True, exist_ok=True)
    altar().save(out / "altar.png"); dove().save(out / "dove.png")
    print("props written")
