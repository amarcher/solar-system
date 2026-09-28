#!/usr/bin/env python3
"""Generate labeled artist's-illustration maps for moons with no usable imagery.

Every pixel is procedural: seeded 3D value noise plus craters, sampled on the
sphere so the map has no seam at the date line and no pole pinching. Nothing
here is derived from observations beyond each moon's average brightness.
"""

import argparse
import hashlib
import io
import json
from pathlib import Path

import numpy as np
from PIL import Image, __version__ as pillow_version


ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'docs/assets/illustrated-moons.manifest.json'
WIDTH, HEIGHT = 2048, 1024

# base: mean display brightness (0-1), loosely following geometric albedo.
# tint: RGB multiplier. craters: count and largest angular radius (radians).
MOONS = {
    'proteus': {'seed': 8, 'base': 0.40, 'contrast': 0.20, 'tint': (1.00, 0.99, 0.97),
                'craters': 220, 'max_radius': 0.45, 'giant': (0.62, -0.17, -1.5)},
    'nereid': {'seed': 2, 'base': 0.50, 'contrast': 0.16, 'tint': (1.00, 1.00, 1.00),
               'craters': 160, 'max_radius': 0.40},
    'styx': {'seed': 5, 'base': 0.72, 'contrast': 0.12, 'tint': (0.99, 0.99, 1.00),
             'craters': 90, 'max_radius': 0.45},
    'kerberos': {'seed': 4, 'base': 0.66, 'contrast': 0.13, 'tint': (0.99, 0.99, 1.00),
                 'craters': 110, 'max_radius': 0.45},
}


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def sphere_points(width, height):
    lat = (0.5 - (np.arange(height) + 0.5) / height) * np.pi
    lon = ((np.arange(width) + 0.5) / width) * 2 * np.pi - np.pi
    lon, lat = np.meshgrid(lon, lat)
    return np.stack([np.cos(lat) * np.cos(lon), np.sin(lat), np.cos(lat) * np.sin(lon)], axis=-1), lat


def value_noise(points, rng, frequency, size=64):
    lattice = rng.random((size, size, size))
    coords = (points * frequency + size / 2) % (size - 1)
    base = np.floor(coords).astype(int)
    frac = coords - base
    smooth = frac * frac * (3 - 2 * frac)
    total = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                weight = (np.where(dx, smooth[..., 0], 1 - smooth[..., 0])
                          * np.where(dy, smooth[..., 1], 1 - smooth[..., 1])
                          * np.where(dz, smooth[..., 2], 1 - smooth[..., 2]))
                total = total + weight * lattice[base[..., 0] + dx, base[..., 1] + dy, base[..., 2] + dz]
    return total


def crater(points, height, center, radius, depth):
    distance = np.arccos(np.clip(points @ center, -1, 1)) / radius
    near = distance < 1.6
    d = distance[near]
    bowl = np.where(d < 1, d * d - 1, 0)
    rim = 0.35 * np.exp(-((d - 1) / 0.18) ** 2)
    height[near] += depth * (bowl + rim)


def render(moon):
    rng = np.random.default_rng(moon['seed'])
    points, lat = sphere_points(WIDTH, HEIGHT)
    height = sum(value_noise(points, rng, 2 ** octave * 1.5) / 2 ** octave for octave in range(6)) * 0.35
    albedo = value_noise(points, rng, 2.5) - 0.5
    radii = moon['max_radius'] * rng.random(moon['craters']) ** 2.2 + 0.015
    centers = rng.normal(size=(moon['craters'], 3))
    centers /= np.linalg.norm(centers, axis=1, keepdims=True)
    for center, radius in zip(centers, radii):
        crater(points, height, center, radius, radius * 1.4)
    if 'giant' in moon:
        radius, center_lat, center_lon = moon['giant']
        center = np.array([np.cos(center_lat) * np.cos(center_lon), np.sin(center_lat), np.cos(center_lat) * np.sin(center_lon)])
        crater(points, height, center, radius, radius * 1.1)
    # Relief shading from a fixed northwest light, corrected for longitude spacing.
    north = np.gradient(height, axis=0) * HEIGHT / np.pi
    east = np.gradient(height, axis=1) * WIDTH / (2 * np.pi) / np.maximum(np.cos(lat), 0.15)
    shade = np.clip(-0.7 * east + 0.7 * north, -3, 3) * 0.09
    value = moon['base'] + moon['contrast'] * (albedo + shade)
    rgb = np.clip(value[..., None] * np.array(moon['tint']), 0, 1)
    return Image.fromarray((rgb * 255 + 0.5).astype(np.uint8), 'RGB')


def encode_jpeg(image):
    output = io.BytesIO()
    image.save(output, format='JPEG', quality=90, subsampling=0, optimize=True)
    return output.getvalue()


def file_record(path):
    data = path.read_bytes()
    with Image.open(io.BytesIO(data)) as image:
        width, height = image.size
    return {'path': path.relative_to(ROOT).as_posix(), 'width': width, 'height': height,
            'bytes': len(data), 'sha256': sha256(data)}


def check():
    manifest = json.loads(MANIFEST.read_text())
    records = [record for body in manifest['bodies'] for record in body['outputs']]
    for expected in records:
        if file_record(ROOT / expected['path']) != expected:
            raise SystemExit(f'Asset verification failed: {expected["path"]}')
    print(f'Verified {len(records)} illustrated moon textures.')


def build():
    manifest = {
        'schemaVersion': 1,
        'generator': Path(__file__).relative_to(ROOT).as_posix(),
        'pillowVersion': pillow_version,
        'numpyVersion': np.__version__,
        'observedData': 'None beyond approximate mean brightness. Artist\'s illustration.',
        'bodies': [],
    }
    for body_id, moon in MOONS.items():
        detail = render(moon)
        outputs = []
        for tier, image in [('1k', detail.resize((1024, 512), Image.Resampling.LANCZOS)), ('2k', detail)]:
            destination = ROOT / f'public/textures/{tier}/{body_id}_diffuse.jpg'
            destination.write_bytes(encode_jpeg(image))
            outputs.append(file_record(destination))
        manifest['bodies'].append({'id': body_id, 'parameters': moon, 'outputs': outputs})
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')
    check()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify committed outputs without regenerating.')
    args = parser.parse_args()
    check() if args.check else build()
