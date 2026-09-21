#!/usr/bin/env python3
"""Prepare NASA's faint-star background; requires existing ffmpeg, NumPy and Pillow."""

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import urllib.request

import numpy as np
from PIL import Image, ImageDraw, __version__ as pillow_version

ROOT = Path(__file__).resolve().parents[2]
SOURCE_URL = "https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004851/milkyway_2020_4k.exr"
SOURCE_SHA256 = "2eb802d6e68d170b410f766c7fec07f7518619f6b6708fdc81e9302d93e74fdb"
CREDIT = "NASA/Goddard Space Flight Center Scientific Visualization Studio. Gaia DR2: ESA/Gaia/DPAC."
WIDTH, HEIGHT = 4096, 2048


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def encode(linear):
    exposed = np.maximum(linear, 0) * np.float32(2.0)
    mapped = exposed / (1 + exposed)
    srgb = np.where(mapped <= 0.0031308, mapped * 12.92, 1.055 * mapped ** (1 / 2.4) - 0.055)
    return Image.fromarray(np.rint(np.clip(srgb, 0, 1) * 255).astype(np.uint8))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT / "dist/asset-source-nasa/milkyway_2020_4k.exr")
    parser.add_argument("--download", action="store_true", help="Download the pinned source if it is absent")
    args = parser.parse_args()
    if not args.source.exists() and args.download:
        args.source.parent.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(SOURCE_URL, timeout=60) as response:
            args.source.write_bytes(response.read())
    if not args.source.exists():
        parser.error("Source is absent; provide --source or explicitly allow --download")
    if digest(args.source) != SOURCE_SHA256:
        raise ValueError("Source checksum differs; inspect the source before changing the pinned checksum")
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        parser.error("ffmpeg is required; this script does not install dependencies")

    # Match the decoder's native half-float planar output; planes are G, B, R.
    command = [ffmpeg, "-v", "error", "-i", str(args.source), "-frames:v", "1",
               "-f", "rawvideo", "-pix_fmt", "gbrpf16le", "-"]
    raw = subprocess.check_output(command)
    planes = np.frombuffer(raw, dtype="<f2").astype(np.float32).reshape(3, HEIGHT, WIDTH)
    linear = np.stack((planes[2], planes[0], planes[1]), axis=-1)
    if not np.isfinite(linear).all() or linear.min() < 0:
        raise ValueError("Unexpected non-finite or negative source pixels")

    destination = ROOT / "public/textures/skybox"
    documentation = ROOT / "docs/assets"
    destination.mkdir(parents=True, exist_ok=True)
    documentation.mkdir(parents=True, exist_ok=True)
    outputs = []
    rendered = {}
    for width in (2048, 4096):
        # Exact 2x2 area averaging in linear light, before the display curve.
        pixels = linear if width == WIDTH else linear.reshape(1024, 2, 2048, 2, 3).mean(axis=(1, 3))
        path = destination / f"galaxy_milky_way_{width // 1024}k.jpg"
        image = encode(pixels)
        image.save(path, quality=92, subsampling=0, optimize=True)
        rendered[width] = image
        outputs.append({
            "path": str(path.relative_to(ROOT)), "width": width, "height": width // 2,
            "bytes": path.stat().st_size, "sha256": digest(path),
            "colorSpace": "sRGB", "rgbaBaseBytes": width * (width // 2) * 4,
        })

    sheet = Image.new("RGB", (1600, 1270), "#10131b")
    draw = ImageDraw.Draw(sheet)
    draw.text((32, 16), "NASA Milky Way background / J2000 equatorial / source orientation preserved", fill="white", font_size=23)
    draw.text((32, 50), "North up. RA increases left. Center RA 0h; seam RA 12h. No bright-star foreground added.", fill="#c5d2e3", font_size=19)
    overview = rendered[4096].resize((1536, 768), Image.Resampling.LANCZOS)
    sheet.paste(overview, (32, 84))
    draw = ImageDraw.Draw(sheet)
    for ra, label in [(180, "12h"), (90, "6h"), (0, "0h"), (270, "18h")]:
        u = (0.5 - ra / 360) % 1
        x = 32 + round(u * 1536)
        draw.line((x, 84, x, 852), fill="#40536b", width=1)
        draw.text((x + 4, 90), label, fill="#a9dfff", font_size=18)
    for dec in (60, 0, -60):
        y = 84 + round((0.5 - dec / 180) * 768)
        draw.line((32, y, 1568, y), fill="#40536b", width=1)
        draw.text((38, y + 4), f"Dec {dec:+d}", fill="#a9dfff", font_size=16)
    # Coarse landmarks for visual orientation; not a source of catalogue positions.
    for name, ra, dec in [("Galactic center region", 266.4, -29.0), ("LMC", 80.9, -69.8), ("SMC", 13.2, -72.8)]:
        x = 32 + round(((0.5 - ra / 360) % 1) * 1536)
        y = 84 + round((0.5 - dec / 180) * 768)
        draw.ellipse((x-5, y-5, x+5, y+5), outline="#ffd08b", width=2)
        draw.text((x + 9, y - 10), name, fill="#ffd08b", font_size=16)
    for index, width in enumerate((2048, 4096)):
        # Same 768x256 source-pixel region, shown at the same angular scale.
        factor = width / 4096
        box = tuple(round(value * factor) for value in (2680, 1080, 3448, 1336))
        crop = Image.open(destination / f"galaxy_milky_way_{width // 1024}k.jpg").crop(box).resize((736, 245), Image.Resampling.NEAREST)
        x = 32 + index * 800
        sheet.paste(crop, (x, 902))
        draw.text((x, 874), f"{width // 1024}K delivered JPEG / matched angular crop", fill="white", font_size=19)
    draw.text((32, 1170), "+1 stop exposure; per-channel Reinhard; linear to sRGB; JPEG quality 92, no chroma subsampling.", fill="#c5d2e3", font_size=18)
    draw.text((32, 1203), CREDIT, fill="#c5d2e3", font_size=17)
    draw.text((32, 1234), "Display-enhanced catalogue visualization, not an unaided-eye visibility simulation.", fill="#c5d2e3", font_size=17)
    contact_path = documentation / "nasa-celestial-sky-contact.jpg"
    sheet.save(contact_path, quality=90, subsampling=0, optimize=True)

    metadata = {
        "sourcePage": "https://svs.gsfc.nasa.gov/4851/", "sourceUrl": SOURCE_URL,
        "sourceSha256": SOURCE_SHA256, "sourceBytes": args.source.stat().st_size,
        "credit": CREDIT, "license": "Public domain under the NASA SVS policy unless otherwise noted; no asset-specific restriction listed",
        "licenseUrl": "https://svs.gsfc.nasa.gov/help/", "verifiedDate": "2026-09-21",
        "sourceDescription": "Milky Way background in celestial coordinates, omitting the bright Hipparcos and Tycho stars",
        "frame": "ICRF/J2000 geocentric right ascension and declination",
        "projection": "plate carree / equirectangular, unchanged from source",
        "rasterMapping": {"u": "fract(0.5 - raDegrees / 360)", "yFromTop": "0.5 - decDegrees / 180",
                          "centerRaHours": 0, "seamRaHours": 12, "raIncreases": "left", "north": "top"},
        "processing": {"decode": "FFmpeg native gbrpf16le output; reorder G,B,R to R,G,B",
                       "resize": "2K uses exact 2x2 area average in linear light; 4K native dimensions",
                       "exposureStops": 1, "toneCurve": "per-channel x/(1+x), x=2*linearSource",
                       "transfer": "IEC sRGB piecewise encoding", "jpegQuality": 92, "jpegSubsampling": 0,
                       "addedContent": "none", "rotationOrFlip": "none"},
        "toolVersions": {"ffmpeg": subprocess.check_output([ffmpeg, "-version"], text=True).splitlines()[0],
                         "numpy": np.__version__, "pillow": pillow_version},
        "outputs": outputs,
        "contactSheet": {"path": str(contact_path.relative_to(ROOT)), "sha256": digest(contact_path)},
    }
    (documentation / "nasa-celestial-sky.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps(outputs, indent=2))


if __name__ == "__main__":
    main()
