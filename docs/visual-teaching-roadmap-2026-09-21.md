# Solar System Explorer: textures, celestial sky, and teaching layers

Planning date: September 21, 2026. Repository inspected at `1d170d0`.

## Recommendation

Deliver three visible improvements in order: **recognizable Uranian moons, an aligned Milky Way in the default Orrery, and an interactive Earth tides lesson**. Establish a performance baseline first and apply the same budgets to every milestone. Add a short deterministic capture of the actual lesson for the Space Race reel after the feature passes review.

The visual principle is: **show the real observed feature, make it easy to see, and let the child discover why it looks or behaves that way.** More pixels alone will not solve poor framing, missing maps, coordinate mismatches, or inaccessible controls.

This is a researched implementation plan. No application code, dependencies, deployed assets, or external account state was changed. Current observations are local, not a production audit. Three research subagents independently investigated moon assets, celestial assets, and tides/teaching opportunities. Estimates below are focused engineering effort including local verification, not delivery promises or elapsed time after parallelization.

## Verified starting point

| Area | Current finding | Consequence |
|---|---|---|
| Moon assets | 29 moon records; 17 diffuse maps; 12 absent | The gray fallback is an actual asset gap, not a need for a new renderer |
| Uranus | Miranda, Ariel, Umbriel, Titania, Oberon all lack maps | These five are the first asset batch |
| Remaining absent maps | Amalthea, Proteus, Nereid, Styx, Nix, Kerberos, Hydra | Research individually; photographic global coverage cannot be assumed |
| Loader | `usePlanetTexture` constructs a filename for every body and caches failures as null | Add an explicit availability/provenance manifest and stop speculative missing-file requests |
| Default view | `AstronomyContext.tsx` initializes to `orrery` | The documentation's artistic-default description is stale |
| Explore | `CelestialBackdrop` already loads a 2K mobile/8K desktop Milky Way image | Improve and reuse this capability rather than announce it as entirely new |
| Orrery | Catalog stars without Milky Way | Explains the sparse default experience |
| Sky | Real stars plus existing constellation figures and daylight fading | Improve integration and controls; do not rebuild constellation figures |
| Stars | Magnitude-derived sizes are calculated, but stock `PointsMaterial` reads one uniform size | A small custom point shader can produce varied, soft, round stars in one batch |
| Celestial frames | Catalog is equatorial; Orrery planets are mapped into an ecliptic scene | One tested transform must align stars, Milky Way, discoveries, and planets |
| Rendering | Always-mounted Canvas, bloom except under reduced motion, no explicit adaptive quality policy | Measure GPU/fill-rate cost before adding effects |
| Texture lifetime | Shared cache has no bounded eviction policy; asynchronous loads/upgrades need lifecycle review | Mode switching and rapid navigation belong in the performance test |
| Camera | Moon mesh radius uses diameter/25000; camera framing uses diameter/8000 | Derive framing from actual visual radius and available viewport |
| Mobile | Detail panels are hidden on mobile | Teaching actions and asset explanations cannot live only in detail panels |
| Earth Moon | `RealisticMoonOrbit` currently uses a period-based circular orbit | Do not use it to claim date-accurate Sun–Moon geometry or tides |
| CI | No tracked `.github/workflows` directory found | Verify actual remote checks before depending on CI; local scripts exist |

Local browser inspection reproduced the point-star Orrery and Miranda's gray sphere. At 1280×720, settled Miranda was only approximately 64 pixels across. Explore's existing backdrop loaded and appeared dim at the inspected camera direction. This was a visual check, not a controlled frame-time benchmark. It does not prove the cause of reported choppiness, mobile behavior, or production/CDN delivery.

## Ranked opportunities

Effort bands: S = roughly half a day to two focused days; M = two to four; L = four to seven; XL = a separate larger project. Source preparation, review, and physical-device availability can expand these ranges.

