# Visual and teaching rollout

Goal: accomplish `visual-teaching-roadmap-2026-09-21.md`, including reviewed milestone PRs, deployed behavior, and an actual tides capture. This checklist tracks incomplete work; it is not a narrowed definition of completion.

| Milestone | State | Remaining evidence |
|---|---|---|
| 0: performance and asset foundation | Merged as PR #69; production build 27df062 verified in browser; desktop benchmark p95 9.3 ms | Final iPhone/Safari benchmark |
| 1: recognizable Uranian moons | Merged as PR #70 after exact-head preview; 102 tests pass; all five moons and both modes checked | Production build 93e4c32 verified; physical iPhone/Safari still pending |
| 2: coherent celestial sky | Merged as PR #71; production build 6822c90 verified; 118 tests pass; browser night/day/horizon and panning checks passed | Physical iPhone/Safari |
| 3: Earth tides layer | Inline scene and matching toolbar controls merged as PR #74; production build 7b308dd verified; 129 tests pass | Physical iPhone/Safari; compact Orrery follow-up in review |
| 4: actual-app vertical capture | Actual 18-second H.264 MP4 and full playback verified; PR #73 recording implementation independently reviewed | PR #73 held while the user-requested inline experience is integrated; adapt final capture to that experience |

Physical reference selected by user: **iPhone / Safari**. Desktop responsive emulation does not satisfy this requirement. User supplied `/Users/archer/Programs/earth-moon-tides/tides-reel-v3.mp4` as the water-treatment reference: 56 seconds, 1080×1920, H.264/AAC. Use its translucent rippling envelope as visual direction, while keeping this lesson’s equilibrium model distinct from its tidal-friction/long-term evolution story. No post is authorized for publication by this implementation work.

Later ranked opportunities (deep-sky cards, further moon features, auroras, compression if needed) retain their roadmap priority after the first-release milestones. Deferred volumetric/fluid projects remain deferred as proposed.

## Follow-up requested during visual review

- Completed in PR #74: replaced prominent tides entry with a toolbar icon and rendered the tidal envelope/vectors around the existing Earth; preserved scene context, pan/zoom, and time controls.
- Completed in PR #74: replaced exposed quality select with a matching icon and plain-language popup.
- In review: compact Earth–Moon scale in **Orrery only**, as explicitly chosen by the user; preserve Explore spacing. Moon geometry and camera share the same physical Moon/Earth size ratio. Geocentric lunar directions follow the selected date, while local distance stays illustrative.
