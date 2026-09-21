# Earth tides layer

The tides Easter egg is an optional layer on the existing Explore/Orrery canvas. A wave-and-Moon toolbar icon focuses Earth and enables it. It replaces the former prominent Why tides entry and separate schematic lesson view. The existing Earth, Moon, Sun, star field, camera, orbit controls, and simulation clock remain in place.

## Interaction

The default layer is a translucent rippling water envelope, with both Moon and Sun enabled. A compact nonmodal card starts collapsed; its controls select Water, Gravity, or Difference, choose Moon/Sun/Both, pause ripples, or hide tides. Its model qualification stays visible. The normal toolbar, time controls, navigation, and pan/zoom remain usable. No clock or camera snapshot is taken because the layer does not borrow them. Leaving Earth, entering Sky, or starting Artemis removes it; Explore/Orrery switching retains it.

The menu icon is the entry point in both compact and desktop toolbars. Enabling focuses the card summary without trapping focus; hiding returns to the visible entry/menu or remounted Earth information panel. Reduced-motion preference freezes decorative ripples. The layer follows body positions regardless of whether those ripples are paused.

## Physical model and coordinates

`InlineTidesOverlay` reads the same world-position registry used by the camera after planet and moon frame updates. Its group stays centered on Earth and uses Earth's existing visible radius. It normalizes Earth-to-Moon and Earth-to-Sun vectors; scene distance compression is never used to calculate physical force strength. The Moon's displayed Orrery motion currently remains a schematic approximation until the separate lunar-scale/ephemeris update lands.

The differential field is `w × (3(r·n)n − r)`, where `n` is the displayed body direction and `w` is proportional to physical `GM/d³`. Representative physical constants give Moon = 1 and Sun ≈ 0.46. The water shape is the summed degree-two potential `P2(cos θ) = (3 cos² θ − 1)/2`, rendered at base radius `1.18 + 0.22 × potential` in Earth-radius units. This is an exaggerated global equilibrium illustration, not ocean depth or a coastal tide prediction.

Gravity arrows use inverse-square attraction, separately normalized for each body and disclosed in the legend. Difference arrows show acceleration relative to Earth's center and do not imply that gravity repels the far side. A shared shader adds a bounded ±0.004 decorative ripple with a transparent rim. The supplied `earth-moon-tides/tides-reel-v3.mp4` informed the water treatment; this layer does not model that reel's friction, leading tidal bulge, or lunar-recession story.

The shader uniform container and vector objects remain stable. Three caches them when linking the program, so live directions and strengths are mutated before rendering rather than replacing the uniform object. This prevents a moving Moon marker from disagreeing with a stale water shape.

Sources: [JPL astrodynamic parameters](https://ssd.jpl.nasa.gov/astro_par.html), [NOAA differential gravity explanation](https://www.nesdis.noaa.gov/about/k-12-education/oceans-coasts/what-causes-tides), and [NOAA spring/neap tides](https://oceanservice.noaa.gov/facts/springtide.html). Existing Earth/Moon imagery is Solar System Scope, CC BY 4.0; provenance is recorded in the texture manifest.

## Performance and verification

The layer adds one water mesh and one batched line buffer. It updates existing vectors and typed arrays, has no fluid simulation, and unmounts its resources when disabled. Other celestial layers and normal quality controls remain active.

129 tests, lint, and production build passed for the inline integration. Browser checks covered actual Earth attachment, pan/zoom, changing Orrery time, Explore/Orrery switching, Sky cleanup, compact icon entry, focus, and 320×568/390×844 layouts. Display quality's icon popup was exercised in desktop and compact menus, including selection, Escape, and returning to Automatic. Physical iPhone Safari remains a user acceptance check.

The former schematic renderer is retained as an internal recording helper; it is no longer a public lesson view. Recording PR #73 is held while capture is adapted to the inline experience.
