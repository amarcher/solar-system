import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useGraphicsQuality } from '../../performance/useGraphicsQuality';
import type { QualityPreference } from '../../performance/qualityPolicy';
import './GraphicsSettings.css';

const choices: { value: QualityPreference; label: string; detail: string }[] = [
  { value: 'auto', label: 'Automatic', detail: 'Adjusts for your device' },
  { value: 'smooth', label: 'Smoother motion', detail: 'Less detail' },
  { value: 'detailed', label: 'Sharper detail', detail: 'May use more power' },
];

export function GraphicsSettings() {
  const { preference, setPreference } = useGraphicsQuality();
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const button = trigger.current;
      const popup = panel.current;
      if (!button || !popup) return;
      const anchor = button.getBoundingClientRect();
      const bounds = popup.getBoundingClientRect();
      const margin = 12;
      const maxLeft = Math.max(margin, window.innerWidth - bounds.width - margin);
      const maxTop = Math.max(margin, window.innerHeight - bounds.height - margin);
      const above = anchor.top - bounds.height - 10;
      const top = above >= margin ? above : anchor.bottom + 10;
      popup.style.left = `${Math.max(margin, Math.min(anchor.left, maxLeft))}px`;
      popup.style.top = `${Math.max(margin, Math.min(top, maxTop))}px`;
      popup.style.visibility = 'visible';
    };
    position();
    panel.current?.querySelector<HTMLInputElement>('input:checked')?.focus();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) close();
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [open, close]);

  return (
    <div ref={root} className="graphics-settings"
      onKeyDown={event => {
        if (open && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
      }}
      onBlur={event => {
        if (open && event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) close(false);
      }}>
      <button ref={trigger} type="button" className="app__toolbar-btn graphics-settings__trigger"
        aria-label="Display quality" title="Display quality" aria-expanded={open}
        aria-controls={open ? id : undefined} aria-haspopup="dialog" onClick={() => setOpen(value => !value)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 6h6m4 0h6M4 12h12M4 18h3m4 0h9" />
          <circle cx="12" cy="6" r="2" /><circle cx="18" cy="12" r="2" /><circle cx="9" cy="18" r="2" />
        </svg>
      </button>
      {open && <div ref={panel} id={id} className="graphics-settings__popover" role="dialog" aria-labelledby={`${id}-title`}>
        <div className="graphics-settings__heading"><h2 id={`${id}-title`}>Display quality</h2><button type="button" className="graphics-settings__close" aria-label="Close display quality" onClick={() => close()}><span aria-hidden="true">×</span></button></div>
        <fieldset className="graphics-settings__choices">
          <legend className="graphics-settings__sr-only">Choose display quality</legend>
          {choices.map(choice => <label key={choice.value} className="graphics-settings__choice">
            <input type="radio" name={id} value={choice.value} checked={preference === choice.value}
              aria-labelledby={`${id}-${choice.value}-label`} aria-describedby={`${id}-${choice.value}`} onChange={() => setPreference(choice.value)} />
            <span><strong id={`${id}-${choice.value}-label`}>{choice.label}</strong><span id={`${id}-${choice.value}`}>{choice.detail}</span></span>
          </label>)}
        </fieldset>
      </div>}
    </div>
  );
}
