#!/usr/bin/env python3
"""Build replacement body maps from hash-locked, liberally licensed sources.

Each catalog entry may: roll longitude, fill large polar black no-data with
neutral gray, reduce enhanced color saturation, apply a uniform tint
to a grayscale mosaic, or copy the publisher's file unmodified. Every step is
recorded in docs/assets/public-domain-maps.md.
"""

import argparse
import hashlib
import io
import json
from pathlib import Path
import shutil
import urllib.request

import numpy as np
from PIL import Image, ImageEnhance, __version__ as pillow_version
from scipy import ndimage

Image.MAX_IMAGE_PIXELS = None  # USGS mosaics exceed Pillow's decompression-bomb guard.

ROOT = Path(__file__).resolve().parents[2]
SOURCES = Path(__file__).with_name('public-domain-maps.sources.json')
MANIFEST = ROOT / 'docs/assets/public-domain-maps.manifest.json'
SOURCE_DIR = ROOT / '.public-domain-sources.local'
TIERS = [('1k', 1024), ('2k', 2048)]


def sha256_file(path):
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b''):
            digest.update(chunk)
    return digest.hexdigest()


def encode_jpeg(image):
    output = io.BytesIO()
    clean = Image.frombytes('RGB', image.size, image.tobytes())
    clean.save(output, format='JPEG', quality=90, subsampling=0, optimize=True)
    return output.getvalue()


def file_record(path):
    with Image.open(path) as image:
        width, height = image.size
    return {'path': path.relative_to(ROOT).as_posix(), 'width': width, 'height': height,
            'bytes': path.stat().st_size, 'sha256': sha256_file(path)}


def source_path(body, download):
    path = SOURCE_DIR / body['filename']
    if not path.exists():
        if not download:
            raise SystemExit(f'Missing {path.name}; use --download to fetch locked sources.')
        SOURCE_DIR.mkdir(exist_ok=True)
        request = urllib.request.Request(body['downloadUrl'], headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(request, timeout=600) as response, path.open('wb') as handle:
            shutil.copyfileobj(response, handle)
    if sha256_file(path) != body['sha256']:
        raise SystemExit(f'Source checksum mismatch: {body["id"]}. Review it before updating the lock.')
    return path


def fill_no_data(image, threshold):
    """Replace large black regions near the poles with neutral gray at the map's median brightness.

    Seeds from the top and bottom 5% of rows because some mosaics keep a thin
    non-black strip at the very edge; small dark craters elsewhere are untouched.
    """
    pixels = np.asarray(image)
    dark = pixels.max(axis=2) <= threshold
    labels, _ = ndimage.label(dark)
    band = max(1, image.height // 20)
    edge_labels = np.setdiff1d(np.union1d(labels[:band].ravel(), labels[-band:].ravel()), [0])
    sizes = ndimage.sum_labels(dark, labels, edge_labels)
    large = edge_labels[sizes >= dark.size * 0.0005]
    mask = np.isin(labels, large)
    gray = int(np.median(pixels[~mask].mean(axis=1)))
    filled = pixels.copy()
    filled[mask] = gray
    return Image.fromarray(filled), float(mask.mean())


def prepare(body, path):
    with Image.open(path) as opened:
        image = opened.convert('RGB')
    source_size = list(image.size)
    # Shrink early: the largest sources are ~20k px wide and only 2048 px ships.
    factor = max(1, image.width // (2048 * 2))
    if factor > 1:
        image = image.reduce(factor)
    steps = {'sourceDimensions': source_size}
    if 'roll' in body:
        image = Image.fromarray(np.roll(np.asarray(image), int(image.width * body['roll']), axis=1))
        steps['rollFraction'] = body['roll']
    if body.get('fillNoData'):
        image, fraction = fill_no_data(image, body.get('noDataThreshold', 8))
        steps['noDataFilledFraction'] = round(fraction, 4)
    if 'saturation' in body:
        image = ImageEnhance.Color(image).enhance(body['saturation'])
        steps['saturation'] = body['saturation']
    if 'tint' in body:
        tinted = np.asarray(image).astype(np.float32) * np.array(body['tint'], dtype=np.float32)
        image = Image.fromarray(np.clip(tinted + 0.5, 0, 255).astype(np.uint8))
        steps['tint'] = body['tint']
    return image, steps


def check():
    manifest = json.loads(MANIFEST.read_text())
    records = [record for body in manifest['bodies'] for record in body['outputs']]
    for expected in records:
        if file_record(ROOT / expected['path']) != expected:
            raise SystemExit(f'Asset verification failed: {expected["path"]}')
    print(f'Verified {len(records)} replacement textures.')


def build(download, only):
    catalog = json.loads(SOURCES.read_text())
    previous = json.loads(MANIFEST.read_text())['bodies'] if MANIFEST.exists() else []
    records = {body['id']: body for body in previous}
    for body in catalog['bodies']:
        if only and body['id'] not in only:
            continue
        path = source_path(body, download)
        outputs = []
        if body.get('copyUnmodified'):
            destination = ROOT / f'public/textures/2k/{body["id"]}_diffuse.jpg'
            shutil.copyfile(path, destination)
            outputs.append(file_record(destination))
            (ROOT / f'public/textures/1k/{body["id"]}_diffuse.jpg').unlink(missing_ok=True)
            steps = {'copiedUnmodified': True}
        else:
            image, steps = prepare(body, path)
            for tier, width in TIERS:
                destination = ROOT / f'public/textures/{tier}/{body["id"]}_diffuse.jpg'
                destination.write_bytes(encode_jpeg(image.resize((width, width // 2), Image.Resampling.LANCZOS)))
                outputs.append(file_record(destination))
        records[body['id']] = {'id': body['id'], 'sourceSha256': body['sha256'], 'steps': steps, 'outputs': outputs}
        print(body['id'], steps)
    order = [body['id'] for body in catalog['bodies']]
    MANIFEST.write_text(json.dumps({
        'schemaVersion': 1,
        'sourceCatalog': SOURCES.relative_to(ROOT).as_posix(),
        'pillowVersion': pillow_version,
        'numpyVersion': np.__version__,
        'jpegEncoding': {'quality': 90, 'subsampling': 0, 'optimize': True},
        'bodies': [records[id_] for id_ in order if id_ in records],
    }, indent=2) + '\n')
    check()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--download', action='store_true', help='Download missing, hash-locked sources.')
    parser.add_argument('--check', action='store_true', help='Verify committed outputs without network or changes.')
    parser.add_argument('--only', nargs='*', help='Rebuild only these body ids.')
    args = parser.parse_args()
    if args.check:
        check()
    else:
        build(args.download, set(args.only or []))
