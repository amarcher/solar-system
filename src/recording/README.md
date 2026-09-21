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

The 18-second deterministic timeline has three six-second beats: Moon attraction (0–6s), Moon differential pull (6–12s), and the Moon plus Sun water envelope (12–18s). It never changes phase or places a synthetic Moon. All body and sky pixels come from the existing exploration scene. Captions use the live lesson model; every frame includes its qualification and verified Earth/Moon and current sky attribution.

## Capture behavior

The composition's 2D context copies the source synchronously in R3F `addAfterEffect`, while its freshly rendered WebGL buffer is available. Matching lesson state is required before drawing captions. Composition updates are limited to 30fps and the output uses `captureStream(30)`. The browser determines the encoded frame cadence; low device frame rate is not interpolated or fabricated. Source and composition dimensions preserve aspect ratio, so a landscape source is letterboxed rather than stretched. The final integration should stage portrait rendering for proper framing.

Supported MediaRecorder containers are probed at runtime, with construction fallback. Foreground visibility is required throughout capture; backgrounding cancels the output with a visible error. Missing initial frames, stalled frames and a stalled encoder have bounded timeouts. Video is silent.

References: [R3F additional effects](https://r3f.docs.pmnd.rs/api/additional-exports), [canvas captureStream](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream), [MediaRecorder format detection](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static), [Solar System Scope texture attribution](https://www.solarsystemscope.com/textures/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Unit tests use fake browser boundaries to verify timeline, actual source-copy calls, caption alignment, credit/qualification painting, encoder fallback, lifecycle restoration, MIME extension and URL cleanup. They cannot validate WebGL output or real encoding. Integration must record the full 18 seconds in a supported browser, play the returned Blob, inspect all three beats and credits, test cancel/background paths, and confirm layout/camera/time restoration.

## Inline integration

Record is available only inside the expanded Earth tides controls. A temporary nonmodal Cancel control replaces those controls during capture; the ordinary toolbar is hidden/inert and the canvas ignores pointer input. Completion, cancellation and dismissal return focus to Record. A successful result stays local in the native video preview until the user downloads or dismisses it.

`useTidesRecording` borrows the clock only while recording: save the exact `timeRef` and rate, set rate zero, restore time before playback on every exit. Artistic orbit/rotation and Sun animation receive the temporary pause. Live inline exploration otherwise retains its normal motion. The existing water pause and reduced-motion preference are respected throughout; decorative water ripples can animate while physical positions remain held.

The existing canvas temporarily measures 360×640 CSS pixels at DPR2. CameraRig snapshots controls JSON and the currently displayed pose, retains that viewing direction and starts at Earth's normal focus distance. It fits the actual Earth/Moon sphere bounds inside the caption-free portrait area, zooming out when needed for Explore's wider lunar orbit. Only the camera target and distance change. Objects are never repositioned. On exit it restores the original pose and waits for the fullscreen ResizeObserver dimensions before ordinary tracking resumes. A navigation or mode change retains the new destination instead. Quality sampling suspends during capture, preserving both the preference and current tier; ordinary DPR and layout return afterward.

InlineTidesOverlay updates the same stable shader uniforms and vector geometry used during normal exploration, then reports frame state from the R3F loop. The recorder waits for a prepared camera, the actual 9:16 drawing buffer, and the shared loaded Earth/Moon/cloud/sky textures. These subscriptions reuse the scene's existing cache paths, with no resolution escalation. After-render composition only copies frames whose lesson state agrees with the requested beat.

Browser evidence for the integrated inline scene: the local production build exported H.264 at 720×1280, 17.9898 seconds and 4,442,757 bytes. All three beats, real Earth/Moon, qualifications and credits were visually inspected; native playback reached the end without a media error. Recording cancellation, completion and dismissal returned focus; the manually orbited camera, paused clock and layout returned. The exact Vercel preview was also exercised, including cancellation and restoration of accelerated 1 hr/s playback and a 390×844 layout.

Remaining device acceptance: physical iPhone Safari performance/touch, backgrounding during recording, and reduced-motion behavior. Background/timeout cleanup is covered by unit tests and code review; it is not claimed as an observed physical-device result. No clip is uploaded or published.
