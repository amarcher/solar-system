import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { tidesCaption, TIDES_QUALIFICATION, type TidesState } from '../lessons/tides/model';
import { RecordingPreviewUrl, supportedRecordingTypes } from './media';
import { startTidesRecording, type RecordingHandle, type RecordingStatus } from './recorder';

export interface TidesCaptureFrame {
  canvas: HTMLCanvasElement;
  state: TidesState;
  texturesReady: boolean;
  portrait: boolean;
}
export interface TidesRecordingUi {
  active: boolean;
  status: RecordingStatus | 'idle';
  message: string;
  available: boolean;
  preview: { url: string; filename: string } | null;
  start: () => void;
  cancel: () => void;
  dismiss: () => void;
}

export function useTidesRecording(state: TidesState | null, update: (patch: Partial<TidesState>) => void) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<RecordingStatus | 'idle'>('idle');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<TidesRecordingUi['preview']>(null);
  const [available] = useState(() => typeof MediaRecorder !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function' &&
    supportedRecordingTypes(type => MediaRecorder.isTypeSupported(type)).length > 0);
  const latest = useRef({ state, update });
  useLayoutEffect(() => { latest.current = { state, update }; }, [state, update]);
  const mounted = useRef(true);
  const handle = useRef<RecordingHandle | null>(null);
  const pending = useRef<TidesState | null>(null);
  const frame = useRef<TidesCaptureFrame | null>(null);
  const urls = useRef<RecordingPreviewUrl | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const generation = useRef(0);
  const restore = useCallback((saved: TidesState) => {
    clearTimeout(timeout.current);
    pending.current = null;
    if (mounted.current) {
      if (latest.current.state) latest.current.update(saved);
      setActive(false);
    }
  }, []);
  const cancel = useCallback(() => {
    if (!handle.current && !pending.current) return;
    generation.current += 1;
    const saved = pending.current;
    const current = handle.current;
    handle.current = null;
    if (current) current.cancel();
    else if (saved) restore(saved);
    if (mounted.current) {
      setStatus('cancelled');
      setMessage('Recording cancelled. Your lesson has been restored.');
    }
  }, [restore]);
  const dismiss = useCallback(() => {
    urls.current?.dispose();
    setPreview(null);
  }, []);
  const start = useCallback(() => {
    const saved = latest.current.state;
    if (!saved || pending.current || handle.current) return;
    if (!available) { setStatus('error'); setMessage('Video recording is unavailable in this browser. Try a current desktop browser.'); return; }
    if (document.visibilityState !== 'visible') { setStatus('error'); setMessage('Keep this page visible while recording.'); return; }
    dismiss();
    generation.current += 1;
    pending.current = { ...saved };
    frame.current = null;
    setMessage('Preparing the portrait view and loading Earth and Moon textures…');
    setStatus('preparing');
    setActive(true);
    timeout.current = setTimeout(() => {
      if (!pending.current) return;
      restore(saved);
      setStatus('error');
      setMessage('The portrait view or textures did not finish loading. Please try again.');
    }, 15_000);
  }, [available, dismiss, restore]);
  const onFrame = useCallback((next: TidesCaptureFrame) => {
    frame.current = next;
    const saved = pending.current;
    if (!saved || handle.current || !next.texturesReady || !next.portrait) return;
    if (Math.abs(next.canvas.width / next.canvas.height - 9 / 16) > 0.015) return;
    pending.current = null;
    clearTimeout(timeout.current);
    const token = generation.current;
    const recording = startTidesRecording({
      sourceCanvas: next.canvas,
      applyPresentation: ({ state: nextState }) => latest.current.update(nextState),
      readRenderedState: () => frame.current?.texturesReady && frame.current.portrait ? frame.current.state : null,
      captionForState: tidesCaption,
      qualification: TIDES_QUALIFICATION,
      restore: () => restore(saved),
      onStatus: (nextStatus, error) => {
        if (!mounted.current) return;
        setStatus(nextStatus);
        setMessage(error ?? (nextStatus === 'recording' ? 'Recording 18 seconds. Keep this page visible.' : nextStatus === 'finishing' ? 'Finishing your video…' : ''));
      },
    });
    handle.current = recording;
    void recording.finished.then(result => {
      if (handle.current === recording) handle.current = null;
      if (!mounted.current || generation.current !== token || !result) return;
      urls.current ??= new RecordingPreviewUrl();
      setPreview({ url: urls.current.replace(result.blob), filename: result.filename });
      setMessage('Your clip is ready. Play it below or download it.');
    });
  }, [restore]);

  useEffect(() => {
    if (!state) {
      // External navigation can end the lesson without the close button.
      if (handle.current || pending.current) cancel();
      urls.current?.dispose();
      setPreview(null);
    }
  }, [state, cancel]);
  useEffect(() => {
    if (!active) return;
    const leave = () => {
      // The core recorder handles foreground loss after it starts; this covers texture/layout preparation too.
      if (!pending.current) return;
      cancel();
      setStatus('error');
      setMessage('Recording interrupted when the page left the foreground. Please record again.');
    };
    document.addEventListener('visibilitychange', leave);
    window.addEventListener('pagehide', leave);
    return () => { document.removeEventListener('visibilitychange', leave); window.removeEventListener('pagehide', leave); };
  }, [active, cancel]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timeout.current);
      handle.current?.cancel();
      handle.current = null;
      pending.current = null;
      urls.current?.dispose();
    };
  }, []);
  return { active, onFrame, ui: { active, status, message, available, preview, start, cancel, dismiss } satisfies TidesRecordingUi };
}
