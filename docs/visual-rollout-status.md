# Visual and teaching rollout

Goal: accomplish `visual-teaching-roadmap-2026-09-21.md`, including reviewed milestone PRs, deployed behavior, and an actual tides capture. This checklist tracks incomplete work; it is not a narrowed definition of completion.

| Milestone | State | Remaining evidence |
|---|---|---|
| 0: performance and asset foundation | Merged as PR #69; production build 27df062 verified in browser; desktop benchmark p95 9.3 ms | Final iPhone/Safari benchmark |
| 1: recognizable Uranian moons | Merged as PR #70 after exact-head preview; 102 tests pass; all five moons and both modes checked | Production build 93e4c32 verified; physical iPhone/Safari still pending |
| 2: coherent celestial sky | Merged as PR #71; production build 6822c90 verified; 118 tests pass; browser night/day/horizon and panning checks passed | Physical iPhone/Safari |
| 3: Earth tides lesson | Merged as PR #72; production build 943a98d verified by coordinator; 125 tests pass; rippling water, pause/reduced motion, camera/clock return checked | Physical iPhone/Safari check sent to user; result pending |
| 4: actual-app vertical capture | Integrated on the released lesson; deterministic 18-second sequence, native 720×1280 composition, visible qualification/credits, cancel and preview/download controls; 139 tests, lint and build pass | Actual foreground browser recording, playback/download review, adversarial review, preview and release |

Physical reference selected by user: **iPhone / Safari**. Desktop responsive emulation does not satisfy this requirement. User supplied `/Users/archer/Programs/earth-moon-tides/tides-reel-v3.mp4` as the water-treatment reference: 56 seconds, 1080×1920, H.264/AAC. Use its translucent rippling envelope as visual direction, while keeping this lesson’s equilibrium model distinct from its tidal-friction/long-term evolution story. No post is authorized for publication by this implementation work.

Later ranked opportunities (deep-sky cards, further moon features, auroras, compression if needed) retain their roadmap priority after the first-release milestones. Deferred volumetric/fluid projects remain deferred as proposed.

The supplied 56-second reel remains the visual reference. The 18-second actual-app recording complements it with attraction, differential gravity, two bulges, and spring/neap configurations; it does not replace its friction and lunar-recession narrative. No dedicated whole-lesson frame-performance claim is made: the earlier mixed-route benchmark is insufficient evidence for that claim. Physical iPhone/Safari results remain pending, and no social publishing is authorized.
