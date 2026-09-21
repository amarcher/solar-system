# Native tides reel capture

These modules capture the existing lesson's **actual WebGL canvas**. They do not create or render a second scene. No dependency or service is required.

## Integration contract

1. Snapshot the current lesson state, capture layout/camera, and any clock values changed for capture. Pause simulation and temporarily stage the existing canvas in a 9:16 container. Keep the lesson's Earth, Moon, arrows and ocean visible between the composited top and bottom captions. The composition is 720×1280; its main unobscured scene area is y=192–880. Do not begin until the layout and camera framing have reached their capture state.
2. In a component inside the same R3F canvas, update a ref from `useFrame` with the lesson state that this frame renders. Return that ref in `readRenderedState`. Do not return newly requested React state before it reaches a render. Structural `CaptureLessonState` matches the M3 `TidesState` (`step`, `source`, `phase`), without owning or copying the physics model.
3. Call `startTidesRecording` with the actual R3F `gl.domElement`. `applyPresentation` should update the existing lesson using `presentation.state`. Pass M3's `tidesCaption` as `captionForState` and M3's `TIDES_QUALIFICATION` as `qualification`. The lesson's caption and qualification remain the single source of truth.
4. The returned handle has `cancel()` and `finished: Promise<RecordingResult | null>`. Keep only one active handle; cancel when leaving the lesson, navigating, or unmounting. An unsupported browser yields `error` status and resolves `null` with restoration. A concurrent second recording of the same canvas throws without altering the active capture.
5. `restore` executes once on completion, cancellation, or failure, including preparation errors. Restore the saved lesson state, layout, camera, and changed clock values here. The recorder removes its R3F and visibility callbacks, stops media tracks, and invalidates incomplete recordings. Make restore safe during unmount.
6. On success, use `RecordingPreviewUrl.replace(result.blob)` for an inline `<video controls playsInline>` preview and a download link with `download={result.filename}`. Dispose the URL owner when dismissing/replacing the result or unmounting. The filename uses the encoder's actual MIME container, never a renamed WebM masquerading as MP4. There is no upload or automatic download.

```ts
const handle = startTidesRecording({
  sourceCanvas: gl.domElement,
  applyPresentation: ({ state }) => updateLesson(state),
  readRenderedState: () => lastRenderedLesson.current,
  captionForState: tidesCaption,
  qualification: TIDES_QUALIFICATION,
  restore: restoreCaptureSnapshot,
  onStatus: (status, message) => updateCaptureStatus(status, message),
});
const result = await handle.finished;
```

The 18-second deterministic timeline is attraction (0–3s), differential pull (3–6s), two bulges (6–9s), new Moon spring (9–12s), full Moon spring (12–15s), quarter Moon neap (15–18s). It deliberately holds discrete teaching views. The actual source scene renders all physics and textures. Each frame includes the shared qualification and Earth/Moon image credit, with source and license URLs.

## Capture behavior

The composition's 2D context copies the source synchronously in R3F `addAfterEffect`, while its freshly rendered WebGL buffer is available. Matching lesson state is required before drawing captions. Composition updates are limited to 30fps and the output uses `captureStream(30)`. The browser determines the encoded frame cadence; low device frame rate is not interpolated or fabricated. Source and composition dimensions preserve aspect ratio, so a landscape source is letterboxed rather than stretched. The final integration should stage portrait rendering for proper framing.

Supported MediaRecorder containers are probed at runtime, with construction fallback. Foreground visibility is required throughout capture; backgrounding cancels the output with a visible error. Missing initial frames, stalled frames and a stalled encoder have bounded timeouts. Video is silent.

References: [R3F additional effects](https://r3f.docs.pmnd.rs/api/additional-exports), [canvas captureStream](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream), [MediaRecorder format detection](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static), [Solar System Scope texture attribution](https://www.solarsystemscope.com/textures/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Unit tests use fake browser boundaries to verify timeline, actual source-copy calls, caption alignment, credit/qualification painting, encoder fallback, lifecycle restoration, MIME extension and URL cleanup. They cannot validate WebGL output or real encoding. Integration must record the full 18 seconds in a supported browser, play the returned Blob, inspect all six scenes and credits, test cancel/background paths, and confirm layout/camera/time restoration.

## App integration

The Earth lesson now offers **Record 18-second clip**, cancel, inline playback, dismiss, and download. `useTidesRecording` stages the existing canvas at up to 360×640 CSS pixels with DPR 2, waits for both Earth/Moon textures and a portrait render, then invokes the recorder. `CameraRig` uses the tested `tidesCaptureFraming` calculation to keep lesson geometry out of the native caption bands. Quality sampling is suspended during capture; the stored quality preference and tier remain intact and the ordinary DPR returns with the normal layout. The existing lesson owns its paused clock throughout. Recording state and layout restore on finish, cancel, errors, navigation and exit; the result URL is revoked on dismissal, replacement, lesson exit or unmount. The full browser encoding/playback and visual inspection gate remains required.

The integration preserves the released lesson’s stable `Vector3`/`Vector2` shader uniforms and updates them before its rendered-state bridge runs. Its existing water-ripple pause state is left unchanged during recording and afterward; recording does not silently resume water that the learner paused. Reduced motion continues to freeze shader time even during capture. The supplied `tides-reel-v3.mp4` is a 56-second, 1080×1920 visual reference; this 18-second, 720×1280 actual-app clip is a separate teaching complement. Nothing is published or uploaded.
