import { useEffect, useRef } from 'react';
import type { TidesRecordingUi } from './useTidesRecording';
import './recording.css';

export function TidesRecordingControls({ recording }: { recording: TidesRecordingUi }) {
  const cancelButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (recording.active) cancelButton.current?.focus(); }, [recording.active]);
  return <div className={`tides-recording${recording.active ? ' tides-recording--active' : ''}`}>
    {recording.active
      ? <button ref={cancelButton} type="button" onClick={recording.cancel}>Cancel recording</button>
      : <button type="button" disabled={!recording.available} onClick={recording.start}>Record 18-second clip</button>}
    <p role="status">{!recording.available ? 'Video recording is unavailable in this browser. Try a current desktop browser.' : recording.message || 'Make a silent portrait video from this lesson. Nothing is uploaded.'}</p>
    {recording.preview && <div className="tides-recording__result">
      <video aria-label="Your Earth and Moon tides clip" src={recording.preview.url} controls playsInline preload="metadata" />
      <div><a href={recording.preview.url} download={recording.preview.filename}>Download clip</a><button type="button" onClick={recording.dismiss}>Dismiss video</button></div>
    </div>}
  </div>;
}
