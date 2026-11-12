# Integrated solar-system revision

The isolated replay has been replaced with an additive Orrery layer. Earth’s clue and the canonical `/companions/kamo-oalewa` link open directly in **Follow companion**, with Kamoʻoalewa’s gold heliocentric trajectory and the rest of the solar system still present. All normal planet components, star field, lighting and camera remain mounted. The compact replay card is non-modal; ordinary planet selection still works. The card returns in the system overview.

The asteroid uses saved daily JPL positions through 8 November 2027, mapped through the same radial distance compression and focused-space transform as the planets. After that source boundary, it continues smoothly with a two-body orbit propagated from the final saved state rather than stopping or resetting the whole solar system. The date picker has no one-year maximum. The replay writes the shared epoch before the normal planets calculate their positions each frame. Closing restores the prior simulation date and speed. Switching out of Orrery ends the replay. This is no longer an Earth-centered rotating-frame diagram; the film retains that scientific explanation separately.

Stella’s client contract exposes `show_earth_companion`, defaults it to Follow companion, and distinguishes this Kamoʻoalewa illustration from Rubin’s separate 2025 PN7 find. The same route and tool are documented in the project agent guides for browser and coding-agent discovery. Attaching the new client tool to the live ElevenLabs agent remains a release step.

Phone composition offsets the camera projection upward while the overview card is present; removing the card or navigating to a planet clears the offset. No fake planet background or second canvas. Stellar voice context describes the integrated scene. No new dependencies or live voice-tool configuration.

Local checks passed: build, scoped ESLint, 275 tests, and desktop/390px/375px/reduced-motion browser scenarios. The pre-existing AdSense TagError remains.

Current verification: `node scripts/quasi-moon/verify.cjs` (or `verify-in-system.cjs`). It supports `QUASI_BASE` and `QUASI_OUT` for preview/production evidence, and origin-scoped existing Vercel OIDC authentication. Tests cover actual movement of Jupiter when scrubbing the replay, unchanged day on camera switch, ordinary Jupiter navigation with the companion still present, return to replay, canvas retention, reduced motion and no horizontal overflow. Evidence: `in-system/`.

## Historical initial release

The following notes and screenshots describe the initial isolated replay shipped in PR #101, superseded by the integrated revision above.

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
