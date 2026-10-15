import unittest
from pathlib import Path

import numpy as np

from tools.spritegen import texture
from tools.spritegen.palette import Palette

PAL = Palette.from_hex(Path("art/palette/requiem48.hex"))


def blob() -> np.ndarray:
    img = np.zeros((12, 10, 4), dtype=np.uint8)
    img[2:10, 2:8] = (60, 60, 64, 255)
    img[2:4, 3:7] = (230, 230, 230, 255)  # "hair"
    return img


class TextureTest(unittest.TestCase):
    def test_grade_keeps_alpha_and_bright_pixels(self):
        img = blob()
        out = texture.grade(img, 0.7)
        np.testing.assert_array_equal(out[..., 3], img[..., 3])
        self.assertTrue((out[2:4, 3:7, :3] >= 220).all())
        self.assertFalse(np.array_equal(out[6, 4, :3], img[6, 4, :3]))  # dark cloth is tinted

    def test_shade_uses_palette_colours_and_keeps_shape(self):
        img = blob()
        img[img[..., 3] > 0, :3] = PAL.colours[PAL.nearest_index(img[img[..., 3] > 0, :3])]
        out = texture.shade(img, PAL)
        np.testing.assert_array_equal(out[..., 3], img[..., 3])
        cols = {tuple(c) for c in PAL.colours.tolist()}
        for c in out[out[..., 3] > 0, :3].tolist():
            self.assertIn(tuple(c), cols)

    def test_grade_zero_is_identity(self):
        img = blob()
        self.assertIs(texture.grade(img, 0), img)


if __name__ == "__main__":
    unittest.main()
