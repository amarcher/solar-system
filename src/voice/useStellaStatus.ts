import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Whether to offer Stella right now. Asks /api/stella-status once per visit
 * (ElevenLabs credit, kill switch). Anything unexpected (local dev without the
 * API, network trouble) leaves Stella available: a refused session is still
 * handled gracefully by the conversation itself.
 */
export function useStellaStatus() {
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/stella-status')
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { available?: unknown } | null) => {
        if (!cancelled && body?.available === false) setAvailable(false);
      })
      .catch(() => { /* fail open */ });
    return () => { cancelled = true; };
  }, []);

  /** A live session was refused (e.g. out of credit): stop offering Stella for this visit. */
  const markUnavailable = useCallback(() => setAvailable(false), []);

  /**
   * A session failed the way out-of-credit refusals look. Ask the server to
   * confirm with ElevenLabs and alert Slack if so; once per visit is plenty.
   */
  const reported = useRef(false);
  const reportRefusal = useCallback(() => {
    if (reported.current) return;
    reported.current = true;
    fetch('/api/stella-alert', { method: 'POST', keepalive: true }).catch(() => { /* best effort */ });
  }, []);

  return { available, markUnavailable, reportRefusal };
}
