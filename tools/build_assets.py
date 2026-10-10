"""Build the game's sprite sheets from the third-party packs (see CREDITS.md).

Usage (from the repo root, with the three packs unzipped somewhere):
    uv run --with pillow python tools/build_assets.py \
        --fire  <...>/Elementals_fire_knight_FREE_v1.1 \
        --water <...>/Elementals_water_priestess_FREE_v1.1 \
        --dawnlike <...>/DawnLike

Writes web/public/assets/: fire.png, water.png, heroes.json, tiles.png, tiles.json,
SDS_8x8.ttf. Only the animations and tiles the game uses are copied, cropped tight.
"""
import argparse
import json
import re
import shutil
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "web" / "public" / "assets"
FRAME_W, FRAME_H = 128, 72          # crop of the packs' 288x128 frames, feet at the bottom
CROP_Y = 128 - FRAME_H
COLS = 8

# name -> (pack folder, fps, repeat) per hero. Crop x is chosen so the body is centred.
HEROES = {
    "fire": {
        "crop_x": 66,
        "frames_dir": "png/fire_knight",
        "anims": {
            "idle": ("01_idle", 10, -1),
            "run": ("02_run", 14, -1),
            "jump_up": ("03_jump_up", 10, 0),
            "jump_down": ("03_jump_down", 10, 0),
            "hit": ("10_take_hit", 14, 0),
            "death": ("11_death", 16, 0),
            "cast": ("09_defend", 10, -1),
        },
    },
    "water": {
        "crop_x": 81,
        "frames_dir": "png",
        "anims": {
            "idle": ("01_idle", 10, -1),
            "run": ("02_walk", 14, -1),
            "jump_up": ("04_j_up", 10, 0),
            "jump_down": ("05_j_down", 10, 0),
            "hit": ("13_take_hit", 14, 0),
            "death": ("14_death", 16, 0),
            "cast": ("11_heal", 10, -1),
        },
    },
}

# DawnLike 16x16 tiles: name -> (sheet, col, row).
TILES = {
    # Grey stone brick, a 3x3 set: corners, edges, centre. Platforms and floors.
    "brick_tl": ("Objects/Floor.png", 0, 6), "brick_t": ("Objects/Floor.png", 1, 6), "brick_tr": ("Objects/Floor.png", 2, 6),
    "brick_l": ("Objects/Floor.png", 0, 7), "brick_c": ("Objects/Floor.png", 1, 7), "brick_r": ("Objects/Floor.png", 2, 7),
    "brick_bl": ("Objects/Floor.png", 0, 8), "brick_b": ("Objects/Floor.png", 1, 8), "brick_br": ("Objects/Floor.png", 2, 8),
    # Dark brick for the temple's back wall.
    "back_c": ("Objects/Floor.png", 1, 13), "back_t": ("Objects/Floor.png", 1, 12),
    # Hanging vines and wall candles.
    **{f"vine{i}": ("Objects/Decor0.png", i, 2) for i in range(8)},
    "sconce": ("Objects/Decor0.png", 0, 8),
    "candelabra": ("Objects/Decor0.png", 2, 8),
    # Arched vault doors with elemental swirls.
    "door_fire": ("Objects/Door0.png", 3, 5),
    "door_water": ("Objects/Door0.png", 5, 5),
    "door_plain": ("Objects/Door0.png", 4, 5),
    # DawnLike's author asks that every game using it hides this fellow somewhere.
    "platino": ("Characters/Reptile0.png", 3, 12),
}


def frame_number(path):
    return int(re.search(r"_(\d+)\.png$", path.name).group(1))


def build_hero(name, spec, pack_dir):
    frames, anims = [], {}
    for anim, (folder, fps, repeat) in spec["anims"].items():
        files = sorted((pack_dir / spec["frames_dir"] / folder).glob("*.png"), key=frame_number)
        x0 = spec["crop_x"]
        start = len(frames)
        frames += [Image.open(f).convert("RGBA").crop((x0, CROP_Y, x0 + FRAME_W, 128)) for f in files]
        anims[anim] = {"start": start, "end": len(frames) - 1, "fps": fps, "repeat": repeat}
    rows = -(-len(frames) // COLS)
    sheet = Image.new("RGBA", (COLS * FRAME_W, rows * FRAME_H))
    for i, im in enumerate(frames):
        sheet.paste(im, ((i % COLS) * FRAME_W, (i // COLS) * FRAME_H))
    sheet.save(OUT / f"{name}.png", optimize=True)
    return {"frameWidth": FRAME_W, "frameHeight": FRAME_H, "anims": anims}


def build_tiles(dawnlike):
    names = list(TILES)
    sheet = Image.new("RGBA", (COLS * 16, -(-len(names) // COLS) * 16))
    for i, name in enumerate(names):
        src, c, r = TILES[name]
        tile = Image.open(dawnlike / src).convert("RGBA").crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16))
        sheet.paste(tile, ((i % COLS) * 16, (i // COLS) * 16))
    sheet.save(OUT / "tiles.png", optimize=True)
    return {name: i for i, name in enumerate(names)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fire", type=Path, required=True)
    ap.add_argument("--water", type=Path, required=True)
    ap.add_argument("--dawnlike", type=Path, required=True)
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)

    heroes = {"fire": build_hero("fire", HEROES["fire"], args.fire),
              "water": build_hero("water", HEROES["water"], args.water)}
    (OUT / "heroes.json").write_text(json.dumps(heroes, indent=1))
    (OUT / "tiles.json").write_text(json.dumps(build_tiles(args.dawnlike), indent=1))
    shutil.copy(args.dawnlike / "GUI" / "SDS_8x8.ttf", OUT / "SDS_8x8.ttf")
    for f in sorted(OUT.iterdir()):
        print(f"{f.name:14s} {f.stat().st_size:>8,d} bytes")


if __name__ == "__main__":
    main()
