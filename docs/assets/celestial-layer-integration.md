# Celestial-layer integration

Orrery and Sky now use the same J2000 equatorial geometry for the NASA faint-star background, catalogue points and optional constellation figures. Explore retains its existing Solar System Scope panorama; it does not receive another bright-star layer.

- The NASA source, attribution, hashes and display processing are documented in [nasa-celestial-sky.md](nasa-celestial-sky.md).
- Automatic and Smoother load the 2K map. More detail requests 4K while retaining 2K as the loading/failure fallback. The managed texture store retains ownership per URL.
- Orrery rotates the shared group with astronomy-engine `Rotation_EQJ_ECL`. Planet positions now use this same library conversion instead of separately hardcoding rounded obliquity.
- Sky uses `Rotation_EQJ_HOR`, including precession and nutation. Astronomy Engine's `(north, west, zenith)` axes become scene `(east, up, south)`. The old approximate latitude/sidereal Euler rotation has been removed. Observer changes update even while simulation time is paused.
- A single point shader uses the existing magnitude data for bounded size and intensity; soft circular falloff replaces solid square points. There are no per-star meshes or universal twinkle animation.
- Galaxy, stars and lines all ignore camera translation when projected and use far-plane depth. They remain behind ordinary objects without moving as the user travels among planets. Constellation lines remain one batch.
- In Sky, all three layers fade with daylight and explicitly clip below the geometric horizon. The existing Sun/Moon/planet positions still include the engine's atmospheric refraction correction; the distant sky uses a rigid geometric rotation, so near-horizon stellar refraction is not simulated.
- The visible **Constellations on/off** toolbar control is independent of Labels. It defaults off. Labels controls names; the constellation switch controls Western connecting figures. Neither operation changes scientific view mode.
- The source image is already display processed; its shader does not apply the scene's planetary tone mapping a second time. Runtime opacity is 0.68 at night and zero at full daylight. It is an enhanced educational depiction, not a calibrated naked-eye visibility forecast.

## Automated verification

The new coordinate suite checks NASA RA handedness, meridian, seam and poles; compares five sky anchors with separate EQJ-to-EQD-plus-Horizon calculations at four observers and three dates; verifies north/east/zenith/nadir; and checks celestial alignment with three actual planet vectors in the ecliptic scene. Dates include a twelve-hour shift and a distant epoch to expose time/precession mistakes. It also checks star size/intensity bounds. The full suite has 110 passing tests; lint and the production build pass.

Browser and physical-device verification remain separate release gates: compiled shader logs, default Orrery image, rapid three-mode transitions, constellation/label independence, camera translation without parallax, both hemispheres, daytime suppression, below-horizon suppression, 2K/4K fallback and frame-time comparisons. This document does not claim those live checks have passed.

Browser composition adjustment: the diffuse layer uses 0.30 opacity so the Milky Way remains visible while catalog stars, planets and labels retain contrast. This is an illustrative exposure choice, not a calibrated naked-eye brightness simulation.

Integration browser checks covered Orrery panorama and constellation toggle independent of labels, Sky at fixed Greenwich midnight, panning across the horizon and below ground, and full daytime fading via Now. The original terrestrial target was50 units away despite a0.01 camera-distance constraint; matching the target to0.01 restores the ground-level observer and removes the visual gap between astronomical and rendered horizons. Toolbar collapses below1024px to accommodate the production voice button. No shader errors were observed; unrelated advertising-script error and existing Three.Clock deprecation warning remain.
