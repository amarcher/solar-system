# CLAUDE.md

## Project Overview

3D interactive solar system explorer for kids (ages 6-14), parents, and teachers. Forked from the [periodic table app](../periodic-table/) to validate the "AI voice guide + interactive educational content" platform pattern. Same stack, same UX patterns, different domain.

**Stack**: Vite 8 + React 19 + TypeScript + Three.js / React Three Fiber + ElevenLabs voice agent.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build (`tsc -b && vite build`)
- `npm run preview` — preview production build
- `npx tsc --noEmit` — type check without emitting
- `npm test` — run unit tests (vitest)

## Architecture

### Navigation — 4-Level State Machine

Single `useState<NavigationState>` in `App.tsx` drives everything. No router.

| Level | What the user sees | Overlay |
|-------|-------------------|---------|
| `system` | Full 3D solar system — Sun, orbiting planets, starfield, asteroid belt | None |
| `sun` | Sun detail experience — peelable layers, star comparison | `SunDetail` dialog |
| `planet` | Planet detail panel over 3D scene | `PlanetDetail` dialog |
| `moon` | Moon detail panel (replaces planet detail) | `MoonDetail` dialog |

```typescript
type NavigationState =
  | { level: 'system' }
  | { level: 'sun' }
  | { level: 'planet'; planetId: string }
  | { level: 'moon'; planetId: string; moonId: string };
```

Navigation state machine lives in `src/hooks/useNavigation.ts`. Back transitions: moon → planet → system; sun → system.

### View Modes — Parallel to Navigation

A `ViewMode` state runs orthogonal to the navigation state machine:

```typescript
type ViewMode = 'artistic' | 'orrery' | 'sky';
```

| Mode | What it shows | Position source |
|------|--------------|----------------|
| `artistic` | Playful circular orbits, compressed scale (default) | `Math.cos/sin * orbitRadius` |
| `orrery` | Real planetary positions for any date/time | `astronomy-engine` VSOP87 ephemeris |
| `sky` | Terrestrial night sky from observer's location | `astronomy-engine` Horizon() alt/az |

Managed by `AstronomyContext` in `src/astronomy/`. The astronomy-engine library (~43KB gz) is lazy-loaded on first mode switch. Both realistic modes share a time system (`timeRef` for 60fps reads, 1Hz `displayTime` for UI).

### 3D Scene — Always Mounted

The R3F `<Canvas>` in `SolarSystemScene.tsx` **never unmounts**. It conditionally renders one of three subtrees based on `ViewMode`: artistic (`PlanetOrbit`), orrery (`RealisticScene`), or sky (`SkyScene`). Detail panels are HTML overlays on top. Camera animates via exponential lerp in `CameraRig.tsx` (artistic/orrery) or `TerrestrialRig.tsx` (sky).

### Key Patterns (copied from periodic table)

- **View Transitions API** for detail open/close clip-path animations
- **Focus-trapped `role="dialog"`** modals for all detail views (Escape closes, Tab cycles)
- **Voice agent** as persistent floating orb — contextual updates on every navigation change
- **CSS `color-mix(in srgb, ...)`** for translucent category colors (no `hsl(from ...)`)
- **BEM-like class naming**: `.component__element--modifier`

## Key Files

### Data (accuracy is critical — verify against authoritative sources)
- `src/data/planets.ts` — 10 planets (Mercury–Neptune + Pluto + Ceres) with scientific data + 3D scene values
- `src/data/moons.ts` — ~27 curated notable moons with `getMoonsByPlanet()` and `getMoonById()`. Moon rotation: most are tidally locked (no `rotationPeriod` needed — defaults to `orbitalPeriod * 24`). Exceptions: `chaoticRotation: true` (Hyperion, Nix, Hydra) or explicit `rotationPeriod` in hours (Nereid).
- `src/data/sun.ts` — Sun data with 6 peelable layers (corona → core)
- `src/data/videoManifest.ts` — keyed by string ID (not atomic number like periodic table)

### Types
- `src/types/celestialBody.ts` — `Planet`, `Moon`, `SunData`, `SunLayer`, `NavigationState`, `PlanetCategory`

### Astronomy Engine (`src/astronomy/`)
- `AstronomyContext.tsx` — React context: `ViewMode`, simulation time, observer location
- `AstronomyService.ts` — lazy wrapper around `astronomy-engine` (heliocentric, geocentric, horizontal positions, sidereal time, moon phase)
- `realisticScale.ts` — log-compressed AU-to-scene-unit mapping for orrery mode
- `useObserver.ts` — observer lat/lng state with geolocation + localStorage persistence
- `types.ts` — `ViewMode`, `AstronomyTime`, `ObserverLocation`

