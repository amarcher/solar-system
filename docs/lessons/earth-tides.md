# Earth tides layer

The tides Easter egg is an optional layer on the existing Explore/Orrery canvas. A wave-and-Moon toolbar icon focuses Earth and enables it. It replaces the former prominent Why tides entry and separate schematic lesson view. The existing Earth, Moon, Sun, star field, camera, orbit controls, and simulation clock remain in place.

## Interaction

The default layer is a translucent rippling water envelope, with both Moon and Sun enabled. A compact nonmodal card starts collapsed; its controls select Water, Gravity, or Difference, choose Moon/Sun/Both, pause ripples, or hide tides. Its model qualification stays visible. The normal toolbar, time controls, navigation, and pan/zoom remain usable. During ordinary exploration the layer does not borrow the clock or camera; temporary borrowing is limited to the explicitly started video capture described below. Leaving Earth, entering Sky, or starting Artemis removes it; Explore/Orrery switching retains it.

The menu icon is the entry point in both compact and desktop toolbars. Enabling focuses the card summary without trapping focus; hiding returns to the visible entry/menu or remounted Earth information panel. Reduced-motion preference freezes decorative ripples. The layer follows body positions regardless of whether those ripples are paused.

## Physical model and coordinates

`InlineTidesOverlay` reads the same world-position registry used by the camera after planet and moon frame updates. Its group stays centered on Earth and uses Earth's existing visible radius. It normalizes Earth-to-Moon and Earth-to-Sun vectors; scene distance compression is never used to calculate physical force strength. Orrery uses the Moon's geocentric ephemeris direction in the same J2000 ecliptic frame as the planets, with a compact illustrative distance of 0.48 scene units. Its body radius preserves the Moon/Earth diameter ratio; Explore retains its existing playful spacing and sizes.

The differential field is `w × (3(r·n)n − r)`, where `n` is the displayed body direction and `w` is proportional to physical `GM/d³`. Representative physical constants give Moon = 1 and Sun ≈ 0.46. The water shape is the summed degree-two potential `P2(cos θ) = (3 cos² θ − 1)/2`, rendered at `1.18 + 0.22 × potential` in Earth-radius units in Explore. Orrery uses `1.08 + 0.08 × potential`, keeping the envelope above Earth's clouds and clear of the compact Moon even at the maximum combined swell. Both are exaggerated global equilibrium illustrations, not ocean depth or coastal tide predictions.

Gravity arrows use inverse-square attraction, separately normalized for each body and disclosed in the legend. Difference arrows show acceleration relative to Earth's center and do not imply that gravity repels the far side. A shared shader adds a bounded ±0.004 decorative ripple with a transparent rim. The supplied `earth-moon-tides/tides-reel-v3.mp4` informed the water treatment; this layer does not model that reel's friction, leading tidal bulge, or lunar-recession story.

The shader uniform container and vector objects remain stable. Three caches them when linking the program, so live directions and strengths are mutated before rendering rather than replacing the uniform object. This prevents a moving Moon marker from disagreeing with a stale water shape.

Sources: [JPL astrodynamic parameters](https://ssd.jpl.nasa.gov/astro_par.html), [NOAA differential gravity explanation](https://www.nesdis.noaa.gov/about/k-12-education/oceans-coasts/what-causes-tides), and [NOAA spring/neap tides](https://oceanservice.noaa.gov/facts/springtide.html). Existing Earth/Moon imagery is Solar System Scope, CC BY 4.0; provenance is recorded in the texture manifest.

## Performance and verification

The layer adds one water mesh and one batched line buffer. It updates existing vectors and typed arrays, has no fluid simulation, and unmounts its resources when disabled. Other celestial layers and normal quality controls remain active.

129 tests, lint, and production build passed for the inline integration. Browser checks covered actual Earth attachment, pan/zoom, changing Orrery time, Explore/Orrery switching, Sky cleanup, compact icon entry, focus, and 320×568/390×844 layouts. Display quality's icon popup was exercised in desktop and compact menus, including selection, Escape, and returning to Automatic. Physical iPhone Safari remains a user acceptance check.

PR #74's inline experience is released and verified in production at `7b308dd`. PR #75's compact Orrery Moon is released and verified at `2bcd728`, including actual Moon close-up, surrounding Earth context, dragging, zoom, and camera clearance. The integrated recorder/lunar code passes lint, build, and all 169 tests. Physical iPhone Safari remains pending.

## Record the actual scene

The expanded controls offer **Record 18-second clip**. Three six-second beats show Moon gravity, Moon differential gravity, and the combined Moon/Sun water envelope. They use the same live overlay and actual displayed bodies and sky; they never apply New/Full/Quarter presets or reposition objects. The old standalone schematic renderer is not used by capture.

Recording temporarily freezes the exact simulation clock and artistic motion, disables canvas gestures, and stages the existing canvas at 360×640 with DPR2. Camera framing keeps the existing viewing direction and fits actual Earth/Moon bounds into the caption-free portrait area; Explore may zoom out to include its wider Moon orbit. It respects mode-specific Moon radius and water envelope settings. Recording waits for shared scene textures, camera readiness, portrait dimensions and a matching rendered teaching state before copying the canvas after rendering.

Completion, cancellation, timeout, backgrounding and encoder errors restore the original clock/rate, camera, lesson state and layout. Quality sampling is suspended so capture cannot demote the user's quality setting. Paused water and reduced motion remain respected. Voice navigation/time/mode actions cancel recording before applying the new user destination or time. Focus returns to Record, including while encoding finishes; no full-screen lesson modal is introduced.

The native video preview and download remain local; nothing is uploaded, auto-downloaded or published. The composition includes model captions, exaggerated-water qualification, Earth/Moon image attribution and the selected sky source credit. The first inline 720×1280 clip played fully for 17.96 seconds without a media error. Final capture/lifecycle acceptance after the compact-Moon merge is pending and will be recorded separately. See [recorder contract and checks](../../src/recording/README.md).
