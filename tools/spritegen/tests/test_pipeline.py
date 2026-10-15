"""Run: python3 -E -s -m unittest discover -s tools/spritegen/tests -t . (from the repo root), or npm run sprites:test."""
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

from tools.spritegen import alpha, cleanup, crop, downscale, outline, pack, quantize, requiem48, split, tone
from tools.spritegen.manifest import build as build_manifest, write as write_manifest
from tools.spritegen.palette import Palette, ciede2000, load_hex, srgb_to_lab
from tools.spritegen.validate import validate_sheet

MAGENTA = (255, 0, 255, 255)


def canvas(w: int, h: int) -> np.ndarray:
    img = np.zeros((h, w, 4), dtype=np.uint8)
    img[:] = MAGENTA
    return img


def pal48() -> Palette:
    return Palette(np.array([[int(c[i : i + 2], 16) for i in (0, 2, 4)] for c in requiem48.colours()], dtype=np.uint8))


class PaletteTests(unittest.TestCase):
    def test_requiem48_has_48_unique_colours_and_keeps_the_16_anchors(self):
        cols = requiem48.colours()
        self.assertEqual(len(cols), 48)
        self.assertEqual(len(set(cols)), 48)
        self.assertEqual(len(requiem48.anchors()), 16)
        for a in ["0b0a10", "8e1b2c", "c9c2d6", "7fb6d6", "e8c86a"]:
            self.assertIn(a, cols)

    def test_ciede2000_matches_reference_values(self):
        # Sharma, Wu & Dalal (2005) test pairs.
        pairs = [((50, 2.6772, -79.7751), (50, 0, -82.7485), 2.0425), ((50, 0, 0), (50, -1, 2), 2.3669),
                 ((50, 2.5, 0), (73, 25, -18), 27.1492)]
        for a, b, expected in pairs:
            self.assertAlmostEqual(float(ciede2000(np.array(a, float), np.array(b, float))), expected, places=3)

    def test_lab_of_white_is_100(self):
        self.assertAlmostEqual(float(srgb_to_lab(np.array([255, 255, 255], np.uint8))[0]), 100, places=3)

    def test_hex_loading_ignores_comments(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "p.hex"
            p.write_text("; header\n#ff0000 ; red\n00ff00\n")
            self.assertEqual(load_hex(p).tolist(), [[255, 0, 0], [0, 255, 0]])

    def test_exact_palette_colours_map_to_themselves(self):
        pal = pal48()
        self.assertEqual(pal.nearest_index(pal.colours).tolist(), list(range(48)))


class AlphaAndSplitTests(unittest.TestCase):
    def test_magenta_becomes_transparent_and_alpha_is_binary(self):
        img = canvas(40, 40)
        img[10:30, 10:30] = (40, 40, 60, 255)
        img[9, 10:30] = (200, 60, 190, 255)  # pink fringe
        out = alpha.key(img, erode=0)
        self.assertTrue(set(np.unique(out[..., 3])) <= {0, 255})
        self.assertEqual(int((out[..., 3] == 255).sum()), 400)

    def test_specks_removed_and_small_holes_filled(self):
        img = canvas(40, 40)
        img[5:25, 5:25] = (40, 40, 60, 255)
        img[12, 12] = MAGENTA  # 1 px hole
        img[35, 35] = (40, 40, 60, 255)  # 1 px speck
        out = alpha.key(img, erode=0)
        self.assertEqual(out[12, 12, 3], 255)
        self.assertEqual(out[35, 35, 3], 0)

    def test_opening_removes_a_thin_ground_line(self):
        img = canvas(60, 40)
        img[5:30, 5:15] = (40, 40, 60, 255)
        img[5:30, 40:50] = (40, 40, 60, 255)
        img[31:33, :] = (10, 10, 10, 255)  # 2 px line joining both figures
        keyed = alpha.key(img, erode=0, open_px=2)
        self.assertEqual(len(split.figures(keyed)), 2)

    def test_split_with_expected_count_separates_touching_figures(self):
        img = canvas(120, 40)
        for x0 in (10, 50, 90):
            img[5:35, x0 : x0 + 14] = (40, 40, 60, 255)
        img[30:32, 24:50] = (40, 40, 60, 255)  # a coat tail bridging figure 1 and 2
        keyed = alpha.key(img, erode=0)
        self.assertEqual(len(split.figures(keyed)), 2)  # gap-based split merges them
        figs = split.figures_expected(keyed, 3)
        self.assertEqual(len(figs), 3)

    def test_split_finds_figures_left_to_right(self):
        img = canvas(100, 30)
        for x0 in (5, 40, 75):
            img[5:25, x0 : x0 + 15] = (40, 40, 60, 255)
        figs = split.figures(alpha.key(img, erode=0))
        self.assertEqual(len(figs), 3)


class ScaleQuantizeOutlineTests(unittest.TestCase):
    def test_area_downscale_keeps_binary_alpha_and_size(self):
        img = np.zeros((80, 40, 4), np.uint8)
        img[:, :] = (100, 50, 50, 255)
        out = downscale.scale(img, 0.25, "area")
        self.assertEqual(out.shape[:2], (20, 10))
        self.assertTrue(set(np.unique(out[..., 3])) <= {0, 255})

    def test_quantize_outputs_only_palette_colours(self):
        pal = pal48()
        rng = np.random.default_rng(1)
        img = np.concatenate([rng.integers(0, 256, (16, 16, 3), dtype=np.uint8), np.full((16, 16, 1), 255, np.uint8)], -1)
        out = quantize.quantize(img, pal)
        self.assertTrue(all(pal.contains(tuple(c)) for c in out[..., :3].reshape(-1, 3)))

    def test_gamma_lifts_shadows(self):
        img = np.zeros((1, 1, 4), np.uint8)
        img[0, 0] = (20, 20, 20, 255)
        self.assertGreater(int(tone.gamma(img, 0.7)[0, 0, 0]), 20)

    def test_outline_rings_the_outside_only(self):
        pal = pal48()
        img = np.zeros((10, 10, 4), np.uint8)
        img[3:7, 3:7] = (201, 194, 214, 255)
        out = outline.outline(img, pal, "uniform")
        self.assertEqual(tuple(out[2, 2, :3]), outline.OUTLINE)
        self.assertEqual(tuple(out[5, 5, :3]), (201, 194, 214))
        sel = outline.outline(img, pal, "selective")
        self.assertEqual(tuple(sel[5, 2, :3]), outline.OUTLINE)  # side edge stays dark
        self.assertTrue(pal.contains(tuple(sel[2, 5, :3])))  # top edge uses a palette colour

    def test_cleanup_fixes_orphans_and_drops_single_pixels(self):
        img = np.zeros((9, 9, 4), np.uint8)
        img[1:6, 1:6] = (46, 40, 54, 255)
        img[3, 3] = (239, 234, 242, 255)  # orphan
        img[0, 8] = (46, 40, 54, 255)  # isolated pixel, not touching the block
        out = cleanup.cleanup(img, 2)
        self.assertEqual(tuple(out[3, 3, :3]), (46, 40, 54))
        self.assertEqual(out[0, 8, 3], 0)


class PlacePackValidateTests(unittest.TestCase):
    def make_frame(self, h=40, offset=0):
        fig = np.zeros((h + 2, 16, 4), np.uint8)
        fig[1:-1, 4:12] = (46, 40, 54, 255)
        fig[1, 4 + offset] = (11, 10, 16, 255)
        return fig

    def test_place_puts_feet_on_the_bottom_row_centred(self):
        cell, meta = crop.place(self.make_frame(), (64, 64))
        rows = np.nonzero(cell[..., 3].any(axis=1))[0]
        self.assertEqual(rows.max(), 63)  # feet land on the bottom row (pivot at y = 64)
        cols = np.nonzero(cell[..., 3].any(axis=0))[0]
        self.assertAlmostEqual((cols.min() + cols.max() + 1) / 2, 32, delta=1)
        self.assertFalse(meta["clipped"])

    def test_pack_validate_round_trip_and_determinism(self):
        pal = Palette(np.array([[46, 40, 54], [11, 10, 16]], np.uint8), "test.hex")
        frames = [crop.place(self.make_frame(), (64, 64))[0] for _ in range(3)]
        sheet, cols = pack.pack(frames)
        with tempfile.TemporaryDirectory() as d:
            outs = []
            for run in range(2):
                png = Path(d) / f"run{run}" / "abel_idle.png"
                png.parent.mkdir()
                Image.fromarray(sheet, "RGBA").save(png, optimize=True)
                write_manifest(png.with_suffix(".json"), build_manifest("abel_idle.png", "abel", "idle", (64, 64), cols, 3, {"loop": True, "durations_ms": 150}, "test.hex", ["sha256:x"]))
                outs.append(png.read_bytes() + png.with_suffix(".json").read_bytes())
                problems, hist = validate_sheet(png, pal)
                self.assertEqual(problems, [])
            self.assertEqual(outs[0], outs[1])

    def test_validate_catches_off_palette_and_clipping(self):
        pal = Palette(np.array([[46, 40, 54]], np.uint8), "t.hex")
        frame = np.zeros((64, 64, 4), np.uint8)
        frame[0, 10] = (46, 40, 54, 255)  # touches top edge
        frame[30, 30] = (1, 2, 3, 255)  # off palette
        with tempfile.TemporaryDirectory() as d:
            png = Path(d) / "x_idle.png"
            Image.fromarray(frame, "RGBA").save(png)
            write_manifest(png.with_suffix(".json"), build_manifest("x_idle.png", "x", "idle", (64, 64), 1, 1, {}, "t.hex", []))
            problems, _ = validate_sheet(png, pal)
            self.assertTrue(any("off-palette" in p for p in problems))
            self.assertTrue(any("touches the cell edge" in p for p in problems))

    def test_manifest_rejects_wrong_duration_count(self):
        with self.assertRaises(ValueError):
            build_manifest("a.png", "a", "idle", (64, 64), 2, 2, {"durations_ms": [1, 2, 3]}, "p", [])
        m = build_manifest("a.png", "a", "priest1", (64, 64), 3, 3, {"attack": "priest1"}, "p", [])
        self.assertEqual(json.loads(json.dumps(m))["animations"]["priest1"]["attack"], "priest1")


if __name__ == "__main__":
    unittest.main()
