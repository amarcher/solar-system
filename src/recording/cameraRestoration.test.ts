import { describe, expect, it } from 'vitest';
import { cameraRestorationStep } from './cameraRestoration';

const earth = { navKey: 'planet:earth', mode: 'orrery' };
const portrait = { width: 360, height: 640 };
const full = { width: 1440, height: 900 };

describe('camera restoration across capture layout changes', () => {
  it('keeps restoration pending until the fullscreen ResizeObserver size arrives', () => {
    expect(cameraRestorationStep(earth, earth, portrait, full)).toBe('wait-for-layout');
    expect(cameraRestorationStep(earth, earth, { width: 1440, height: 640 }, full)).toBe('wait-for-layout');
    expect(cameraRestorationStep(earth, earth, full, full)).toBe('restored');
  });
  it('uses the current container size when the viewport changes during recording', () => {
    const resizedFull = { width: 1024, height: 768 };
    expect(cameraRestorationStep(earth, earth, full, resizedFull)).toBe('wait-for-layout');
    expect(cameraRestorationStep(earth, earth, resizedFull, resizedFull)).toBe('restored');
    expect(cameraRestorationStep(earth, earth, resizedFull, null)).toBe('wait-for-layout');
  });
  it('never delays intentional navigation or mode changes for an old restoration', () => {
    expect(cameraRestorationStep(earth, { ...earth, navKey: 'moon:europa' }, portrait, full)).toBe('new-destination');
    expect(cameraRestorationStep(earth, { ...earth, mode: 'artistic' }, portrait, full)).toBe('new-destination');
  });
  it('completes a normal lesson close immediately and tolerates fractional CSS rounding', () => {
    expect(cameraRestorationStep(earth, earth, full, full)).toBe('restored');
    expect(cameraRestorationStep(earth, earth, { width: 1440.25, height: 900.1 }, full)).toBe('restored');
  });
});
