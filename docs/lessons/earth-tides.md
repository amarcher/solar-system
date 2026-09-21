# Earth tides lesson

Implemented against the visual foundation `27df062`. This lesson is a schematic equilibrium illustration; it does not predict the tide at any location or use the currently selected simulation date.

## Model and sources

`src/lessons/tides/model.ts` owns the pure state, captions, voice context, and physics. State is `{ step: 'gravity' | 'difference' | 'water', source: 'moon' | 'sun' | 'both', phase: number }`; phase is a manually controlled angle in degrees from the fixed Sun direction. New = 0°, full = 180°, quarter = 90° or 270°. It is not an ephemeris phase.

The differential acceleration uses the leading-order field `w × (3(r·n)n − r)`, with unit Earth surface vector `r`, direction to the perturbing body `n`, and `w` proportional to `GM / d³`. Normalizing by the lunar value gives Moon = 1 and Sun ≈ 0.46. Physical parameters are independent of every rendered size and distance:

| Parameter | Value |
| --- | ---: |
| Lunar GM | 4902.800118 km³/s² |
| Solar GM | 132712440041.279419 km³/s² |
| Representative lunar distance | 384400 km |
| Representative solar distance | 149597870.7 km (1 au) |
| Representative Earth radius | 6371 km |

[JPL astrodynamic parameters](https://ssd.jpl.nasa.gov/astro_par.html) supplies the DE440 GM values and astronomical unit. The lunar distance and Earth radius are rounded representative values, not a date-specific position. Their purpose is to distinguish near/far attraction and the relative tidal contribution.

The water shell uses the degree-two potential `P2(cos θ) = (3 cos² θ − 1)/2`, summed with the same weights. Its base displayed radius is `1.18 + 0.22 × potential`, with a small bounded decorative ripple added in the water stage. The offset and displacement are artistic scale parameters, not physical ocean depths. The shell stays outside the Earth mesh for all supported source/phase combinations. This deliberately idealized global ocean has antipodal bulges and no coasts, ocean dynamics, terrain, or forecast quantities.

Gravity-step arrows use inverse-square attraction at physical points on Earth, normalized separately by each body's center acceleration. Their display scales differ and are disclosed in the legend; comparing blue and gold lengths does not compare gravitational strengths. Difference-step arrows share the tide-strength normalization, subtract the center's acceleration, and can point outward on the far side without implying repulsion. Arrow strokes are laid above the globe for legibility, not altitude.

The scientific explanation follows [NOAA/NASA differential-gravity teaching material](https://www.nesdis.noaa.gov/about/k-12-education/oceans-coasts/what-causes-tides) and [NOAA spring and neap tides](https://oceanservice.noaa.gov/facts/springtide.html). Real coastlines can have different tidal cycles; the lesson makes no universal two-equal-high-tides claim.

## Session and integration

`useTidesLesson` is orthogonal to navigation. Earth entry is present in desktop details and mobile/cinema Explore or Orrery. Artemis replay must be exited first. Opening records `timeRef.current` (not the throttled displayed date), rate, navigation/mode identity, and focus once, then sets rate to zero. Closing restores the exact saved millisecond time before the original rate and returns focus to the entry. Navigation is never restored. Voice mode/time/navigation callbacks close the lesson before performing the requested action; an external navigation fallback also releases it without undoing the new destination.

CameraRig keeps the same controls instance mounted. It serializes settings plus the current pose (rather than an in-flight transition destination), disables camera gestures/tracking, and sets a fixed schematic view. Closing restores those settings and pose before tracking resumes. Resize reframes the lesson without overwriting the original snapshot. If navigation changes at exit, its normal constraints and tracking take over after restoration.

The permanent Canvas and ordinary scene groups stay mounted, hidden under the lesson. Artistic motion pauses, astronomical time is frozen, normal HTML controls are hidden and inert, and ordinary scene labels are disabled. The water stage adds gentle illustrative ripple motion, controlled by Pause water / Resume water and frozen automatically for reduced motion. Macro-scale bulges still use the physical P2 model; ripples are a visual treatment, not a hydrodynamic simulation. Other lesson stages do not animate. TidesScene is absent while off, so its geometry, material, labels, and texture subscriptions only exist while active. Reused Earth/Moon images may remain in the application's shared bounded texture cache, consistent with its normal lifetime policy.

The lesson uses one water mesh and one batched arrow draw, plus the Earth, Moon, Sun-direction marker and dark background. The water shape updates shader uniforms. Arrow buffers update only for manual state changes. Shared pure `tidesCaption`, `TIDES_QUALIFICATION`, and `tidesVoiceContext` are available for the separate recording milestone. The integrated recorder copies the actual Canvas after rendering and paints the shared qualifications/credits into a native portrait composition; see [recording integration](../../src/recording/README.md). Raw Canvas capture alone would omit the HTML qualifications/credits.

Earth and Moon image credit is **Solar System Scope, CC BY 4.0**. Source and license links are reachable within the lesson. Parent verified these unchanged JPEGs against publisher bytes in M1; that manifest change must be included when merging this branch.

## Validation and remaining checks

- Model tests: real attraction points toward Moon on both sides; differential field vanishes at center and compresses at quadrature; solar contribution is smaller; new/full reinforce equally; quarter reduces but does not eliminate equatorial range; shell finite and antipodally symmetric over sampled directions/phases.
- Restoration helpers: exact milliseconds/rate ordering, paused rates, and external destination detection.
- Local TypeScript/build, lint and tests run by executor. Browser and physical iPhone/Safari validation remain coordinator acceptance checks; no voice call was started.
- Coordinator should check mobile scrolling with qualification fixed visible, keyboard focus wrapping and Escape, connected/connecting voice session entry, rapidly switching presets, exit during camera fly-in, repeated entry/exit resource counts, prior time/rate/camera restore, and external voice navigation preserving its destination.
- Parent M1 changes CameraRig frame order and moon framing. Preserve both its explicit frame priority and this lesson suspension when resolving that integration.

## Integrated browser findings

The browser check caught stale shader uniforms: the Moon marker moved at quarter phase while the water shell retained its initial orientation. Three caches the uniforms object for the linked shader. The corrected component keeps that object stable and updates its vector values before each render, including while ripples are paused. Fresh-load checks now show the Moon-only shell rotate from horizontal at new Moon to vertical at quarter; combined new/full configurations reinforce while quarter reduces the range. Preserve this visual check when changing the shader.

At 390×844, all lesson controls remain reachable by panel scrolling and the model qualification stays visible. Close and Escape return focus to Why tides and restore the original clock rate. A resize while the lesson is open does not overwrite the saved camera pose. Moon/Sun labels have separate baselines. The supplied 56-second reel is a visual reference for the translucent rippling envelope; this lesson does not yet model its friction, leading bulge, or lunar-recession story.
