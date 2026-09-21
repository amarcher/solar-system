/// <reference types="node" />
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { estimateTextureBytes, getBodyTexture, getBodyTextureAsset, selectTextureVariant, textureManifest } from './textureManifest';
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
    expect(getBodyTextureAsset('venus')?.provenance.status).toBe('pending');
    expect(estimateTextureBytes(8192, 4096)).toBe(178956971);
  });

  it('keeps verified Earth and Moon files tied to their publisher byte matches', () => {
    const publisherHashes = {
      'earth-diffuse': '767ee1dc6eb3802699bfccf6f264880f8acd0b80de3191cd24984fe279b07b7c',
      'earth-clouds': 'fffd7f68d41b37274822150e54a6ef605af1d3ec35624d9f628c3b896bfa42ed',
      'moon-diffuse': '2764ba6535ea0481a062846ee033cc7a909dae05b31a8fd13f3e98f3a7fd92bd',
    };
    for (const [id, sha256] of Object.entries(publisherHashes)) {
      const asset = textureManifest.find((entry) => entry.id === id)!;
      expect(asset.provenance.status).toBe('verified');
      expect(asset.provenance.credit).toBe('Solar System Scope');
      expect(createHash('sha256').update(readFileSync(join(publicRoot, asset.variants[0].path))).digest('hex')).toBe(sha256);
    }
  });

  it('upgrades only a selected Uranian moon within its graphics budget', () => {
    const moonIds = ['miranda', 'ariel', 'titania', 'oberon', 'umbriel'];
    for (const selectedId of moonIds) {
      const textures = moonIds.map((id) => getBodyTexture(id, { detail: id === selectedId, maxWidth: 2048 }));
      expect(textures.filter((variant) => variant?.width === 1440)).toHaveLength(1);
      expect(textures.filter((variant) => variant?.width === 1024)).toHaveLength(4);
      expect(getBodyTexture(selectedId, { detail: true, maxWidth: 1024 })?.width).toBe(1024);
      expect(getBodyTexture(selectedId, { maxWidth: 8192 })?.width).toBe(1024);
      const asset = getBodyTextureAsset(selectedId);
      expect(asset?.provenance.status).toBe('verified');
      expect(asset?.coverage).toContain('Plain gray');
    }
  });

  it('distinguishes the verified Moon from unresolved legacy sources and unavailable maps', () => {
    expect(getBodyTextureAsset('moon')?.provenance).toMatchObject({
      status: 'verified', credit: 'Solar System Scope', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    });
    for (const id of ['io', 'europa', 'ganymede', 'callisto', 'titan', 'enceladus', 'mimas', 'triton', 'charon']) {
      expect(getBodyTextureAsset(id)?.provenance.status).toBe('pending');
      expect(getBodyTextureAsset(id)?.provenance.notes).toContain('non-commercial');
    }
    for (const id of ['phobos', 'deimos', 'rhea', 'dione', 'tethys', 'iapetus', 'hyperion']) {
      expect(getBodyTextureAsset(id)?.provenance.status).toBe('pending');
    }
    for (const id of ['amalthea', 'proteus', 'nereid', 'styx', 'nix', 'kerberos', 'hydra']) {
      expect(getBodyTexture(id, { detail: true })).toBeNull();
    }
  });
});
