import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { trackStellaCallout } from '../../utils/analytics';
import './StellaCallout.css';

const STORAGE_KEY = 'stella-callout-seen-v1';
/**
 * Let the scene make its first impression before pointing anything out, but
 * not so long that it misses visitors who leave within half a minute.
 */
const SHOW_DELAY_MS = 4000;
const GAP_PX = 12;

type Target = 'button' | 'menu';

interface Placement {
  target: Target;
  side: 'above' | 'right';
  style: CSSProperties;
  arrowStyle: CSSProperties;
}

function alreadySeen(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
}

function markSeen() {
  try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* private mode: show again next visit */ }
}

function isVisible(el: Element | null): el is HTMLElement {
  return !!el && el.getClientRects().length > 0;
}

/** Point at the Stella button when it's on screen, otherwise at the collapsed menu. */
function measure(): Placement | null {
  const button = document.querySelector('[data-stella-entry]');
  const menu = document.querySelector('.app__toolbar-toggle');
  const menuLayout = isVisible(menu);
  const target: Target | null = isVisible(button) ? 'button' : menuLayout ? 'menu' : null;
  if (!target) return null;
  const rect = (target === 'button' ? button : menu)!.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  // In the opened phone menu the buttons stack vertically; sit beside the star
  // instead of covering the buttons above it.
  if (target === 'button' && menuLayout) {
    return {
      target,
      side: 'right',
      style: { left: rect.right + GAP_PX, top: cy },
      arrowStyle: { top: '50%' },
    };
  }
  const left = Math.max(12, cx - 30);
  return {
    target,
    side: 'above',
    style: { left, bottom: window.innerHeight - rect.top + GAP_PX },
    arrowStyle: { left: cx - left - 7 },
  };
}

/**
 * One-time, dismissible pointer to Stella. Leads with her narrated tour, which
 * needs no microphone. Never starts the microphone itself: the visitor still
 * chooses to click the star.
 */
export function StellaCallout({ available, suppressed, toolbarOpen, onVisibleChange, onTour }: {
  /** A voice agent is configured. */
  available: boolean;
  /** Hide for now: Stella is active, or the UI is hidden (cinema mode). */
  suppressed: boolean;
  toolbarOpen: boolean;
  onVisibleChange: (target: Target | null) => void;
  /** Start the narrated tour. Called from the click, so audio can play on iOS. */
  onTour: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);

  useEffect(() => {
    if (!available || alreadySeen()) return;
    const id = window.setTimeout(() => setArmed(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [available]);

  const visible = armed && !suppressed;

  useEffect(() => {
    if (!visible) return;
    // Measure after layout settles (the phone menu may have just opened).
    let frame = requestAnimationFrame(() => setPlacement(measure()));
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setPlacement(measure()));
    };
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
    };
  }, [visible, toolbarOpen]);

  useEffect(() => {
    if (visible) trackStellaCallout('shown');
  }, [visible]);

  const shown = visible ? placement : null;
  const target = shown?.target ?? null;
  useEffect(() => { onVisibleChange(target); }, [target, onVisibleChange]);

  const dismiss = useCallback(() => {
    markSeen();
    setArmed(false);
    trackStellaCallout('dismissed');
  }, []);

  const takeTour = () => {
    markSeen();
    setArmed(false);
    trackStellaCallout('tour');
    onTour();
  };

  // Clicking the star while the tip is up counts as following it.
  useEffect(() => {
    if (!visible) return;
    const button = document.querySelector('[data-stella-entry]');
    const onClick = () => {
      markSeen();
      setArmed(false);
      trackStellaCallout('used');
    };
    button?.addEventListener('click', onClick);
    return () => button?.removeEventListener('click', onClick);
  }, [visible, toolbarOpen]);

  if (!shown) return null;
  const touch = window.matchMedia('(pointer: coarse)').matches;

  return (
    <div
      className={`stella-callout stella-callout--${shown.side}`}
      style={shown.style}
      role="status"
    >
      <div className="stella-callout__body">
        <p className="stella-callout__title">New here? Let Stella show you around</p>
        <button type="button" className="stella-callout__tour" onClick={takeTour}>
          <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor" /></svg>
          Take the 1-minute tour
        </button>
        <p className="stella-callout__text">
          Got a question? {shown.target === 'menu' ? 'Open the menu and tap the ' : `${touch ? 'Tap' : 'Click'} the `}
          <svg viewBox="0 0 24 24" width="13" height="13" aria-label="star" className="stella-callout__star">
            <path d="M12 1C12 1 14 8 16 10C18 12 23 12 23 12C23 12 18 12 16 14C14 16 12 23 12 23C12 23 10 16 8 14C6 12 1 12 1 12C1 12 6 12 8 10C10 8 12 1 12 1Z" />
          </svg>
          {' '}to talk with Stella, our AI space guide.
          {shown.target === 'button' && ' Your browser will ask to use the microphone.'}
        </p>
      </div>
      <button type="button" className="stella-callout__close" aria-label="Dismiss tip" onClick={dismiss}>
        <span aria-hidden="true">×</span>
      </button>
      <span className="stella-callout__arrow" style={shown.arrowStyle} aria-hidden="true" />
    </div>
  );
}
