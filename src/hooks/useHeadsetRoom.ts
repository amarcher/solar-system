import { useEffect, useState } from 'react';

const HEADSET_BROWSER = /OculusBrowser|Quest/i;

/**
 * True in the browser of a mixed-reality headset that can show the solar
 * system in the viewer's room. Phones and laptops get false: some Android
 * phones offer the same browser feature, but the room view is built for a
 * headset.
 */
export function useHeadsetRoom(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (!HEADSET_BROWSER.test(navigator.userAgent) || !navigator.xr) return;
    let cancelled = false;
    navigator.xr.isSessionSupported('immersive-ar').then(
      (supported) => { if (!cancelled) setAvailable(supported); },
      () => { /* not allowed here: leave the link hidden */ },
    );
    return () => { cancelled = true; };
  }, []);
  return available;
}
