import { useSyncExternalStore } from 'react';

const query = window.matchMedia('(prefers-reduced-motion: reduce)');

function subscribe(callback: () => void) {
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

function getSnapshot() {
  return query.matches;
}

/** True when the OS-level "reduce motion" preference is enabled. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
