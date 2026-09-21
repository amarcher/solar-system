# Visual and teaching rollout

Goal: accomplish `visual-teaching-roadmap-2026-09-21.md`, including reviewed milestone PRs, deployed behavior, and an actual tides capture. This checklist tracks incomplete work; it is not a narrowed definition of completion.

| Milestone | State | Remaining evidence |
|---|---|---|
| 0: performance and asset foundation | Merged as PR #69; production build 27df062 verified in browser; desktop benchmark p95 9.3 ms | Final iPhone/Safari benchmark |
| 1: recognizable Uranian moons | Merged as PR #70 after exact-head preview; 102 tests pass; all five moons and both modes checked | Production build 93e4c32 verified; physical iPhone/Safari still pending |
| 2: coherent celestial sky | Merged as PR #71; production build 6822c90 verified; 118 tests pass; browser night/day/horizon and panning checks passed | Physical iPhone/Safari |
| 3: Earth tides layer | PR #74 inline controls released and verified at 7b308dd; PR #75 compact Orrery Moon released and verified at 2bcd728, including close-up camera clearance and Earth context | Physical iPhone/Safari |
| 4: actual-app vertical capture | PR #76 integrates the inline Earth/Moon/sky scene; final 720×1280 H.264 clip inspected and played fully (17.9898s); cancellation, camera/clock/rate/layout/focus restoration checked; independent review complete; 169 tests pass | Export preserved; in-app recorder retired by the subsequent single-toggle request. PR #73 is superseded |

Physical reference selected by user: **iPhone / Safari**. Desktop responsive emulation does not satisfy this requirement. User supplied `/Users/archer/Programs/earth-moon-tides/tides-reel-v3.mp4` as the water-treatment reference: 56 seconds, 1080×1920, H.264/AAC. Use its translucent rippling envelope as visual direction, while keeping this lesson’s equilibrium model distinct from its tidal-friction/long-term evolution story. No post is authorized for publication by this implementation work.

Later ranked opportunities (deep-sky cards, further moon features, auroras, compression if needed) retain their roadmap priority after the first-release milestones. Deferred volumetric/fluid projects remain deferred as proposed.

## Follow-up requested during visual review

- Completed in PR #74: replaced prominent tides entry with a toolbar icon and rendered the tidal envelope/vectors around the existing Earth; preserved scene context, pan/zoom, and time controls.
- Completed in PR #74: replaced exposed quality select with a matching icon and plain-language popup.
- Completed in PR #75 and verified in production at 2bcd728: compact Earth–Moon scale in **Orrery only**, as explicitly chosen by the user; preserve Explore spacing. Moon geometry and camera share the same physical Moon/Earth size ratio. Geocentric lunar directions follow the selected date, while local distance stays illustrative.

## Latest simplification

The user requested only a tide on/off toggle: the combined Sun/Moon rippling spheroid, with no arrows, controls panel, source choices, manual water pause or recording controls. This direction supersedes the earlier interactive lesson/capture UI. Automatic reduced-motion support remains. The later visual-cleanup request removes the on-canvas water qualification; limitations remain in documentation and voice context. Existing exported clips are preserved; physical iPhone/Safari rendering and touch checks are still pending.

## Consistent moon systems

Follow-up: use one Orrery policy for all 29 curated moons. Inner moons begin 1.25 parent radii beyond the visible planet/ring extent; orbital separation grows logarithmically with physical distance relative to that system's innermost curated moon. Earth moves from 0.48 to 0.72 scene units; Phobos and Deimos move inward from 1.6/2.2 to about 0.56/0.76. Orbit order and the Moon's ephemeris direction are preserved.

All Orrery moon radii use the same softened physical moon/parent diameter ratio: parent visual radius × (0.04 + 0.5 × ratio^0.6). This illustrative scale preserves relative ordering, distinguishes tiny moons, and avoids an Earth-only exception. Meshes and close-up framing share the result; picking bounds and parent camera clearance apply across systems. Saturn and Uranus retain ring clearance. Explore retains its prior spacing and sizes, following the user's Orrery-only preference.
