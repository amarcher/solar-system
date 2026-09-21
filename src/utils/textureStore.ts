/** Ownership is per URL: a detail map never replaces or disposes an overview map. */
export interface TextureStoreOptions<T> {
  load: (url: string) => Promise<T>;
  dispose: (resource: T) => void;
  estimateBytes: (resource: T) => number;
  maxIdleBytes?: number;
  maxIdleEntries?: number;
}

interface Entry<T> {
  resource: T | null;
  status: 'loading' | 'ready' | 'failed';
  listeners: Set<() => void>;
  lastRelease: number;
}

export function createTextureStore<T>(options: TextureStoreOptions<T>) {
  const entries = new Map<string, Entry<T>>();
  const maxIdleBytes = options.maxIdleBytes ?? 24 * 1024 * 1024;
  const maxIdleEntries = options.maxIdleEntries ?? 4;
  let releaseSequence = 0;

  function discard(key: string, entry: Entry<T>) {
    entries.delete(key);
    if (entry.resource !== null) options.dispose(entry.resource);
  }

  function evictIdle() {
    const idle = [...entries].filter(([, entry]) => entry.status === 'ready' && entry.listeners.size === 0)
      .sort((a, b) => a[1].lastRelease - b[1].lastRelease);
    let bytes = idle.reduce((total, [, entry]) => total + options.estimateBytes(entry.resource!), 0);
    let count = idle.length;
    for (const [key, entry] of idle) {
      if (bytes <= maxIdleBytes && count <= maxIdleEntries) break;
      bytes -= options.estimateBytes(entry.resource!);
      count -= 1;
      discard(key, entry);
    }
  }

  function start(key: string, entry: Entry<T>) {
    entry.status = 'loading';
    // Normalize synchronous loader failures into the same retryable failure path.
    void Promise.resolve().then(() => options.load(key)).then((resource) => {
      entry.resource = resource;
      entry.status = 'ready';
      if (entry.listeners.size === 0) {
        // A load abandoned before completion has never been used; don't retain it.
        discard(key, entry);
        return;
      }
      for (const notify of entry.listeners) notify();
    }, () => {
      entry.status = 'failed';
      if (entry.listeners.size === 0) entries.delete(key);
      for (const notify of entry.listeners) notify();
    });
  }

  return {
    getSnapshot(key: string): T | null {
      return entries.get(key)?.resource ?? null;
    },
    acquire(key: string, onChange: () => void = () => {}): () => void {
      if (!key.trim()) return () => {};
      let entry = entries.get(key);
      let needsLoad = false;
      if (!entry) {
        entry = { resource: null, status: 'loading', listeners: new Set(), lastRelease: 0 };
        entries.set(key, entry);
        needsLoad = true;
      } else if (entry.status === 'failed') {
        needsLoad = true;
      }
      // Each acquisition has its own identity even if callers share a callback.
      const listener = () => onChange();
      entry.listeners.add(listener);
      if (needsLoad) start(key, entry);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        entry.listeners.delete(listener);
        if (entry.listeners.size !== 0) return;
        entry.lastRelease = ++releaseSequence;
        if (entry.status === 'failed') entries.delete(key);
        evictIdle();
      };
    },
  };
}
