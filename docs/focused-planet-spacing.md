# Focused planet spacing

Planet and moon detail views spread heliocentric positions and orbit paths around the selected parent. Planet sizes, rings, and local moon offsets remain unchanged, including the shared Orrery moon policy and Explore's existing spacing. The full-system layout returns to its original scale; Sky and active Artemis views use the original coordinates.

One shared affine transform expands heliocentric coordinates while anchoring the selected parent. Its expansion derives from the local system's extent, neighboring body centers, distances to orbit segments, and conservative radial orbit gaps. Expansion is capped at 32. A feathered orbit-line fade protects the projected local system where paths genuinely intersect or a foreground arc would cross its silhouette. This is an illustrative layout, not a physical distance scale; exact coincident bodies cannot be separated by a common finite transform.

Raw positions update before the layout, followed by displayed planets and Sun, local moons, tides, and camera tracking. Camera compensation removes layout movement while retaining simulated motion. The Sun mesh, light, ring shadows, and tide direction share the displayed coordinates. Reduced motion snaps the layout. Asteroid instances retain their individual sizes; background layers stay at the true far depth so they cannot paint over expanded distant bodies.

## Verification

- Lint, production build, and 186 tests pass. Focused tests cover orbit-segment clearance, unchanged local moon scales, all parent systems, Earth through a month of motion, reverse time/date jumps, interrupted focus transitions, finite degenerate cases, reduced motion, mission/Sky bypass, and distant-body background depth.
- Parent browser verification at a 390 × 844 viewport covered Earth at one day per second, Mars → Phobos, Saturn, Pluto, return to system, Explore, Sky, and Artemis. Saturn's foreground orbit stripe is absent; rings and local moons remain unchanged. This is a browser viewport check, not a physical-phone test.
- The parent recorded September 21 onward for 32.21 seconds: 3,214 frames, mean 99.75 fps, p95 interval 16.82 ms, and no gaps above 67 ms. Twelve sampled phases kept the Moon clear. Venus entered the outer frame late in the clip without entering the local Moon region. These measurements describe that preview capture, not a device-wide performance guarantee.
- Sky can stop responding to mode/menu clicks after entering from Pluto. The parent reproduced this on the current production version independently; this existing issue is outside the spacing change.
