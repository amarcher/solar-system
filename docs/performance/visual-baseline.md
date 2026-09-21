# Visual performance baseline — 2026-09-21

Reference: Apple M5 Max, Codex in-app Chromium 152, 1280×720. These are desktop measurements, not iPhone/Safari results. Physical iPhone/Safari validation is still required for the overall roadmap.

## Repeatable procedure

1. Build production with `npm run build` and serve using `npm run preview -- --host 127.0.0.1 --port 4173`.
2. Open `/?benchmark=orbit` at 1280×720. The diagnostic route starts the simulation at 2026-09-21T00:00:00Z, paused. The camera rotates at 0.15 radians/second; ordinary camera tracking remains active.
3. Keep the page visible and do not interact for 25 seconds: five seconds of scene warmup followed by twenty seconds of sampling. Read the visible Scene benchmark report.
4. Switch to Explore and collect the same window. For Sky, the benchmark uses the fixed Greenwich observer and paused date; it does not request location permission. `?benchmark=1` measures a stationary camera instead.
5. Repeat at a moon route, with accelerated playback, and after repeated mode switches as those milestones land. Set the desired quality before the run; a settings change restarts measurement. For a comparable camera start, reload the route rather than using Restart measurement at a different camera angle.

Reports reject visibility-interrupted runs. They record viewport, DPR, quality, date/rate/observer, median/p95/max frame intervals, slow-frame counts, long tasks (when supported), and renderer resource counts. Counts are not VRAM byte measurements. Resource transfer sizes are page-cumulative and may be zero for cached/cross-origin entries. This diagnostic is only mounted with its explicit query parameter.

## Initial comparison

Each row is one full 20-second warm sample with 2,400 frames. The baseline build used the original scene at `1d170d0` plus the diagnostic instrumentation; foundation measurements used the reviewed working changes on `98cd9ac`. Both were production builds. The first measurement version did not yet automatically reject hidden windows; these observed runs completed their full visible frame sample. The final instrumentation adds that protection.

| Scene | Version | DPR | Warm median / p95 | Warm frames >33ms | First-5s maximum | Renderer textures |
|---|---|---:|---:|---:|---:|---:|
| Orrery | Original | 2 | 8.3 / 9.1 ms | 0 | 127.6 ms | 31 |
| Orrery | Foundation / Automatic | 1.5 | 8.3 / 9.3 ms | 0 | 181.3 ms | 31 |
| Explore | Original, 8K sky | 2 | 8.3 / 9.3 ms | 0 | 424.5 ms | 38 |
| Explore | Foundation, 2K sky | 1.5 | 8.3 / 9.3 ms | 0 | 191.6 ms | 36 |

These results show no meaningful sustained desktop regression in the sampled routes. One Explore startup sample improved, while Orrery startup varied; this is not proof of a universal startup or mobile performance fix. No claim is made that all reported choppiness is resolved. The reference machine is powerful.

The default sky's estimated RGBA+mipmap payload falls from about 171 MiB at 8192×4096 to 10.7 MiB at 2048×1024. More detail explicitly selects a 4096×2048 sky (~42.7 MiB), retaining the overview during loading/failure. Actual renderer conversions add memory; estimate and resource counts must not be conflated.

## Browser checks and budgets

- Verified actual default scene, Explore, and Automatic/Smoother/More detail transitions.
- At 650×850, the collapsed/expanded toolbar leaves the centered view-mode controls unobstructed. The toolbar breakpoint is consistently 899px.
- The overview remains subscribed during detail loading/failure. Known unavailable moon maps and empty cloud paths no longer trigger speculative requests.
- Proposed release budgets remain warm p95 ≤20ms on reference desktop, ≤33ms on the chosen phone, and ≤10% regression in matched scenarios. Phone numbers are targets, not measured results.
- Existing ad-script warnings and the Three.js Clock deprecation are observed baseline issues; they are not attributed to the new scene controls.

## Adversarial review

Independent review checked store deduplication, ownership, retries, eviction, and manifest dimensions. It also identified and verified fixes for non-repeatable Sky settings, ignored visible slow frames, visibility-invalid benchmark runs, and toolbar breakpoint consistency. Dynamic material maps explicitly clear with null, and detail loading retains the overview reference.

The previous eager 8K planet-CDN behavior is intentionally retired and documentation updated. Every planet no longer automatically upgrades merely because a deployment enables that old flag. New higher-resolution variants must be registered and explicitly selected.

## Celestial integration pan sample

Build 87f4e08, production build served locally, 1280×720, DPR1.5, automatic/standard, fixed benchmark date, camera pan0.15rad/s. After5s startup, 20s warm sample:2400frames, median8.3ms, p959.2ms, maximum9.4ms, zero frames over33ms. Peak43drawcalls,44273triangles,32textures,27geometries; page transfer8,728,827bytes. Startup maximum204.5ms and2long tasks total371ms. This is one desktop sample on the same M5Max host; not physical iPhone evidence or a controlled startup comparison.
