# Earth tides layer

Earth tides is a single on/off scene effect. The wave-and-Moon icon in the existing toolbar/rollup menu focuses Earth and toggles the rippling water spheroid. It always combines Moon and Sun influences. There is no controls panel, arrow display, source selector, water pause button or recording entry.

## Interaction

The existing Earth, Moon, Sun, sky, camera and simulation clock remain in place. Pan/zoom and time controls work normally. Explore/Orrery switching preserves the layer; leaving Earth, entering Sky or starting Artemis removes it. Turning it off removes the overlay without borrowing or restoring the clock or camera. The toolbar button exposes its active state with aria-pressed. The canvas has no water-shape disclaimer, as requested. The model limitations remain in documentation and voice context.

Decorative ripples animate automatically, except under the system reduced-motion preference. Stellar directions continue to update when simulation time changes. Voice context describes the combined water shape and the single toggle; it does not advertise retired controls.

## Model and coordinates

The overlay reads the scene’s Earth/Moon positions after their frame updates and normalizes Earth-to-Moon and Earth-to-Sun directions. Scene distance compression is never used to calculate force strength. Representative physical constants give Moon = 1 and Sun ≈ 0.46. The summed degree-two potential is P2(cos θ) = (3 cos² θ − 1)/2.

Explore retains its illustrative profile, radius 1.18 + 0.22 × potential in Earth-radius units. Orrery uses 1.08 + 0.08 × potential, keeping the envelope above Earth's clouds and clear of its compact Moon. A bounded ±0.004 decorative ripple and transparent rim add the water treatment informed by the supplied tides reel. This is a global equilibrium illustration, not a coastal forecast or a model of the reel’s friction, leading bulge or lunar recession.

Orrery lunar directions use the same J2000 ecliptic frame as the planets. The orbit distance is 0.72 scene units, following the shared Orrery moon-spacing rule; Moon size follows the same softened physical diameter-ratio rule used for every Orrery moon. Explore spacing is unchanged.

The layer adds only one modest water mesh. Shader uniforms and vectors are stable and updated in place. Disabled tides do not mount the overlay. There is no line buffer, recorder, portrait layout, extra canvas or capture camera/clock lifecycle.

Sources: [JPL astrodynamic parameters](https://ssd.jpl.nasa.gov/astro_par.html), [NOAA tides](https://oceanservice.noaa.gov/facts/springtide.html). Earth/Moon imagery is Solar System Scope, CC BY 4.0; asset provenance remains in the manifest.

## Earlier capture

PR #76 produced and verified an 18-second clip from the actual app. The exported artifact remains preserved in the earlier worktree. The user's subsequent simplification retires in-app recording and all teaching controls; producing another social asset is separate from this one-toggle experience. The original supplied reel is untouched.

Physical iPhone/Safari performance and touch verification remain pending. Historical recorder backgrounding checks no longer apply to the simplified application.

Validation for the single-toggle revision: all 145 remaining tests, lint and production build pass. Independent review found no material issues. Desktop and 390×844 browser checks covered toggle on/off, absent controls, compact-menu focus, Explore/Orrery retention and Sky cleanup. The earlier clip remains available; recording checks are no longer part of the runtime.
