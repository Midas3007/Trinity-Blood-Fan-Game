"""CLI: python3 -E -s -m tools.spritegen <command> (run from the repo root). See docs/sprite-pipeline.md §4.3."""
from __future__ import annotations

import logging
import sys
from pathlib import Path

import click

from . import requiem48
from .palette import Palette

DEFAULT_PALETTE = Path("art/palette/requiem48.hex")


@click.group()
@click.option("-v", "--verbose", is_flag=True)
def cli(verbose: bool) -> None:
    logging.basicConfig(level=logging.INFO if verbose else logging.WARNING, format="%(levelname)s %(message)s")


@cli.command("palette")
@click.option("--out", type=click.Path(path_type=Path), default=Path("art/palette"))
def palette_cmd(out: Path) -> None:
    """Write requiem48.hex, requiem16.hex and the swatch PNG."""
    hex48, png = requiem48.write(out)
    click.echo(f"wrote {hex48} and {png} ({len(requiem48.colours())} colours)")


@cli.command()
@click.option("--input", "src", required=True, type=click.Path(exists=True, path_type=Path))
@click.option("--out", type=click.Path(path_type=Path), default=None)
@click.option("--palette", "pal_path", type=click.Path(exists=True, path_type=Path), default=DEFAULT_PALETTE)
@click.option("--heights", default="36,40,44")
@click.option("--methods", default="area,nearest")
@click.option("--outlines", default="selective,uniform")
@click.option("--figure", default=0, help="Which figure on a multi-figure sheet (0 = leftmost).")
@click.option("--cell", default=64)
@click.option("--zoom", default=4)
@click.option("--open-px", default=0, help="Remove thin lines (e.g. a drawn ground line) thinner than 2n+1 px.")
@click.option("--dither", is_flag=True)
@click.option("--gammas", default="1.0", help="Tone gammas to compare: <1 lifts shadows, >1 darkens mid-tones.")
@click.option("--squeezes", default="1.0", help="Width factors to compare before pixelation, e.g. 1.0,0.9.")
def preview(src, out, pal_path, heights, methods, outlines, figure, cell, zoom, open_px, dither, gammas, squeezes) -> None:
    """Contact sheet of one figure at several sizes/methods/outlines (the tuning tool)."""
    from .preview import contact_sheet

    pal = Palette.from_hex(pal_path)
    sheet = contact_sheet(src, pal, [int(h) for h in heights.split(",")], methods.split(","), outlines.split(","),
                          figure, zoom, cell, open_px, dither, [float(g) for g in gammas.split(",")],
                          [float(q) for q in squeezes.split(",")])
    out = out or Path("art/preview") / f"{src.stem}_fig{figure}_preview.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    click.echo(f"wrote {out}")


@cli.command("approve")
@click.option("--input", "src", required=True, type=click.Path(exists=True, path_type=Path))
@click.option("--entity", required=True)
@click.option("--animation", required=True)
@click.option("--figures", default=None, help="Comma-separated figure indexes to keep (default: all).")
@click.option("--names", default=None, help="Comma-separated output names, one per kept figure.")
@click.option("--sprite-height", default=40)
@click.option("--ref-height", default=None, type=int, help="Source px of a standing figure (default: tallest on the sheet).")
@click.option("--open-px", default=0)
def approve_cmd(src, entity, animation, figures, names, sprite_height, ref_height, open_px) -> None:
    """Key, split and shrink an approved raw generation into art/source/approved/<entity>/<animation>/."""
    from .approve import approve

    out = Path("art/source/approved") / entity / animation
    figs = [int(f) for f in figures.split(",")] if figures else None
    for p in approve(src, out, sprite_height, figs, ref_height, open_px, names.split(",") if names else None):
        click.echo(f"wrote {p}")


@cli.command()
@click.option("--config", "cfg_path", type=click.Path(exists=True, path_type=Path), default=Path("tools/spritegen/pipeline.yaml"))
@click.option("--entity", default=None, help="Only build this entity.")
def build(cfg_path: Path, entity: str | None) -> None:
    """Build sheets + manifests for every entity/animation that has approved sources."""
    from .build import build_all

    for line in build_all(cfg_path, entity):
        click.echo(line)


@cli.command()
@click.argument("root", type=click.Path(path_type=Path), default=Path("public/assets/sprites"))
@click.option("--palette", "pal_path", type=click.Path(exists=True, path_type=Path), default=DEFAULT_PALETTE)
def validate(root: Path, pal_path: Path) -> None:
    """Check shipped sheets: palette-only colours, binary alpha, cell sizes, pivots, no clipping."""
    from .validate import validate_dir

    if not root.exists():
        click.echo(f"{root}: nothing to validate yet")
        return
    problems, hists = validate_dir(root, Palette.from_hex(pal_path))
    for name, hist in hists.items():
        click.echo(f"{name}: {len(hist)} colours, {sum(hist.values())} opaque px")
    for p in problems:
        click.echo(f"FAIL {p}", err=True)
    if problems:
        sys.exit(1)
    click.echo(f"ok: {len(hists)} sheet(s) valid")


if __name__ == "__main__":
    cli()
