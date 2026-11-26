import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, createXRStore, useXRSessionModeSupported } from '@react-three/xr';
import { ACESFilmicToneMapping } from 'three';
import { ArScene } from './ArScene';
import { allowMicrophone, useArStella, type ArControls } from './useArStella';
import './ArApp.css';

// Development on a desktop: Chrome ships a WebXR API with no headset behind
// it, and the bundled Quest emulator refuses to install over it. Hiding the
// empty API lets the emulator take its place. Real headsets are left alone.
if (import.meta.env.DEV && !/OculusBrowser|Quest|VisionOS/i.test(navigator.userAgent)) {
  Object.defineProperty(navigator, 'xr', { value: undefined, configurable: true, writable: true });
}

/**
 * Only what the experience uses is requested. Room scanning features are left
 * off so the headset does not ask for access to the room layout.
 */
// Pointing is a plain ray from the hand or controller, with the scene's own
// aiming dot. The library's touch and grab pointers and its dot are measured
// in scene units, so under a zoomed view they come out far too big or small,
// and its minimum ray distance grows until nearby buttons stop responding.
const ray = { minDistance: 0, cursorModel: false, rayModel: { maxLength: 1 } } as const;

const store = createXRStore({
  offerSession: false,
  // Passthrough already shows the viewer's real hands.
  hand: { model: false, grabPointer: false, touchPointer: false, teleportPointer: false, rayPointer: ray },
  controller: { grabPointer: false, teleportPointer: false, rayPointer: ray },
  anchors: false,
  hitTest: false,
  planeDetection: false,
  meshDetection: false,
  depthSensing: false,
  domOverlay: false,
  bodyTracking: false,
});

const inSession = () => store.getState().session != null;

/** `/ar`: the solar system floating in the viewer's own room, for mixed-reality headsets. */
export default function ArApp() {
  const supported = useXRSessionModeSupported('immersive-ar');
  const active = useSyncExternalStore(store.subscribe, inSession);
  const [error, setError] = useState<string | null>(null);
  const controls = useRef<ArControls | null>(null);
  const stella = useArStella(controls);
  const [microphone, setMicrophone] = useState<'unasked' | 'ready' | 'refused'>('unasked');

  // Stella only listens while the headset session is running.
  const stopStella = stella.stop;
  useEffect(() => { if (!active) stopStella(); }, [active, stopStella]);

  useEffect(() => {
    const previous = document.title;
    document.title = 'Solar System in Your Room';
    return () => { document.title = previous; };
  }, []);

  const enter = () => {
    setError(null);
    store.enterAR().catch(() => setError('The headset did not start mixed reality. Please try again.'));
  };

  return (
    <div className="ar-page">
      <Canvas
        camera={{ position: [0, 1.5, 0], rotation: [-0.35, 0, 0], fov: 55 }}
        gl={{ antialias: true, alpha: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 0.75 }}
        onCreated={({ gl }) => gl.domElement.setAttribute('aria-hidden', 'true')}
      >
        <XR store={store}>
          <ArScene controlsRef={controls} stella={stella.state} onStellaTap={stella.toggle} onFocusChange={stella.describe} onLeave={() => void store.getState().session?.end()} />
        </XR>
      </Canvas>

      {!active && (
        <main className="ar-page__panel">
          <h1 className="ar-page__title">Solar System in Your Room</h1>
          {supported === false ? (
            <p className="ar-page__text">
              Open this page in the browser of a mixed-reality headset, such as Meta Quest 3, to put the planets in your room.
              This is a preview.
            </p>
          ) : (
            <>
              <p className="ar-page__text">
                Stand somewhere with a couple of steps of clear floor in front of you. Point at a planet and pinch, or pull the trigger, to fly to it.
                Look down for the buttons: fly home, talk to Stella, leave.
              </p>
              <button type="button" className="ar-page__enter" onClick={enter} disabled={supported !== true}>
                Enter mixed reality
              </button>
              {stella.state !== 'unavailable' && (
                microphone === 'ready' ? (
                  <p className="ar-page__text">Stella is ready. Inside, tap “Talk to Stella” and ask her to fly you to a planet.</p>
                ) : (
                  <>
                    <button type="button" className="ar-page__secondary" onClick={() => void allowMicrophone().then((ok) => setMicrophone(ok ? 'ready' : 'refused'))}>
                      Let Stella use the microphone
                    </button>
                    <p className="ar-page__text">
                      {microphone === 'refused'
                        ? 'The microphone is blocked for this page. Allow it in the browser’s site settings to talk to Stella.'
                        : 'Optional: do this first if you want to ask Stella, the voice guide, to fly you around.'}
                    </p>
                  </>
                )
              )}
            </>
          )}
          {error && <p className="ar-page__text ar-page__text--error" role="alert">{error}</p>}
        </main>
      )}
    </div>
  );
}
