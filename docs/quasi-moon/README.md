# Earth’s hidden companion: Kamoʻoalewa

Implemented on `codex/quasi-moon` from `origin/main` commit `77dd604`. Local review only; no push, deployment or live-agent change.

## Experience

Open Earth in Explore or Orrery and choose **Earth has company…**. Desktop uses Earth’s detail panel; compact screens use a small clue above the navigation controls. The existing canvas opens an 18-second replay of one complete year. Switch between **Alongside Earth** and **Around the Sun**, pause, scrub the calendar, drag/zoom the scene, or replay. **Return to Earth** and Escape restore the ordinary view and its previous time rate. The replay uses an independent clock, so scrubbing does not change the main simulation date. Reduced-motion users start paused.

The canvas stays mounted. Scene and data load lazily; the scene chunk is approximately 20.24 KB gzip and the control panel approximately 1.56 KB. No dependencies added. Stella gets truthful current-scene context and is told that existing time tools do not control this replay. No ElevenLabs prompt/tools or live configuration was changed.

## Scientific sources and transformations

The data are 366 daily NASA/JPL Horizons heliocentric ecliptic J2000 states, in AU, for Earth (399) and asteroid (469219), 8 November 2026–8 November 2027. Copied from the reel’s retained V4 data and rounded to ten decimal AU places. The source campaign preserves request URLs and raw responses. Labels show the calendar day; this is a dated replay, not live ephemeris or an observing forecast.

For the relative view, subtract Earth’s position, then rotate around the ecliptic normal by minus Earth’s heliocentric longitude. Earth is at the origin and the Sun stays on the negative x axis. Map scientific [x,y,z] to scene [x,z,−y]. Linearly interpolate daily samples. The relative trail is a finite segment, not an artificially closed ellipse: winding ≈−0.994 turns, endpoint separation ≈0.00625 AU. Body sizes and asteroid brightness are enlarged independently; the asteroid mesh is an illustrative marker. This is not a visible second Moon or a telescope sky track.

- [JPL discovery/orbit](https://www.jpl.nasa.gov/news/small-asteroid-is-earths-constant-companion/): discovered 27 April 2016, solar-orbiting quasi-satellite.
- [JWST study](https://arxiv.org/abs/2606.24017), revised 19 October 2026: mean thermal-model diameter 18 ± 2 m.
- [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/): trajectory states.
- Existing app Earth texture/credit policy retained; no new image asset.

## Verification

- Production build passed; existing large-main-bundle warning remains.
- Full test suite: 36 files, 275 tests pass. Five new model tests cover frame invariants, preserved distances, date bounds and non-closed retrograde trajectory.
- Scoped ESLint passes; `git diff --check` passes.
- Real Chrome checks at 1280×900, 390×844, 375×667, plus reduced motion: discovery, scene/view switching without resetting the date, pause, scrub, replay, Escape, same canvas retained, focus restoration and no horizontal overflow.
- Keyboard trap cycles through visible controls, including the closed disclosure summary; hidden source links do not intercept focus.
- Screenshots reviewed for desktop, phone, small-phone and solar-frame layout. No physical-phone or microphone acceptance claimed.
- Browser reports contain an existing Google AdSense TagError before the feature opens. `runtime-diagnostic.json` identifies `pagead2.googlesyndication.com/pagead/js/adsbygoogle.js` and duplicate `ins` ad initialization; one error before and the same total after opening. No feature runtime errors observed.

Browser verification uses installed Chrome and an existing sibling Playwright installation; `scripts/quasi-moon/verify.cjs` documents the paths and localhost port 5178. It does not install packages. Raw outputs and screenshots are adjacent.

## Film handoff and release gate

The corresponding 28-second V5 review cut is `/Users/archer/Programs/space-race/marketing/campaigns/2026-11-quasi-moons/v5/media/quasi-moons-v5-easter-egg.mp4`. It ends “Earth has company… Find it in Space Explorer. Start with Earth.” with `spaceexplorer.tech` in warm yellow. V4 remains intact. This is an allusion, not footage falsely claiming a deployed feature.

Before publishing the film: authorize pushing a focused PR, pass preview/CI, merge/deploy, verify the actual Earth clue and replay in production, and verify phone-accessible hosted playback. Publishing the reel is a separate authorization. Do not repost any completed campaign.
