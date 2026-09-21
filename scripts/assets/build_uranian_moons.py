#!/usr/bin/env python3
"""Build the reviewed Uranian moon maps with an existing Pillow installation."""

import argparse
from collections import deque
import hashlib
import io
import json
from pathlib import Path
import urllib.request

from PIL import Image, ImageDraw, __version__ as pillow_version


ROOT = Path(__file__).resolve().parents[2]
SOURCES = Path(__file__).with_name('uranian-moons.sources.json')
MANIFEST = ROOT / 'docs/assets/uranian-moons.manifest.json'
CONTACT_SHEET = ROOT / 'docs/assets/uranian-moons-contact-sheet.jpg'
SOURCE_DIR = ROOT / '.uranian-sources.local'
UNKNOWN_COLOR = (96, 96, 96)
BLACK_THRESHOLD = 8


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def no_data_mask(image):
    """Find near-black background connected to the top edge; keep interior shadows."""
    width, height = image.size
    rgb = image.tobytes()
    pixels = list(zip(rgb[0::3], rgb[1::3], rgb[2::3]))
    mask = bytearray(width * height)
    queue = deque()
    for x in range(width):
        if max(pixels[x]) <= BLACK_THRESHOLD:
            mask[x] = 255
            queue.append(x)
    while queue:
        index = queue.popleft()
        x, y = index % width, index // width
        adjacent = []
        if x > 0:
            adjacent.append(index - 1)
        if x + 1 < width:
            adjacent.append(index + 1)
        if y > 0:
            adjacent.append(index - width)
        if y + 1 < height:
            adjacent.append(index + width)
        for other in adjacent:
            if not mask[other] and max(pixels[other]) <= BLACK_THRESHOLD:
                mask[other] = 255
                queue.append(other)
    return Image.frombytes('L', image.size, bytes(mask))


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
        path = ROOT / expected['path']
        actual = file_record(path)
        if actual != expected:
            raise SystemExit(f'Asset verification failed: {expected["path"]}')
    print(f'Verified {len(records) - 1} moon textures and the review contact sheet.')


def build(download):
    catalog = json.loads(SOURCES.read_text())
    manifest = {
        'schemaVersion': 1,
        'sourceCatalog': SOURCES.relative_to(ROOT).as_posix(),
        'pillowVersion': pillow_version,
        'jpegEncoding': {'quality': 92, 'subsampling': 0, 'optimize': True},
        'noDataTreatment': {
            'method': '4-connected near-black region seeded from the top image edge',
            'maximumRgbChannel': BLACK_THRESHOLD,
            'replacementRgb': list(UNKNOWN_COLOR),
            'scientificFootprint': False,
        },
        'bodies': [],
    }
    sheet = Image.new('RGB', (1200, 90 + len(catalog['bodies']) * 340), '#101624')
    draw = ImageDraw.Draw(sheet)
    draw.text((20, 12), 'URANIAN MOON TEXTURE REVIEW', fill='white', font_size=24)
    draw.text((20, 48), 'Left: source mosaic. Right: app map. Plain gray means no imagery; no terrain invented.', fill='white', font_size=16)
    for row, body in enumerate(catalog['bodies']):
        path = SOURCE_DIR / body['filename']
        if not path.exists():
            if not download:
                raise SystemExit(f'Missing {path.name}; use --download to fetch locked source assets.')
            SOURCE_DIR.mkdir(exist_ok=True)
            with urllib.request.urlopen(body['downloadUrl'], timeout=60) as response:
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
        mask = no_data_mask(source)
        result = source.copy()
        result.paste(UNKNOWN_COLOR, mask=mask)
        outputs = []
        for tier, maximum_width in [('1k', 1024), ('2k', 2048)]:
            derivative = result.copy()
            # thumbnail never upscales. The native source is smaller than 2K.
            derivative.thumbnail((maximum_width, maximum_width // 2), Image.Resampling.LANCZOS)
            destination = ROOT / f'public/textures/{tier}/{body["id"]}_diffuse.jpg'
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(encode_jpeg(derivative))
            outputs.append(file_record(destination))
        manifest['bodies'].append({
            'id': body['id'],
            'sourceSha256': body['sha256'],
            'noDataPixelCount': mask.histogram()[255],
            'outputs': outputs,
        })
        top = 90 + row * 340
        draw.text((20, top), f'{body["id"].upper()} | source and detail tier: 1440 x 720 | overview: 1024 x 512', fill='white', font_size=18)
        for image, left in [(source, 20), (result, 610)]:
            preview = image.resize((570, 285), Image.Resampling.LANCZOS)
            sheet.paste(preview, (left, top + 30))
    CONTACT_SHEET.parent.mkdir(parents=True, exist_ok=True)
    CONTACT_SHEET.write_bytes(encode_jpeg(sheet))
    manifest['contactSheet'] = file_record(CONTACT_SHEET)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')
    check()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download', action='store_true', help='Download missing, hash-locked NASA sources.')
    parser.add_argument('--check', action='store_true', help='Verify committed outputs without network or changes.')
    args = parser.parse_args()
    if args.check and args.download:
        parser.error('--check and --download are mutually exclusive')
    if args.check:
        check()
    else:
        build(args.download)
