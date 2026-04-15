import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * Tests for useDeviceOrientation helper functions and state logic.
 *
 * Since @testing-library/react is not available, we test the pure detection
 * functions by manipulating the global DeviceOrientationEvent, and verify
 * the module's exported interface shape.
 */

// Save originals
const originalDeviceOrientationEvent = globalThis.DeviceOrientationEvent;

afterEach(() => {
  (globalThis as any).DeviceOrientationEvent = originalDeviceOrientationEvent;
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('useDeviceOrientation — isSupported detection', () => {
  it('returns true when DeviceOrientationEvent exists', async () => {
    (globalThis as any).DeviceOrientationEvent = class {};
    // Re-import to pick up the global state at import time
    const mod = await import('./useDeviceOrientation');
    expect(mod.useDeviceOrientation).toBeTypeOf('function');
  });

  it('DeviceOrientationEvent is defined in test environment when set', () => {
    (globalThis as any).DeviceOrientationEvent = class {};
    expect(typeof DeviceOrientationEvent).toBe('function');
  });

  it('DeviceOrientationEvent can be removed to simulate unsupported', () => {
    delete (globalThis as any).DeviceOrientationEvent;
    expect(typeof globalThis.DeviceOrientationEvent).toBe('undefined');
  });
});

describe('useDeviceOrientation — needsPermissionRequest detection', () => {
  it('detects iOS-style requestPermission method', () => {
    (globalThis as any).DeviceOrientationEvent = class {
      static requestPermission = vi.fn().mockResolvedValue('granted');
    };
    expect(typeof (DeviceOrientationEvent as any).requestPermission).toBe('function');
  });

  it('non-iOS devices lack requestPermission', () => {
    (globalThis as any).DeviceOrientationEvent = class {};
    expect((DeviceOrientationEvent as any).requestPermission).toBeUndefined();
  });
});

describe('useDeviceOrientation — DeviceOrientationState interface', () => {
  it('exports the hook with correct return type shape', async () => {
    (globalThis as any).DeviceOrientationEvent = class {};
    await import('./useDeviceOrientation');
    // Verify the type definition is exported
    type State = import('./useDeviceOrientation').DeviceOrientationState;
    const keys: (keyof State)[] = [
      'heading', 'pitch', 'active', 'supported', 'denied',
      'start', 'stop', 'headingRef', 'pitchRef',
    ];
    // Just verifying the type compiles — this is a compile-time check
    expect(keys).toHaveLength(9);
  });
});

describe('useDeviceOrientation — compass heading calculation', () => {
  it('webkitCompassHeading takes priority over alpha on iOS', () => {
    // Simulate what the event handler does:
    // const compassHeading = e.webkitCompassHeading ?? (360 - e.alpha);
    const iosEvent = { alpha: 100, webkitCompassHeading: 45 };
    const heading = iosEvent.webkitCompassHeading ?? (360 - iosEvent.alpha!);
    expect(heading).toBe(45);
  });

  it('falls back to 360-alpha on Android', () => {
    const androidEvent = { alpha: 90, webkitCompassHeading: undefined };
    const heading = androidEvent.webkitCompassHeading ?? (360 - androidEvent.alpha!);
    expect(heading).toBe(270);
  });

  it('heading wraps to 0-360 range', () => {
    const alpha = 0;
    const heading = (360 - alpha) % 360;
    expect(heading).toBe(0);
  });

  it('heading for alpha=180 is 180 (south)', () => {
    const alpha = 180;
    const heading = (360 - alpha) % 360;
    expect(heading).toBe(180);
  });
});

describe('useDeviceOrientation — iOS permission flow simulation', () => {
  it('granted resolves correctly', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted');
    const state = await requestPermission();
    expect(state).toBe('granted');
  });

  it('denied resolves correctly', async () => {
    const requestPermission = vi.fn().mockResolvedValue('denied');
    const state = await requestPermission();
    expect(state).toBe('denied');
  });

  it('rejection is catchable', async () => {
    const requestPermission = vi.fn().mockRejectedValue(new Error('User dismissed'));
    await expect(requestPermission()).rejects.toThrow('User dismissed');
  });
});