| Priority | Opportunity | Effort | Value and decision |
|---|---|---|---|
| Foundation | Performance baseline, quality tiers, texture lifecycle | M | Required to keep all later improvements usable |
| 1 | Five Uranian maps, sensible close-up framing, exact credits | S–M | Highest immediate return; directly fixes the reported mismatch |
| 2 | Milky Way in default Orrery and nighttime Sky, aligned with stars | M | Largest whole-scene improvement at modest rendering cost |
| 3 | Soft, magnitude-aware stars and discoverable constellation toggle | S | Include in the sky milestone; mostly uses existing data |
| 4 | Earth “Why tides?” lesson | M–L | Strong interactive teaching and reel opportunity |
| 5 | Repeatable 15–20 second vertical lesson capture | S after tides | Demonstrates the shipped app; supports the sister project |
| 6 | Curated deep-sky discoveries with real telescope photographs | M | Add Andromeda, Orion Nebula, Pleiades, Magellanic Clouds after core sky |
| 7 | Surface-feature callouts and original spacecraft photograph cards | M | Explains Miranda's terrain and the limits of distant observations |
| 8 | KTX2 compressed texture pipeline | M | Pull forward only if measured memory/upload cost warrants it |
| 9 | Earth auroral oval and magnetic-field lesson | M–L | A separate atmospheric teaching feature, not a galaxy backdrop |
| 10 | Scientific irregular-body meshes and more sparse moon coverage | M–L per batch | Valuable selectively; do not invent unresolved detail |
| Defer | Volumetric nebulae, live survey streaming, global fluid tides | XL | Large cost and complexity for weaker near-term educational return |

“Aurora” in the initial sky request is interpreted as the celestial panorama. Actual auroras occur in planetary atmospheres, so their visualization belongs near Earth or another planet. NASA's [aurora explanation](https://science.nasa.gov/sun/auroras/) supports that separate lesson.

## Milestone 0 — establish the performance and asset contract

**Outcome:** a measured baseline and a small set of rendering quality choices that later work can use. Approximate effort: 1–2 days initially; measured defects may need a separate fix.

- Benchmark a production build with fixed viewport, camera route, date, and warm/cold cache conditions. Include default Orrery, rapid planet/moon changes, Uranus and Miranda close-ups, Explore, nighttime/daytime Sky, accelerated time, and repeated mode switches.
- Record median/p95 frame interval, slow frames, main-thread long tasks, transfer bytes, texture decode/upload hitches, draw calls, and resource counts. Use supported GPU timing where available. `renderer.info.memory` counts are not byte-accurate VRAM measurements; maintain texture estimates separately.
- Separate initial upload spikes from sustained panning stutter. Profile scene work and page/DOM/third-party work rather than assume the stars are the bottleneck. Keep development-mode timings separate from production-build evidence.
- Propose initial targets: sustained near-60 fps on the reference desktop; at least 30 fps on an agreed older phone; warm p95 frame intervals no worse than 20 ms desktop/33 ms mobile; new features should not regress a matched baseline by more than 10%. These are proposed acceptance budgets, to calibrate in this milestone, not current achievements.
- Start conservatively with automatic quality plus a simple user override. Adjust DPR and bloom using measured headroom with hysteresis. Device/GPU limits can reject an oversized texture but do not by themselves prove sufficient free GPU memory. Avoid user-agent-only quality selection.
- A 2K sky is the initial/low tier; 4K is a candidate standard tier; 8K is optional after measurement. Start moon maps at 1K, upgrade only the selected close-up to 2K. Keep lower tiers legible and scientifically equivalent.
- Preserve the permanent Canvas and lazy moon mounting. Use demand rendering only when time, camera, shaders, and lesson animation are all idle, with explicit invalidation for every active input; do not simply freeze the animation loop.
- Introduce per-asset metadata: body/sky ID, source URL, creator/credit, applicable reuse terms, projection/frame, observed coverage, any illustrative fill, color processing, resolution variants, and a reproducible conversion recipe/hash.
- Fix texture lifecycle where needed: deduplicate in-flight requests; distinguish unavailable from transient failure; clean up abandoned loads; do not dispose a texture still used by another consumer; bound high-resolution residency. Avoid texture-tier oscillation during gestures.

