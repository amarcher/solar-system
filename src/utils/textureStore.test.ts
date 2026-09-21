import { describe, expect, it, vi } from 'vitest';
import { createTextureStore } from './textureStore';

type Resource = { name: string; bytes: number };
function harness(maxIdleBytes = 24, maxIdleEntries = 4) {
  const requests: Array<{ key: string; resolve: (resource: Resource) => void; reject: (reason: Error) => void }> = [];
  const dispose = vi.fn();
  const load = vi.fn((key: string) => new Promise<Resource>((resolve, reject) => {
    requests.push({ key, resolve, reject });
  }));
  const store = createTextureStore({ load, dispose, estimateBytes: (r: Resource) => r.bytes, maxIdleBytes, maxIdleEntries });
  return { store, dispose, load, requests };
}
const settle = async () => { await new Promise<void>((resolve) => setTimeout(resolve, 0)); };

describe('texture ownership', () => {
  it('ignores empty paths and deduplicates concurrent loads even with shared callbacks', async () => {
    const { store, load, requests, dispose } = harness(0);
    const notify = vi.fn();
    store.acquire('  ');
    const releaseA = store.acquire('/moon.jpg', notify);
    const releaseB = store.acquire('/moon.jpg', notify);
    await settle();
    expect(load).toHaveBeenCalledTimes(1);
    const resource = { name: 'moon', bytes: 8 };
    requests[0].resolve(resource);
    await settle();
    expect(notify).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot('/moon.jpg')).toBe(resource);
    releaseA();
    releaseA();
    expect(dispose).not.toHaveBeenCalled();
    releaseB();
    expect(dispose).toHaveBeenCalledExactlyOnceWith(resource);
  });

  it('disposes a late completion after all consumers leave', async () => {
    const { store, requests, dispose } = harness();
    const notify = vi.fn();
    const release = store.acquire('/late.jpg', notify);
    await settle();
    release();
    const resource = { name: 'late', bytes: 8 };
    requests[0].resolve(resource);
    await settle();
    expect(dispose).toHaveBeenCalledExactlyOnceWith(resource);
    expect(notify).not.toHaveBeenCalled();
    expect(store.getSnapshot('/late.jpg')).toBeNull();
  });

  it('reuses an abandoned in-flight load if a consumer returns before completion', async () => {
    const { store, requests, load, dispose } = harness();
    const release = store.acquire('/strict-mode.jpg');
    release();
    const notify = vi.fn();
    const releaseAgain = store.acquire('/strict-mode.jpg', notify);
    await settle();
    requests[0].resolve({ name: 'strict-mode', bytes: 8 });
    await settle();
    expect(load).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledOnce();
    expect(dispose).not.toHaveBeenCalled();
    releaseAgain();
  });

  it('retries a transient error only when a later acquisition requests the URL', async () => {
    const { store, requests, load } = harness();
    const notify = vi.fn();
    const firstRelease = store.acquire('/retry.jpg', notify);
    await settle();
    requests[0].reject(new Error('network offline'));
    await settle();
    expect(store.getSnapshot('/retry.jpg')).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
    const secondRelease = store.acquire('/retry.jpg');
    await settle();
    expect(load).toHaveBeenCalledTimes(2);
    const resource = { name: 'retry', bytes: 8 };
    requests[1].resolve(resource);
    await settle();
    expect(store.getSnapshot('/retry.jpg')).toBe(resource);
    expect(notify).toHaveBeenCalledTimes(2);
    firstRelease();
    secondRelease();
  });

  it('bounds idle bytes by evicting least recently released maps, never active maps', async () => {
    const { store, requests, dispose } = harness(10);
    const releases = ['a', 'b', 'c'].map((key) => store.acquire(key));
    await settle();
    requests.forEach((request) => request.resolve({ name: request.key, bytes: 8 }));
    await settle();
    releases[0]();
    releases[1]();
    expect(dispose.mock.calls.map(([r]) => r.name)).toEqual(['a']);
    expect(store.getSnapshot('c')?.name).toBe('c');
    const releaseB = store.acquire('b');
    releases[2]();
    expect(dispose).toHaveBeenCalledTimes(1);
    releaseB();
    expect(dispose.mock.calls.map(([r]) => r.name)).toEqual(['a', 'c']);
  });

  it('bounds idle entry count and reuses retained maps without requests', async () => {
    const { store, requests, load, dispose } = harness(100, 1);
    const releaseA = store.acquire('a');
    const releaseB = store.acquire('b');
    await settle();
    requests.forEach((request) => request.resolve({ name: request.key, bytes: 1 }));
    await settle();
    releaseA();
    const releaseAgain = store.acquire('a');
    expect(store.getSnapshot('a')?.name).toBe('a');
    expect(load).toHaveBeenCalledTimes(2);
    releaseB();
    releaseAgain();
    expect(dispose.mock.calls.map(([r]) => r.name)).toEqual(['b']);
  });

  it('keeps an overview map alive while another consumer upgrades independently', async () => {
    const { store, requests, dispose } = harness(0);
    const overview = store.acquire('/1k.jpg');
    const upgradingConsumer = store.acquire('/1k.jpg');
    await settle();
    const low = { name: 'low', bytes: 4 };
    requests[0].resolve(low);
    await settle();
    const detail = store.acquire('/2k.jpg');
    upgradingConsumer();
    await settle();
    requests[1].resolve({ name: 'detail', bytes: 16 });
    await settle();
    expect(store.getSnapshot('/1k.jpg')).toBe(low);
    expect(dispose).not.toHaveBeenCalled();
    detail();
    expect(dispose.mock.calls.map(([r]) => r.name)).toEqual(['detail']);
    overview();
    expect(dispose.mock.calls.map(([r]) => r.name)).toEqual(['detail', 'low']);
  });

  it('recovers from a synchronous loader throw', async () => {
    const store = createTextureStore({
      load: vi.fn().mockImplementationOnce(() => { throw new Error('failure'); }).mockResolvedValue('ready'),
      dispose: () => {}, estimateBytes: () => 1,
    });
    const release = store.acquire('x');
    await settle();
    release();
    store.acquire('x');
    await settle();
    expect(store.getSnapshot('x')).toBe('ready');
  });
});
