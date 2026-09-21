/// <reference types="node" />
import { readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { estimateTextureBytes, getBodyTexture, selectTextureVariant, textureManifest } from './textureManifest';
import type { TextureAsset } from './textureManifest';

const publicRoot = fileURLToPath(new URL('../../public/', import.meta.url));
function images(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? images(path) : /\.(jpg|png|webp)$/.test(path) ? [`/${relative(publicRoot, path)}`] : [];
  });
}

describe('texture inventory', () => {
  it('lists only existing assets and covers the bundled texture inventory', () => {
    const paths = textureManifest.flatMap((asset) => asset.variants.map((variant) => variant.path));
    expect(new Set(paths).size).toBe(paths.length);
    expect(new Set(textureManifest.map((asset) => asset.id)).size).toBe(textureManifest.length);
    paths.forEach((path) => expect(existsSync(join(publicRoot, path))).toBe(true));
    expect([...paths].sort()).toEqual(images(join(publicRoot, 'textures')).sort());
  });

  it('never constructs paths for unsupported body IDs', () => {
    for (const id of ['', '  ', '../../etc/passwd', 'not-a-moon']) {
      expect(getBodyTexture(id)).toBeNull();
    }
    expect(getBodyTexture('earth')?.path).toBe('/textures/2k/earth_diffuse.jpg');
  });

  it('selects registered resolution variants deterministically and gates detail maps', () => {
    const sample: TextureAsset = {
      id: 'test', kind: 'diffuse', provenance: textureManifest[0].provenance,
      variants: [
        { path: '/8k', width: 8192, height: 4096, detailOnly: true },
        { path: '/1k', width: 1024, height: 512 },
        { path: '/2k', width: 2048, height: 1024 },
      ],
    };
    expect(selectTextureVariant(sample)?.path).toBe('/2k');
    expect(selectTextureVariant(sample, { maxWidth: 1024 })?.path).toBe('/1k');
    expect(selectTextureVariant(sample, { maxWidth: 512 })?.path).toBe('/1k');
    expect(selectTextureVariant(sample, { maxWidth: 8192 })?.path).toBe('/2k');
    expect(selectTextureVariant(sample, { detail: true, maxWidth: 8192 })?.path).toBe('/8k');
    expect(selectTextureVariant(sample, { detail: true, maxWidth: 2048 })?.path).toBe('/2k');
    expect(getBodyTexture('earth', { maxWidth: 1024 })?.width).toBe(2048);
  });

  it('makes legacy attribution uncertainty explicit', () => {
    for (const asset of textureManifest) {
      expect(asset.provenance.notes.length).toBeGreaterThan(20);
    }
    expect(textureManifest.find((asset) => asset.id === 'earth-diffuse')?.provenance.status).toBe('pending');
    expect(estimateTextureBytes(8192, 4096)).toBe(178956971);
  });
});