### 3D Scene (`src/components/scene/`)
- `SolarSystemScene.tsx` — R3F Canvas, branches on ViewMode: artistic / orrery / sky
- `Sun.tsx` — custom GLSL noise shader for animated surface + glow sphere
- `PlanetOrbit.tsx` — orbit ring + orbiting planet group (artistic mode)
- `PlanetMesh.tsx` — textured sphere + atmosphere glow + rings (Saturn/Uranus)
- `CameraRig.tsx` — animated camera controller (artistic + orrery modes)
- `RealisticScene.tsx` — orrery mode orchestrator (real star field + astronomy-engine planets)
- `RealisticPlanet.tsx` — planet positioned by heliocentric ephemeris vectors
- `RealisticStarField.tsx` — 8400 real stars from Yale Bright Star Catalog (magnitude/color-mapped)
- `SkyScene.tsx` — terrestrial sky dome with sidereal-time-rotated stars + alt/az-positioned bodies
- `TerrestrialRig.tsx` — fixed-origin camera with alt-az panning (sky mode)
- `HorizonPlane.tsx` — ground disc with N/E/S/W compass labels
- `StarField.tsx` — 3000 instanced points with color variation (artistic mode)
- `AsteroidBelt.tsx` — 600 instanced dodecahedrons between Mars and Jupiter orbits

### Detail Overlays (`src/components/detail/`)
- `PlanetDetail.tsx/css` — planet info, property cards, moon list, fun facts
- `MoonDetail.tsx/css` — moon info with back button to parent planet
- `SunDetail.tsx/css` — unique interactive layout with peelable layer visualization

### Voice Agent
- `src/hooks/useSolarConversation.ts` — ElevenLabs voice session, contextual updates, 4 client tools
- `src/components/ui/VoiceAgent.tsx/css` — floating orb (space-themed orange gradient)

### UI (`src/components/ui/`)
- `ModeToggle.tsx/css` — bottom-center pill toggle: Explore / Orrery / Sky
- `TimeControls.tsx/css` — date display, date picker, "Now" button, speed presets (orrery + sky)
- `ObserverPicker.tsx/css` — lat/lng input + geolocation button (sky mode only)
- `VoiceAgent.tsx/css` — floating orb (space-themed orange gradient)

### Data
- `src/data/stars.ts` — lazy loader for Yale Bright Star Catalog JSON (`public/data/bright_stars.json`)

### Utilities
- `src/utils/colors.ts` — `PlanetCategory` → color mapping (rocky, gas-giant, ice-giant, dwarf)
- `src/utils/scale.ts` — non-linear scaling for orbits/radii (sqrt compression)

## Voice Agent (ElevenLabs)

### Client Tools
- `navigate_to_planet({ name })` — fuzzy-matches planet name, triggers navigation
- `navigate_to_moon({ name })` — fuzzy-matches moon name across all planets
- `navigate_to_sun()` — opens Sun detail
- `go_back()` — returns to previous level

### Context Updates
Every navigation change sends a contextual update describing what the child sees on screen (3D scene state, property cards, moon list, fun facts). Built by `buildPlanetContext()`, `buildMoonContext()`, `buildSunContext()` in `useSolarConversation.ts`.

### Setup
- Agent config: `agent_configs/Solar-System-Explorer-Guide.json` (managed via `@elevenlabs/cli`)
- Tool configs: `tool_configs/` — JSON schemas for client tools
- `agents.json` and `tools.json` are gitignored. After fresh clone: `elevenlabs agents pull && elevenlabs tools pull`

## Accessibility

- Detail overlays are focus-trapped `role="dialog"` modals (close button auto-focused, Tab cycles, Escape closes)
- 3D canvas is `aria-hidden="true"` (purely visual)
- `prefers-reduced-motion`: should disable orbit animations, camera fly-ins, bloom
- Glass-morphism cards should meet WCAG AA contrast

## Relationship to Periodic Table

This repo was forked from `periodic-table/` to reuse the project scaffolding, voice agent patterns, and UX conventions. The goal is to prove the platform generalizes — if both apps work, the pattern extends to any topic (human body, world map, etc.).

Key adaptations from periodic table:
- `ElementDetail` → `PlanetDetail` + `MoonDetail` + `SunDetail` (3 detail types vs 1)
- `useElementConversation` → `useSolarConversation` (4 client tools vs 2, 3 context builders vs 1)
- CSS Grid periodic table → R3F 3D scene as root view
- `AtomVisualizer` pattern → `PlanetMiniScene` (planned) for mini 3D in detail overlays
- Video manifest keyed by string ID instead of atomic number

## Conventions

- CSS uses `color-mix(in srgb, ...)` for translucent category colors
- Category colors passed as `--cat-color` CSS custom property via inline styles
- Component CSS files co-located with `.tsx` files
- BEM-like class naming: `.component__element--modifier`
- 3D scale is artistic, not realistic (log radii, sqrt orbits) — real scale makes inner planets invisible
- Orrery mode uses log-compressed AU (`scaleAU` in `realisticScale.ts`) to keep all planets visible
