# Solar System Explorer

Interactive 3D solar system explorer for kids, built with React + Three.js + ElevenLabs voice AI.

Click any planet to explore its details, moons, and fun facts. An AI voice guide narrates the experience and responds to questions. Click the Sun for a special interactive experience where you can peel back its layers from the corona to the core.

Part of a series of educational interactive apps — see also: [Periodic Table](https://github.com/amarcher/periodic-table) and [Animal Penpals](https://animalpenpals.tech/).

---

## Roadmap

### Completed

- [x] **Phase 0: Fork + Scaffold** — New repo from periodic table, gutted element-specific code, all config carried over
- [x] **Phase 1: 3D Scene** — Solar system with GLSL Sun shader, 10 orbiting planets, starfield, asteroid belt, bloom post-processing, orbit controls
- [x] **Phase 2: Navigation + Planet Detail** — 4-level state machine (system → sun/planet → moon), `PlanetDetail` overlay with property cards + moon list + fun facts, View Transitions API animations
- [x] **Phase 2b: Sun + Moon Detail** — `SunDetail` with interactive peelable layers (corona → core), `MoonDetail` with back navigation
- [x] **Phase 2c: Voice Agent** — `useSolarConversation` hook with 4 client tools (`navigate_to_planet`, `navigate_to_moon`, `navigate_to_sun`, `go_back`), contextual update builders for planets/moons/Sun

- [x] **Astronomical Clock** — Three view modes (Explore / Orrery / Sky) powered by `astronomy-engine` VSOP87 ephemeris. Orrery shows real planetary positions for any date. Sky mode renders the actual night sky from any location on Earth with 8400 real stars, sidereal-time rotation, and compass-oriented horizon.
- [x] **Time Controls** — Speed up/slow down orbits with preset playback rates, date picker to jump to any date, "Now" button to return to real time. Voice agent can also set time and speed.
- [x] **Device Orientation (Sky Mode)** — Point phone at the sky, camera follows gyroscope/compass heading. Uses `DeviceOrientationEvent` with iOS permission flow.
- [x] **Artemis Mission Replay** — In orrery mode, visualize the Artemis II mission trajectory near Earth with interpolated ephemeris data, Moon-direction alignment, and a scaled flight path.

### Up Next

- [ ] **Phase 3: Textures + Visual Polish** — Download Solar System Scope textures (CC-BY, 8K), progressive loading (512px bundled → 4K from CDN), PBR materials (diffuse + normal + bump maps), atmosphere Fresnel shader, ring textures for Saturn/Uranus, Sun noise shader improvements, NASA cubemap skybox
- [ ] **Phase 4: Planet Detail Content** — `PlanetMiniScene` (mini R3F canvas showing planet + orbiting moons inside detail overlay, same pattern as `AtomVisualizer` in periodic table), `ComparisonViz` ("X Earths fit inside Jupiter"), `BodyVideo` / `BodyPhoto` media components
- [ ] **Phase 5: Full Navigation Polish** — Keyboard accessibility for 3D scene (hidden `role="listbox"` overlay with one `role="option"` per planet, arrow keys navigate, Enter activates), `prefers-reduced-motion` pass (disable orbits, camera fly-ins, bloom), screen reader testing
- [ ] **Phase 5b: Sun Detail Experience** — Solar flare/prominence animation in mini 3D scene, `StarComparison.tsx` (Sun vs Betelgeuse, Sirius, VY Canis Majoris with scaled circles), optional NASA DONKI API for live solar cycle data
- [ ] **Phase 6: ElevenLabs Agent Config** — Create agent in ElevenLabs dashboard, write space-themed system prompt, configure tool schemas, push config with `@elevenlabs/cli`
- [ ] **Phase 7: Video + Polish** — Generate planet/moon videos (Veo 3.1), R2 bucket + CDN setup, `BodyVideo` / `BodyPhoto` wiring, loading screen for texture bootstrap, accessibility pass, performance pass (texture compression, lazy loading)
- [ ] **Phase 8: Deploy** — Vercel project setup, environment variables, cross-device testing, mobile touch controls for 3D scene

### Future Ideas

- Constellation lines overlay
- Planet comparison mode — drag two planets side by side
- AR mode — overlay planet info on camera feed (device orientation done, camera feed overlay remaining)
- Generalize the platform — human body explorer, world map explorer, etc.

---

## Getting Started

```bash
npm install
npm run dev
```

### Voice Agent Setup

1. Create an agent at [ElevenLabs](https://elevenlabs.io) → Conversational AI
2. Copy `.env.example` to `.env` and add your agent ID
3. Push tool configs: `npx @elevenlabs/cli tools push`

### Video Setup

Videos are optional. Without them, the app works fine — video slots are simply empty.

To add videos:
1. Generate with Veo 3.1 (or any source)
2. Upload to Cloudflare R2
3. Add entries to `src/data/videoManifest.ts`
4. Set `VITE_VIDEO_CDN_URL` in production environment

---

## Tech Stack

| Concern | Technology |
|---------|-----------|
| UI framework | React 19 + TypeScript |
| 3D rendering | React Three Fiber + Drei + Three.js |
| Post-processing | @react-three/postprocessing (Bloom) |
| Build tool | Vite 8 |
| Voice AI | ElevenLabs React SDK |
| Video hosting | Cloudflare R2 CDN |
| Deployment | Vercel |

---

## Data

- **10 planets**: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, Ceres
- **~27 curated moons**: The notable ones (Titan, Europa, Io, Ganymede, Enceladus, Triton, Charon, our Moon, etc.)
- **The Sun**: Special entity with 6 interactive layers (Corona → Chromosphere → Photosphere → Convective Zone → Radiative Zone → Core)

All scientific data should be verified against NASA/JPL sources.

---

## Credits

**Planet & moon diffuse textures** — [Solar System Scope](https://www.solarsystemscope.com/textures/) · licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). 8K versions for Mercury, Venus, Earth, Mars, Jupiter, Saturn, and the Moon are served from Cloudflare R2. Uranus, Neptune, Pluto, and Ceres use 2K versions bundled with the app.

**Milky Way starfield backdrop** — Solar System Scope · CC BY 4.0.

**Orion spacecraft 3D model** (Artemis II mission tracker) — "Orion Spacecraft" by [wisemanmods](https://sketchfab.com/3d-models/none-fb89e865dcd446b89eaf78deaf213974) on Sketchfab · licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

**Scientific data & mission profiles** — Public-domain resources from [NASA](https://www.nasa.gov/) and [JPL](https://www.jpl.nasa.gov/), including Artemis II mission parameters, JPL Horizons ephemeris tooling, and planetary body facts.

**Star catalog** — [Yale Bright Star Catalog](http://tdc-www.harvard.edu/catalogs/bsc5.html) (BSC5), 8404 naked-eye stars. JSON conversion via [brettonw/YaleBrightStarCatalog](https://github.com/brettonw/YaleBrightStarCatalog).

**Planetary ephemeris** — [astronomy-engine](https://github.com/cosinekitty/astronomy) by Don Cross · MIT License. VSOP87-based calculations accurate to ±1 arcminute.

**Asteroid textures** — Procedurally generated and/or public-domain sources.

**Voice agent** — Powered by [ElevenLabs Conversational AI](https://elevenlabs.io).
