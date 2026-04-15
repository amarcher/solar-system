import { useCallback, useState } from 'react';
import type { ObserverLocation } from './types';
import { DEFAULT_OBSERVER } from './types';

export function useObserver() {
  const [observer, setObserver] = useState<ObserverLocation>(() => {
    // Try to restore from localStorage
    try {
      const saved = localStorage.getItem('solar-observer-location');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return DEFAULT_OBSERVER;
  });

  const updateObserver = useCallback((loc: ObserverLocation) => {
    setObserver(loc);
    try {
      localStorage.setItem('solar-observer-location', JSON.stringify(loc));
    } catch { /* ignore */ }
  }, []);

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateObserver({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          elevation: pos.coords.altitude ?? 0,
        });
      },
      () => { /* denied or unavailable — keep current */ },
      { timeout: 10000 },
    );
  }, [updateObserver]);

  return { observer, setObserver: updateObserver, requestGeolocation };
}