An uncompressed RGBA 8192×4096 image needs 128 MiB at base level, approximately 171 MiB including a full mip chain. This is a dimensional estimate, not a measured allocation; renderer conversion surfaces can add more. A 2048×1024 version is approximately 10.7 MiB with mipmaps. WebP/JPEG file savings alone do not give GPU compression. Three.js provides a [KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html) for supported GPU compression; adopting its conversion tooling is a separate dependency/tooling decision. React Three Fiber documents [adaptive quality and rendering practices](https://r3f.docs.pmnd.rs/advanced/scaling-performance).

**Exit evidence:** baseline table, recorded reference-device/browser versions, selected budgets, and a repeatable capture route. No unsupported claim that the existing choppiness is fixed.

## Milestone 1 — make the Uranian moons recognizable

**Outcome:** Miranda's patchwork terrain and the other four major Uranian surfaces are recognizable at normal selection zoom. Approximate effort: 1–3 days after the manifest contract.

1. Acquire the NASA-hosted prepared maps, verify their identity and projection, and inspect all sides before conversion. Create 1K/2K derivatives without increasing apparent source detail.
2. Register maps explicitly; use the same resolver in `MoonOrbit` and `RealisticMoonOrbit`. Unknown assets retain an intentional fallback without failed network probes.
3. Calibrate selection framing from the actual mesh radius, camera field of view, and unobscured screen space. Aim for a clearly inspectable surface while allowing the child to pull back and see Uranus and neighboring moons. Preserve the Sun and surrounding system context.
4. Choose a documented illustrative initial orientation that reveals observed terrain in Explore. Keep any body-fixed orientation/rotation treatment internally consistent in Orrery; do not silently spin a supposedly physical body just to show a landmark. An explicit “See the photographed side” camera action is another option.
5. Describe unknown coverage honestly in the asset information. Preserve photographed regions. Do not mirror known terrain into an unobserved hemisphere without identifying the reconstruction.
6. Keep the first pass diffuse-only. A brightness map is not elevation; do not derive purported canyons or mountains from ordinary image luminance. Optional documented relief data belongs in a later feature.
7. Audit credits for the existing 17 moon maps. The current blanket Solar System Scope attribution is not sufficient evidence for every moon's provenance.

| Body | Primary source | Import caution |
|---|---|---|
| Miranda | [NASA prepared texture](https://science.nasa.gov/3d-resources/uranus-miranda/) | Page download labels say Ariel, but the linked filenames identify Miranda; inspect downloaded bytes |
| Ariel | [NASA prepared texture](https://science.nasa.gov/3d-resources/uranus-ariel/) | Verify seam, orientation, lighting, and incomplete coverage |
| Titania | [NASA prepared texture](https://science.nasa.gov/3d-resources/uranus-titania/) | Same inspection requirements |
| Umbriel | [NASA prepared texture](https://science.nasa.gov/3d-resources/uranus-umbriel/) | Retain its naturally dark appearance while preserving readable detail |
| Oberon | [NASA prepared texture](https://science.nasa.gov/3d-resources/uranus-oberon/) | The inspected page linked Ariel as its JPG; use the distinct Oberon TIFF and validate it |

These pages credit **USGS/Tammy Becker & JPL/Caltech**. The [USGS Uranus inventory](https://fdp.astrogeology.usgs.gov/fdp/uranus/) documents limited coverage for mapped products. Files were not downloaded or decoded during planning; final map projection, fill, and feature identity are implementation checks. Apply [NASA's media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) and each asset's stated credit/third-party terms. Preserve credits and modifications in both the repository and the app's reachable credits destination.

For later sparse moons, favor an honest shape illustration plus the actual spacecraft photograph. [NASA's Nereid image](https://science.nasa.gov/resource/nereid/) demonstrates why a detailed global photographic texture cannot simply be assumed.

**Exit evidence:** before/after Miranda screenshots, all-five contact sheet, seam/pole/unknown-hemisphere inspection, success in both Explore and Orrery, slow/offline load fallback, repeated navigation resource check, usable mobile framing, and no known missing asset requests. Meaningful loader tests should cover unavailable assets and concurrent/replaced consumers.

## Milestone 2 — one coherent celestial sky

**Outcome:** the default Orrery has a restrained but unmistakable Milky Way, with richer stars; Sky keeps correct horizon/time/daylight behavior. Approximate effort: 2–4 days.

Use [NASA SVS Deep Star Maps 2020](https://svs.gsfc.nasa.gov/4851/) as the preferred new source. It offers celestial ICRF/J2000 plate-carrée maps and a Milky Way layer that omits the bright Hipparcos/Tycho stars. That is well suited to retaining the app's existing star catalog. Inspect overlap at fainter magnitudes before combining the layers. Convert source EXR files offline into small web textures rather than ship the large scientific originals. Preserve NASA/Goddard SVS and ESA/Gaia/DPAC credits plus any asset-specific terms under the [SVS reuse policy](https://svs.gsfc.nasa.gov/help/).

The existing [Solar System Scope panorama](https://www.solarsystemscope.com/textures/) remains a useful CC BY 4.0 alternative for Explore. Do not add a second bright star catalog over a star-rich panorama without checking duplication. An optional photographic alternative is [ESO/S. Brunier's full-sky panorama](https://www.eso.org/public/images/eso0932a/), which requires coordinate handling and its exact credit. ESO's [reuse policy](https://www.eso.org/public/outreach/copyright/) also specifies credit placement for video.

Implementation:

- Add a small `CelestialLayers` component with explicit settings for diffuse Milky Way, catalog stars, constellation figures/names, and later discoveries. Keep scientific view mode separate from visual enhancement settings.
- Share a tested equatorial-to-scene transform. In Orrery, rotate into the ecliptic frame used by the planets. In Sky, apply the observer/time transform consistently to every celestial layer; test rather than assume the existing Euler rotation is correct.
- Verify map longitude direction, prime meridian, handedness, poles, and seams. Use anchors such as Polaris, Sirius, Orion, and the galactic center; include both hemispheres and time changes.
- Center celestial geometry on the camera or use an infinite-background technique so panning among planets does not create false stellar parallax. A dome must not clip against the current far plane. Preserve horizon occlusion and depth behavior.
- Retain one batched star draw and the existing single constellation line batch. Implement magnitude-based intensity/size and soft circular point sprites. Avoid per-star meshes, animated twinkle everywhere, or adding bloom to manufacture brightness.
- Fade the diffuse Milky Way with daylight alongside stars. Tune exposure/background brightness without raising planetary exposure or making colorful telescope imagery look like everyday naked-eye vision.
- Offer a simple constellation toggle independently of labels. Explain that connecting lines are human patterns; official constellations are defined sky regions. Do not represent one culture's figures as universal.
- Keep baseline sky visible while optional assets load or fail. Mode changes must restore/replace scene background ownership cleanly.

**Exit evidence:** default-route improvement; coordinate anchor checks; Earth-location/time fixtures; daytime and below-horizon suppression; no duplicate bright stars or false parallax; clean transitions among all three modes; quality-tier memory/frame-time comparisons; physical-phone pan check.

Later deep-sky additions should be a small curated list at real sky positions and angular extents, with keyboard-accessible discovery cards. Detailed images belong in an explicitly labeled telescope/enhanced view. Do not scatter giant decorative galaxies arbitrarily around the solar system.

## Milestone 3 — Earth becomes a teaching canvas

**Outcome:** an accessible “Why tides?” experience teaches differing gravity across Earth and the combined lunar/solar effect. Approximate effort: 3–5 days including model review and integration.

The first sequence:

1. Select Earth and choose “Why tides?” from an action available on desktop and mobile.
2. Frame Earth, its Moon, and the Sun's direction. Clearly enter a schematic lesson and pause ordinary motion.
3. Show “The Moon pulls on all of Earth,” then switch to arrows labeled “Differences in gravity.” Distinguish the Moon's gravitational acceleration, pointing toward the Moon, from the tide-generating differential field. Apply the analogous distinction to Sun arrows.
4. Reveal an exaggerated transparent ocean shell. Let the child choose Moon, Sun, or both.
5. Compare new/full-Moon alignment with quarter-Moon geometry using spring/neap presets and an optional phase slider.
6. Exit restores the prior time/rate/camera/navigation intent; the voice guide follows the actual lesson step.

Keep the qualification visible: **“Water shape exaggerated. This simplified model leaves out coastlines and ocean depth.”** This is an equilibrium illustration, not local tide prediction or a claim that all coasts have two equal high tides. NOAA explains [differential gravity and idealized bulges](https://www.nesdis.noaa.gov/about/k-12-education/oceans-coasts/what-causes-tides), [spring/neap tides](https://oceanservice.noaa.gov/facts/springtide.html), and [different coastal tidal cycles](https://oceanservice.noaa.gov/education/tutorial_tides/tides07_cycles.html).

Technical boundaries:

- Add a small orthogonal lesson state, initially only Earth tides; keep the navigation state machine intact. Share state between controls, scene, and voice context. Do not design a general lesson language before a second real lesson needs it.
- Put physics in a pure helper. Compute each body's gravity at a point minus its gravity at Earth's center, or use a documented degree-two approximation. Sum contributions in a common physical frame using physical distances. Visual displacement exaggeration is a separate parameter; never derive force from the compressed scene radii.
- Use one modest shell with vertex displacement and a small batched set of arrows. Update uniforms; avoid geometry rebuilds or React renders every frame. No fluid solver, additional bloom chain, or per-planet simulation when the lesson is off.
- Initial presets are schematic. A later date-based mode requires true Sun/Moon vectors and a corresponding correction to rendered Moon direction. Do not attach a “right now” label to the current circular Moon model.
- Under reduced motion, keep manual preset/slider updates and remove automatic playback. Supply a readable explanation if the graphical effect is disabled. No lesson asset load or active frame work when off.
- Prevent ordinary scene controls from disagreeing with the schematic lesson. Handle mode switches, Back/Escape, focus, audio context, and mobile/cinema mode explicitly.

**Scientific acceptance:** both aligned and opposite Sun/Moon configurations reinforce the degree-two effect; quarter geometry reduces the range without eliminating tides; solar tide-generating contribution is smaller at representative distances; far-side arrows do not imply lunar repulsion; deformation remains finite and symmetric where expected. Tests should exercise these properties, not snapshots of implementation arithmetic.

**Experience acceptance:** a child can compare the presets without reading a long panel; keyboard and touch can enter/operate/exit; the actual phone layout shows Earth and controls; prior state restores; performance remains inside the agreed budget. Record active/off costs on the same route.

Reusable pieces are anchoring, lesson controls, source attribution, pause/capture behavior, and voice context. Later synchronous-rotation, seasons, aurora, or Io/Europa tidal-heating lessons need their own physical models. Heating must show changing deformation and energy dissipation rather than merely reusing Earth's water shell.

## Milestone 4 — capture the actual app for the reel

**Outcome:** a repeatable 15–20 second 9:16 capture showing lunar tides, solar contribution, and spring/neap comparison. Approximate effort: 0.5–1 day after the lesson.

- Add a deterministic presentation sequence using the same lesson model and renderer: fixed camera, controlled timeline, pause/replay, readable overlays, and credits. Keep it a small capture preset, not a second implementation.
- Show the water-exaggeration qualification during capture. Retain source credits in the video/end credit where required, not just the social description.
- Reuse the existing cinema-mode concept while ensuring lesson controls/captions are not accidentally hidden. Check actual playback at phone size before export approval.
- The narrow Space Race repository/marketing search found no tides-specific creative asset. The exact upcoming reel/script and whether it lives in another worktree or task remain unverified. Integrate with that approved creative once identified; do not overwrite or regenerate an existing selected asset.
- App work does not publish, schedule, or replace the social post. Campaign handoff and publication are separate explicit actions.

## Subagent execution and review workflow

Use one milestone per focused PR, with at most two implementation executors at once and the coordinator owning integration. Each executor gets an isolated `codex/` worktree from a verified base and a written file boundary. Workers must be told that other work is concurrent, to preserve others' edits, and to report interface changes before touching another owner's files.

| Milestone | Executor A owns | Executor B owns | Coordinator owns |
|---|---|---|---|
| 0 | Benchmark harness/evidence and texture inventory | Optional loader lifecycle fixes after baseline | Quality contract, scene policy, shared integration |
| 1 | Asset derivatives, manifest entries, exact credits | Moon rendering/framing and asset-loader consumption | Shared APIs, cross-mode integration |
| 2 | Sky source preparation, manifest, transform fixtures | Celestial renderer, star shader, constellation controls | App/scene ownership and quality wiring |
| 3 | Pure tide helper, scientific copy/sources, model tests | Lesson renderer and accessible controls | App, navigation/time restore, voice, camera integration |
| 4 | Deterministic capture preset/evidence | Optional creative review | Approved campaign handoff |

Dependencies: freeze the manifest/quality interface before the moon and sky work consume it. Asset preparation can proceed alongside milestone 0. Merge shared foundations before branching later scene integrations. Freeze the lesson state/model interface before the two tides executors start. Do not run several agents editing `App.tsx`, `SolarSystemScene.tsx`, or the same texture loader simultaneously.

Every task brief includes: user-visible outcome, allowed files, base SHA, dependencies, primary sources, scientific limitations, loading/performance budget, acceptance scenarios, and required evidence. Executors report changed files, screenshots/capture, checks run, unresolved limitations, and exact head SHA.

Delivery sequence matching the requested workflow:

1. Implement in isolated worktrees; integrate a small reviewable change. Keep the PR in draft.
2. Run applicable local checks: lint, unit tests, production build, whitespace check, and actual browser scenarios. No new test framework is required merely for asset additions; add meaningful loader/coordinate/model tests where behavior changes.
3. Run fresh adversarial review before marking ready. One pass challenges scientific accuracy, source identity, projection, credits, and misleading presentation. Another challenges loading failure, shared-resource lifetime, performance, navigation, mobile, accessibility, and voice behavior. A reviewer must not just approve their own authored work.
4. Address every actionable comment or record a concrete reason it does not apply. Rerun affected checks and re-review material changes. Include real visual evidence, not only build output.
5. Mark ready only after review findings are resolved. Merge after a successful Vercel preview deployment **or** successful applicable CI run for the exact reviewed head, as requested, while respecting repository-required checks. A green deploy does not waive known failing checks or review defects.
6. Verify the actual preview experience when available; never equate deployment readiness with correct rendering. For a CI-only gate, retain local production-browser evidence and verify the deployed route after merge.
7. Merge the exact reviewed commit, then confirm the served production version and smoke-test the changed routes/assets. Report shipped/verified versus any unperformed device check explicitly. Keep unrelated worktrees and changes intact.

A four-slot team naturally supports the coordinator plus two executors, then a reviewer as a slot frees up. Review independence matters more than maximizing simultaneous agents.

## Completion criteria for the first release

- Selecting Miranda immediately reveals the distinctive observed terrain at a useful size; all five Uranian moons have inspected maps and credits.
- The default Orrery shows a coherent Milky Way and readable stars without frame-time regression; Sky remains spatially and temporally consistent.
- Earth tides works on desktop and a physical phone, visibly distinguishes lunar/solar effects, explains the schematic model, and restores the surrounding app cleanly.
- A reproducible vertical capture demonstrates the real feature and includes its qualifications/credits.
- Adversarial comments are addressed, the reviewed head clears the requested preview/CI gate, and changed production behavior is checked after merge.

Open measurements/decisions: actual target-phone baseline; final map identity/projection/coverage after download; production/CDN delivery; the exact Space Race reel; and whether compression tooling is needed. None blocks this plan; they are explicit milestone inputs rather than assumed facts.

Tooling note for the execution phase: the session reports Vercel CLI 59.16.0 with 59.23.2 available. Strongly recommend upgrading via `npm i -g vercel@latest` before deployment work. This plan does not install or change dependencies; obtain the required approval before any such change.
