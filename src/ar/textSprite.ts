import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three';

/**
 * Text drawn to canvas textures. HTML labels are not shown inside an immersive
 * session, so everything readable in the room has to be part of the 3D scene.
 */

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function finish(canvas: HTMLCanvasElement): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

export const LABEL_ASPECT = 4;

/**
 * A short line of text: a name tag, or with `button` a pill the viewer can tap.
 * Long text shrinks to fit.
 */
export function createLabelTexture(text: string, { button = false } = {}): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = canvas.width / LABEL_ASPECT;
  const ctx = canvas.getContext('2d')!;
  const room = canvas.width - (button ? 72 : 24);
  let size = 64;
  do ctx.font = `600 ${size}px ${FONT}`;
  while (ctx.measureText(text).width > room && (size -= 2) > 20);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (button) {
    ctx.fillStyle = 'rgba(12, 18, 44, 0.88)';
    ctx.strokeStyle = 'rgba(255, 190, 90, 0.95)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(6, 6, canvas.width - 12, canvas.height - 12, (canvas.height - 12) / 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // A dark outline keeps white text readable over a bright room.
    ctx.lineJoin = 'round';
    ctx.lineWidth = 12;
    ctx.strokeStyle = 'rgba(5, 8, 20, 0.85)';
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
  return finish(canvas);
}

/** Soft radial glow standing in for the bloom pass, which cannot run in a headset. */
export function createGlowTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255, 214, 140, 0.9)');
  gradient.addColorStop(0.35, 'rgba(255, 170, 70, 0.35)');
  gradient.addColorStop(1, 'rgba(255, 140, 40, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  return finish(canvas);
}
