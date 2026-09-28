#!/usr/bin/env python3
"""Build the reviewed Amalthea, Nix and Hydra maps with an existing Pillow installation."""

import argparse
import hashlib
import io
import json
from pathlib import Path
import urllib.request

from PIL import Image, ImageDraw, __version__ as pillow_version


ROOT = Path(__file__).resolve().parents[2]
SOURCES = Path(__file__).with_name('small-moons.sources.json')
MANIFEST = ROOT / 'docs/assets/small-moons.manifest.json'
CONTACT_SHEET = ROOT / 'docs/assets/small-moons-contact-sheet.jpg'
SOURCE_DIR = ROOT / '.small-moon-sources.local'


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def encode_jpeg(image):
    output = io.BytesIO()
    # Fresh pixel buffer excludes source EXIF/XMP and unknown embedded profiles.
    clean = Image.frombytes('RGB', image.size, image.tobytes())
    clean.save(output, format='JPEG', quality=92, subsampling=0, optimize=True)
    return output.getvalue()


def file_record(path):
    data = path.read_bytes()
    with Image.open(io.BytesIO(data)) as image:
        width, height = image.size
    return {
        'path': path.relative_to(ROOT).as_posix(),
        'width': width,
        'height': height,
        'bytes': len(data),
        'sha256': sha256(data),
    }


def check():
    manifest = json.loads(MANIFEST.read_text())
    records = [record for body in manifest['bodies'] for record in body['outputs']]
    records.append(manifest['contactSheet'])
    for expected in records:
        if file_record(ROOT / expected['path']) != expected:
            raise SystemExit(f'Asset verification failed: {expected["path"]}')
    print(f'Verified {len(records) - 1} moon textures and the review contact sheet.')


def blend_wrap(image, band):
    """Cross-fade a narrow band at each edge so the left and right edges meet."""
    width = image.width
    left = image.crop((0, 0, band, image.height))
    right = image.crop((width - band, 0, width, image.height))
    mirrored_right = right.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    mirrored_left = left.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    # Weight 0.5 at the edge column, falling to 0 at the inner edge of the band.
    ramp = Image.linear_gradient('L').rotate(90, expand=True).resize((band, image.height))
    left_mask = ramp.transpose(Image.Transpose.FLIP_LEFT_RIGHT).point(lambda value: value // 2)
    right_mask = left_mask.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    result = image.copy()
    result.paste(Image.composite(mirrored_right, left, left_mask), (0, 0))
    result.paste(Image.composite(mirrored_left, right, right_mask), (width - band, 0))
    return result


def load_source(body, download):
    path = SOURCE_DIR / body['filename']
    if not path.exists():
        if not download:
            raise SystemExit(f'Missing {path.name}; use --download to fetch locked source assets.')
        SOURCE_DIR.mkdir(exist_ok=True)
        request = urllib.request.Request(body['downloadUrl'], headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(request, timeout=60) as response:
            data = response.read()
        if sha256(data) != body['sha256']:
            raise SystemExit(f'Source changed: {body["id"]}. Review it before updating the lock.')
        path.write_bytes(data)
    data = path.read_bytes()
    if sha256(data) != body['sha256']:
        raise SystemExit(f'Source checksum mismatch: {body["id"]}')
    with Image.open(io.BytesIO(data)) as opened:
        source = opened.convert('RGB')
    if list(source.size) != body['dimensions']:
        raise SystemExit(f'Source dimensions changed: {body["id"]}')
    return source


def build(download):
    catalog = json.loads(SOURCES.read_text())
    manifest = {
        'schemaVersion': 1,
        'sourceCatalog': SOURCES.relative_to(ROOT).as_posix(),
        'pillowVersion': pillow_version,
        'jpegEncoding': {'quality': 92, 'subsampling': 0, 'optimize': True},
        'bodies': [],
    }
    sheet = Image.new('RGB', (1200, 90 + len(catalog['bodies']) * 340), '#101624')
    draw = ImageDraw.Draw(sheet)
    draw.text((20, 12), 'SMALL MOON TEXTURE REVIEW', fill='white', font_size=24)
    draw.text((20, 48), 'Left: source map. Right: app overview map. Resized only; no terrain invented.', fill='white', font_size=16)
    for row, body in enumerate(catalog['bodies']):
        source = load_source(body, download)
        prepared = blend_wrap(source, body['seamBlendPx']) if 'seamBlendPx' in body else source
        outputs = []
        for tier, maximum_width in body['tiers']:
            derivative = prepared.copy()
            # thumbnail never upscales.
            derivative.thumbnail((maximum_width, maximum_width // 2), Image.Resampling.LANCZOS)
            destination = ROOT / f'public/textures/{tier}/{body["id"]}_diffuse.jpg'
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(encode_jpeg(derivative))
            outputs.append(file_record(destination))
        manifest['bodies'].append({'id': body['id'], 'sourceSha256': body['sha256'], 'outputs': outputs})
        top = 90 + row * 340
        sizes = ' | '.join(f'{record["width"]} x {record["height"]}' for record in outputs)
        draw.text((20, top), f'{body["id"].upper()} | source {body["dimensions"][0]} x {body["dimensions"][1]} | app {sizes}', fill='white', font_size=18)
        overview = Image.open(ROOT / outputs[0]['path'])
        for image, left in [(source, 20), (overview, 610)]:
            sheet.paste(image.resize((570, 285), Image.Resampling.LANCZOS), (left, top + 30))
    CONTACT_SHEET.parent.mkdir(parents=True, exist_ok=True)
    CONTACT_SHEET.write_bytes(encode_jpeg(sheet))
    manifest['contactSheet'] = file_record(CONTACT_SHEET)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')
    check()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download', action='store_true', help='Download missing, hash-locked sources.')
    parser.add_argument('--check', action='store_true', help='Verify committed outputs without network or changes.')
    args = parser.parse_args()
    if args.check and args.download:
        parser.error('--check and --download are mutually exclusive')
    if args.check:
        check()
    else:
        build(args.download)
