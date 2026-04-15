import { useCallback, useEffect, useRef, useState } from 'react';
// We bypass @elevenlabs/react's ConversationProvider and use the underlying
// @elevenlabs/client SDK directly. The React provider's state layer is
// broken on iOS Safari 18.7: useConversation reports `disconnected` within
// 1ms of `connected`, useRawConversation never populates, and
// useConversationClientTool registrations don't reach the live session —
// so tool calls vanish. Calling Conversation.startSession() directly
// works perfectly on the same device.
import { Conversation } from '@elevenlabs/client';

import type { Planet, Moon, NavigationState } from '../types/celestialBody';
import type { Mission } from '../types/mission';
import type { ViewMode, ObserverLocation } from '../astronomy/types';
import { planets } from '../data/planets';
import { getMoonsByPlanet, getMoonById } from '../data/moons';
import { missions, getMissionById } from '../data/missions';
import { trackVoiceAgentActivated } from '../utils/analytics';
import { categoryLabels } from '../utils/colors';
import { sun } from '../data/sun';

interface ConversationCallbacks {
  currentNav: NavigationState;
  currentMode: ViewMode;
  currentObserver: ObserverLocation;
  displayTime: Date;
  onNavigatePlanet: (planetId: string) => void;
  onNavigateMoon: (planetId: string, moonId: string) => void;
  onNavigateSun: () => void;
  onTrackMission: (missionId: string) => void;
  onGoBack: () => void;
  onPeelSunLayer: (layerIndex: number) => void;
  onSwitchMode: (mode: ViewMode) => void;
  onSetDate: (date: Date) => void;
  onSetRate: (rate: number) => void;
}

export type VoiceStatus = 'off' | 'connecting' | 'connected' | 'error';
export type MicError = 'timeout' | 'not-allowed' | 'device' | 'no-input' | null;

function buildPlanetContext(planet: Planet): string {
  const moons = getMoonsByPlanet(planet.id);
  const parts = [
    `[PLANET CLICK] The child just clicked on ${planet.name}.`,
    `It is a ${categoryLabels[planet.category]}, #${planet.orderFromSun} from the Sun.`,
    `Diameter: ${planet.diameter.toLocaleString()} km. Mass: ${planet.mass}.`,
    `Gravity: ${planet.gravity} m/s². Mean temperature: ${planet.meanTemperature}°C.`,
    `Day length: ${Math.abs(planet.rotationPeriod)} hours${planet.rotationPeriod < 0 ? ' (retrograde rotation!)' : ''}.`,
    `Year length: ${planet.orbitalPeriod} Earth days. Distance from Sun: ${planet.distanceFromSun} AU.`,
    '',
    `[WHAT THE CHILD SEES]`,
    `- The 3D solar system scene in the background with the camera focused on ${planet.name}`,
    `- Planet name, category, and key properties displayed`,
    `- ${planet.atmosphereComposition ? `Atmosphere: ${planet.atmosphereComposition}` : 'No significant atmosphere'}`,
  ];

  if (moons.length > 0) {
    parts.push(`- A list of ${moons.length} notable moons they can click on:`);
    moons.forEach(m => parts.push(`  • ${m.name}: ${m.notableFeature}`));
  }

  parts.push('', `[ABOUT]`, planet.summary);
  parts.push('', `[FUN FACTS on screen]`);
  planet.funFacts.forEach((fact, i) => parts.push(`${i + 1}. ${fact}`));

  if (planet.discoveredBy) {
    parts.push('', `Discovered by ${planet.discoveredBy} (${planet.yearDiscovered}).`);
  }

  parts.push('', `Get excited about ${planet.name}! Reference what the child sees on screen.`);
  return parts.join('\n');
}

function buildMoonContext(moon: Moon, planet: Planet): string {
  return [
    `[MOON CLICK] The child is now looking at ${moon.name}, a moon of ${planet.name}.`,
    `Notable feature: ${moon.notableFeature}`,
    `Diameter: ${moon.diameter.toLocaleString()} km. Gravity: ${moon.gravity} m/s².`,
    `Temperature: ${moon.meanTemperature}°C. Orbital period: ${moon.orbitalPeriod} days.`,
    '',
    moon.summary,
    '',
    `[FUN FACTS on screen]`,
    ...moon.funFacts.map((f, i) => `${i + 1}. ${f}`),
    '',
    moon.discoveredBy ? `Discovered by ${moon.discoveredBy} (${moon.yearDiscovered}).` : '',
    '',
    `Tell the child about this fascinating moon!`,
  ].filter(Boolean).join('\n');
}

function buildMissionContext(mission: Mission): string {
  const launch = Date.parse(mission.launchDate);
  const end = Date.parse(mission.endDate);
  const now = Date.now();
  const totalDays = Math.max(1, Math.round((end - launch) / 86_400_000));
  const elapsedMs = Math.max(0, now - launch);
  const elapsedDays = Math.min(totalDays, Math.floor(elapsedMs / 86_400_000) + 1);
  const progress = Math.max(0, Math.min(1, (now - launch) / (end - launch)));
  const isComplete = now > end;

  // Phase boundaries match src/data/missions/artemis2.ts
  let phase: string;
  if (isComplete) phase = 'mission complete (trajectory replaying)';
  else if (progress < 0.10) phase = 'parking orbit around Earth (pre-TLI burn)';
  else if (progress < 0.45) phase = 'outbound coast toward the Moon';
  else if (progress < 0.55) phase = 'lunar flyby (closest approach to the Moon)';
  else if (progress < 0.97) phase = 'return coast back to Earth';
  else phase = 'reentry — coming home!';

  return [
    `[MISSION TRACKER OPENED] The child just opened the live ${mission.name} tracker.`,
    '',
    `[WHAT THEY SEE]`,
    `- The whole solar system is FROZEN in place`,
    `- The camera has flown out from the solar system to the spacecraft itself`,
    `- A glowing orange line shows the spacecraft's planned trajectory through space`,
    `- They can see Earth, the Moon, and the spacecraft along its path`,
    `- The trajectory shows: a small parking orbit around Earth, then a long curving arc out past the Moon and back`,
    `- They can drag to pan around the spacecraft and zoom in/out`,
    '',
    `[MISSION DETAILS]`,
    `- Name: ${mission.name} (${mission.agency})`,
    `- Launched: April 1, 2026 at 6:35 PM Eastern Time from Kennedy Space Center, Florida`,
    `- Mission length: ${totalDays} days`,
    `- Current status: ${isComplete ? 'COMPLETE' : `Day ${elapsedDays} of ${totalDays}`}`,
    `- Current phase: ${phase}`,
    '',
    `[ABOUT THE MISSION]`,
    mission.summary,
    '',
    `[FUN FACTS]`,
    ...mission.funFacts.map((f, i) => `${i + 1}. ${f}`),
    '',
    `[REAL PHYSICS DETAILS — for older kids or parents who ask]`,
    `- Artemis II uses a "free-return" trajectory: the spacecraft launches into a highly elliptical Earth orbit (perigee 563 km, apogee 70,000 km), completes nearly one full revolution, then fires a single Trans-Lunar Injection burn at perigee that adds just 380 m/s but stretches the orbit out to lunar distance.`,
    `- The Moon's gravity then deflects the path back toward Earth — no second burn needed. Perilune (closest approach to the Moon) is about 6,500 km from the lunar surface.`,
    `- The spacecraft slows to almost a standstill at the apex of the arc (about 0.2 km/s at 393,000 km from Earth), then Earth's gravity pulls it back home. Real free-returns are "lazy U-turns," not Hollywood slingshots.`,
    `- Crew: four astronauts including the first woman and first person of color to journey beyond low Earth orbit.`,
    '',
    `Get excited! This is the first time humans have flown to the Moon since 1972 — over 50 years! Encourage the child to explore the trajectory, and answer their questions about where the rocket is right now.`,
  ].join('\n');
}

function buildSunContext(): string {
  return [
    `[SUN CLICK] The child just clicked on the Sun!`,
    `The Sun is a ${sun.spectralType} main-sequence star.`,
    `Diameter: ${sun.diameter.toLocaleString()} km. Surface temperature: ${sun.surfaceTemperature}°C. Core: ${sun.coreTemperature}.`,
    `Age: ${sun.age}. Luminosity: ${sun.luminosity}.`,
    '',
    `[WHAT THE CHILD SEES]`,
    `- An interactive visualization where they can peel back the Sun's layers`,
    `- Layers from outside in: ${sun.layers.map(l => l.name).join(' → ')}`,
    `- Each layer shows its temperature and description when clicked`,
    '',
    sun.summary,
    '',
    `[FUN FACTS on screen]`,
    ...sun.funFacts.map((f, i) => `${i + 1}. ${f}`),
    '',
    `Get excited about the Sun! Encourage the child to click through the layers.`,
  ].join('\n');
}

function buildOrreryContext(displayTime: Date, nav: NavigationState): string {
  const dateStr = displayTime.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const parts = [
    `[MODE: ORRERY] The user is viewing the real-time orrery — planets are positioned at their true locations for ${dateStr}.`,
    `This is a scientifically accurate view powered by the VSOP87 ephemeris (astronomy-engine).`,
    `The user can scrub time forward/backward and change playback speed.`,
  ];
  if (nav.level === 'planet') {
    const planet = planets.find(p => p.id === nav.planetId);
    if (planet) {
      const moons = getMoonsByPlanet(planet.id);
      parts.push(``, `They're focused on ${planet.name} and can see its ${moons.length} moons orbiting at their real orbital periods.`);
    }
  }
  parts.push(``, `You can navigate to any planet, moon, or the Sun — the navigation tools work in orrery mode too.`);
  parts.push(`You can also suggest they switch to Sky mode to see the night sky from Earth, or back to Explore mode for the playful view.`);
  return parts.join('\n');
}

function buildSkyContext(displayTime: Date, observer: ObserverLocation): string {
  const dateStr = displayTime.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = displayTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const latDir = observer.latitude >= 0 ? 'N' : 'S';
  const lngDir = observer.longitude >= 0 ? 'E' : 'W';
  const locStr = `${Math.abs(observer.latitude).toFixed(1)}°${latDir}, ${Math.abs(observer.longitude).toFixed(1)}°${lngDir}`;

  return [
    `[MODE: SKY] The user is viewing the night sky as it appears from ${locStr} on ${dateStr} at ${timeStr}.`,
    `They're looking up at the real sky with 8,400 stars from the Yale Bright Star Catalog positioned accurately.`,
    `Planets and the Sun are shown at their true altitude/azimuth positions. Objects below the horizon are hidden.`,
    `There's a compass on the ground showing N/E/S/W directions.`,
    ``,
    `In this mode, do NOT navigate or change the view. Instead:`,
    `- Answer questions about what they can see in the sky`,
    `- Point out bright stars, planets, or constellations that should be visible`,
    `- Explain what they're looking at if they ask`,
    `- Suggest they try different times or locations to see different skies`,
    ``,
    `If they want to explore a planet up close, suggest switching to Explore or Orrery mode.`,
  ].join('\n');
}

function buildFirstMessage(nav: NavigationState): string | undefined {
  switch (nav.level) {
    case 'sun':
      return `Hi there! I'm Stella, your space guide! Wow, you're checking out the Sun — the biggest, most powerful thing in our whole solar system! Did you know you can peel back its layers to see what's inside? Try clicking on a layer, or ask me anything about our amazing star!`;
    case 'planet': {
      const planet = planets.find(p => p.id === nav.planetId);
      if (!planet) return undefined;
      const moons = getMoonsByPlanet(planet.id);
      const moonHint = moons.length > 0
        ? ` You can also check out ${moons.length === 1 ? 'its moon' : `its ${moons.length} moons`}!`
        : '';
      return `Hi there! I'm Stella, your space guide! Oh cool, you're already exploring ${planet.name}! That's a ${categoryLabels[planet.category]} — one of the most fascinating worlds in our solar system.${moonHint} Ask me anything about ${planet.name}, or I can take you somewhere else!`;
    }
    case 'moon': {
      const planet = planets.find(p => p.id === nav.planetId);
      const moon = getMoonById(nav.moonId);
      if (!planet || !moon) return undefined;
      return `Hi there! I'm Stella, your space guide! Ooh, you found ${moon.name} — a moon of ${planet.name}! ${moon.notableFeature}. Ask me anything about this amazing moon, or I can take you to explore something else!`;
    }
    case 'mission': {
      const mission = getMissionById(nav.missionId);
      if (!mission) return undefined;
      return `Hi there! I'm Stella, your space guide! Whoa — you found the secret mission tracker! That's ${mission.name}, a real NASA mission flying to the Moon RIGHT NOW with four astronauts on board! Want me to tell you where the rocket is?`;
    }
    default:
      return undefined;
  }
}

function buildContextForNav(nav: NavigationState): string | null {
  switch (nav.level) {
    case 'sun':
      return buildSunContext();
    case 'planet': {
      const planet = planets.find(p => p.id === nav.planetId);
      return planet ? buildPlanetContext(planet) : null;
    }
    case 'moon': {
      const planet = planets.find(p => p.id === nav.planetId);
      const moon = getMoonById(nav.moonId);
      return planet && moon ? buildMoonContext(moon, planet) : null;
    }
    case 'mission': {
      const mission = getMissionById(nav.missionId);
      return mission ? buildMissionContext(mission) : null;
    }
    default:
      return null;
  }
}

export function useSolarConversation({ currentNav, currentMode, currentObserver, displayTime, onNavigatePlanet, onNavigateMoon, onNavigateSun, onTrackMission, onGoBack, onPeelSunLayer, onSwitchMode, onSetDate, onSetRate }: ConversationCallbacks) {
  const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string | undefined;

  // Live Conversation instance from @elevenlabs/client. We hold this in
  // a ref so callbacks can read the latest value without re-rendering.
  const convRef = useRef<Conversation | null>(null);

  // Optimistic session-active flag flipped synchronously on toggle click
  // so the UI button doesn't lag behind the user's action. Cleared on
  // onDisconnect or stop.
  const [sessionStarted, setSessionStarted] = useState(false);

  // Status & speaking state, set from the SDK callbacks at session level.
  const [rawStatus, setRawStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [micError, setMicError] = useState<MicError>(null);
  const pendingNavRef = useRef<NavigationState | null>(null);
  const currentNavRef = useRef<string | null>(null);
  const latestNavRef = useRef<NavigationState>(currentNav);
  latestNavRef.current = currentNav;

  // Refs to navigation handlers so client tools always invoke the LATEST
  // closure even though clientTools are passed once at session start.
  // Without this, a tool call halfway through a session would fire
  // against stale React state.
  const handlersRef = useRef({ onNavigatePlanet, onNavigateMoon, onNavigateSun, onTrackMission, onGoBack, onPeelSunLayer, onSwitchMode, onSetDate, onSetRate });
  handlersRef.current = { onNavigatePlanet, onNavigateMoon, onNavigateSun, onTrackMission, onGoBack, onPeelSunLayer, onSwitchMode, onSetDate, onSetRate };

  // Keep mode/observer/time refs for contextual updates
  const modeRef = useRef(currentMode);
  modeRef.current = currentMode;
  const observerRef = useRef(currentObserver);
  observerRef.current = currentObserver;
  const displayTimeRef = useRef(displayTime);
  displayTimeRef.current = displayTime;

  // Abort flag for in-flight startSession. If the user clicks stop
  // while the start path is still awaiting Conversation.startSession,
  // we set this flag. When the promise resolves, the start path tears
  // down the new session immediately — preventing the "double session"
  // bug where rapid stop+start leaks two live sessions.
  const startAbortRef = useRef(false);

  // Build the clientTools record passed to Conversation.startSession.
  // Tools dispatch through handlersRef so they always hit the current
  // React closures, not whatever was captured at session-start time.
  const buildClientTools = useCallback(() => ({
    navigate_to_planet: (params: { name?: unknown }) => {
      console.log('[voice] navigate_to_planet called:', params);
      try {
        const name = String(params.name ?? '');
        const match = planets.find(p =>
          p.name.toLowerCase() === name.toLowerCase() || p.id === name.toLowerCase()
        );
        if (!match) return `No planet found matching "${name}"`;
        handlersRef.current.onNavigatePlanet(match.id);
        return `Navigated to ${match.name}`;
      } catch (err) {
        console.error('[voice] navigate_to_planet failed:', err);
        return `Navigation failed: ${(err as Error)?.message ?? 'unknown error'}`;
      }
    },
    navigate_to_moon: (params: { name?: unknown }) => {
      console.log('[voice] navigate_to_moon called:', params);
      try {
        const name = String(params.name ?? '');
        for (const planet of planets) {
          const moons = getMoonsByPlanet(planet.id);
          const moon = moons.find(m =>
            m.name.toLowerCase() === name.toLowerCase() || m.id === name.toLowerCase()
          );
          if (moon) {
            handlersRef.current.onNavigateMoon(planet.id, moon.id);
            return `Navigated to ${moon.name} (moon of ${planet.name})`;
          }
        }
        return `No moon found matching "${name}"`;
      } catch (err) {
        console.error('[voice] navigate_to_moon failed:', err);
        return `Navigation failed: ${(err as Error)?.message ?? 'unknown error'}`;
      }
    },
    navigate_to_sun: () => {
      console.log('[voice] navigate_to_sun called');
      try {
        handlersRef.current.onNavigateSun();
        return 'Navigated to the Sun';
      } catch (err) {
        console.error('[voice] navigate_to_sun failed:', err);
        return `Navigation failed: ${(err as Error)?.message ?? 'unknown error'}`;
      }
    },
    track_mission: (params: { name?: unknown }) => {
      console.log('[voice] track_mission called:', params);
      try {
        const rawName = params.name;
        const query = (typeof rawName === 'string' ? rawName : 'artemis').toLowerCase();
        const match = missions.find(m =>
          m.name.toLowerCase().includes(query) ||
          m.id.toLowerCase().includes(query) ||
          query.includes(m.name.toLowerCase()) ||
          query.includes(m.id.toLowerCase())
        ) ?? missions[0];
        if (!match) return 'No active missions to track right now.';
        handlersRef.current.onTrackMission(match.id);
        return `Opened the live ${match.name} mission tracker. The solar system is paused and the camera is flying out to the spacecraft.`;
      } catch (err) {
        console.error('[voice] track_mission failed:', err);
        return `Mission tracker failed: ${(err as Error)?.message ?? 'unknown error'}`;
      }
    },
    go_back: () => {
      console.log('[voice] go_back called');
      try {
        handlersRef.current.onGoBack();
        return 'Went back';
      } catch (err) {
        console.error('[voice] go_back failed:', err);
        return `Go back failed: ${(err as Error)?.message ?? 'unknown error'}`;
      }
    },
    set_time: (params: { date?: unknown }) => {
      console.log('[voice] set_time called:', params);
      try {
        const dateStr = String(params.date ?? '');
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return `Could not parse date "${dateStr}"`;
        handlersRef.current.onSetDate(d);
        return `Time set to ${d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
      } catch (err) {
        return `Failed: ${(err as Error)?.message ?? 'unknown error'}`;
      }
    },
    set_time_speed: (params: { speed?: unknown }) => {
      console.log('[voice] set_time_speed called:', params);
      try {
        const speedStr = String(params.speed ?? '').toLowerCase();
        const speedMap: Record<string, number> = {
          paused: 0, pause: 0, stop: 0,
          'real-time': 1, '1x': 1, normal: 1, realtime: 1,
          '10 minutes': 600, '10 min': 600,
          '1 hour': 3600, '1 hr': 3600,
          '1 day': 86400,
          '1 month': 86400 * 30,
        };
        const rate = speedMap[speedStr] ?? parseFloat(speedStr);
        if (isNaN(rate)) return `Unknown speed "${speedStr}". Try: paused, real-time, 10 min, 1 hour, 1 day, 1 month`;
        handlersRef.current.onSetRate(rate);
        const labels: Record<number, string> = { 0: 'Paused', 1: '1x (real-time)', 600: '10 min/sec', 3600: '1 hr/sec', 86400: '1 day/sec' };
        return `Time speed set to ${labels[rate] ?? `${rate}x`}`;
      } catch (err) {
        return `Failed: ${(err as Error)?.message ?? 'unknown error'}`;
      }
    },
    switch_view_mode: (params: { mode?: unknown }) => {
      console.log('[voice] switch_view_mode called:', params);
      try {
        const modeStr = String(params.mode ?? '').toLowerCase();
        const modeMap: Record<string, ViewMode> = {
          explore: 'artistic', artistic: 'artistic',
          orrery: 'orrery', 'real-time': 'orrery', realistic: 'orrery',
          sky: 'sky', 'night sky': 'sky', terrestrial: 'sky',
        };
        const target = modeMap[modeStr];
        if (!target) return `Unknown mode "${modeStr}". Available: explore, orrery, sky`;
        handlersRef.current.onSwitchMode(target);
        const labels: Record<ViewMode, string> = { artistic: 'Explore', orrery: 'Orrery', sky: 'Sky' };
        return `Switched to ${labels[target]} mode`;
      } catch (err) {
        console.error('[voice] switch_view_mode failed:', err);
        return `Mode switch failed: ${(err as Error)?.message ?? 'unknown error'}`;
      }
    },
    peel_sun_layer: (params: { layer?: unknown }) => {
      console.log('[voice] peel_sun_layer called:', params);
      try {
        const layerName = String(params.layer ?? '');
        const idx = sun.layers.findIndex(l => l.name.toLowerCase() === layerName.toLowerCase());
        if (idx === -1) {
          return `No layer found matching "${layerName}". Available layers: ${sun.layers.map(l => l.name).join(', ')}`;
        }
        handlersRef.current.onPeelSunLayer(idx);
        const layer = sun.layers[idx];
        return `Peeled to ${layer.name} layer (${layer.temperature}). ${layer.description.slice(0, 120)}...`;
      } catch (err) {
        console.error('[voice] peel_sun_layer failed:', err);
        return `Sun layer failed: ${(err as Error)?.message ?? 'unknown error'}`;
      }
    },
  }), []);

  const toggle = useCallback(async () => {
    if (!agentId) return;

    if (sessionStarted) {
      // Stop path
      setSessionStarted(false);
      setIsSpeaking(false);
      setRawStatus('disconnected');
      // Signal any in-flight startSession to abort when its promise
      // resolves. Without this, a fast stop+start sequence leaves the
      // first session orphaned but still alive.
      startAbortRef.current = true;
      const conv = convRef.current;
      convRef.current = null;
      if (conv) {
        try {
          await conv.endSession();
        } catch {
          // Session may already be closed
        }
      }
      return;
    }

    // Start path
    startAbortRef.current = false;
    setSessionStarted(true);
    setRawStatus('connecting');

    trackVoiceAgentActivated();

    // Pre-flight getUserMedia inside the user gesture to trigger the mic
    // permission prompt early (so the SDK's later acquisition uses cached
    // perm) AND to keep user activation alive for iOS audio.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch (err) {
      const error = err as DOMException;
      if (error.name === 'NotAllowedError') setMicError('not-allowed');
      else setMicError('device');
      setSessionStarted(false);
      setRawStatus('disconnected');
      return;
    }

    const navAtStart = latestNavRef.current;
    const firstMessage = buildFirstMessage(navAtStart);
    if (navAtStart.level !== 'system') {
      pendingNavRef.current = navAtStart;
    }

    try {
      const conv = await Conversation.startSession({
        agentId,
        connectionType: 'websocket',
        clientTools: buildClientTools(),
        ...(firstMessage && {
          overrides: { agent: { firstMessage } },
        }),
        onConnect: () => {
          setRawStatus('connected');
          // NOTE: We can't send queued nav context here — onConnect fires
          // INSIDE the awaited Conversation.startSession() call, so
          // convRef.current hasn't been assigned yet. The send happens
          // immediately after the await resolves below.
        },
        onDisconnect: () => {
          setRawStatus('disconnected');
          setIsSpeaking(false);
          setSessionStarted(false);
          convRef.current = null;
        },
        onError: (err: unknown) => {
          console.error('[voice] session error:', err);
        },
        onMessage: () => {
          // Messages handled by SDK
        },
        onStatusChange: (s: { status: string }) => {
          if (s.status === 'connected' || s.status === 'connecting' || s.status === 'disconnected') {
            setRawStatus(s.status);
          }
        },
        onModeChange: (m: { mode: string }) => {
          setIsSpeaking(m.mode === 'speaking');
        },
        onDebug: () => {
          // Debug messages handled by SDK
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- callbacks not all in public type
      } as any);

      // If the user clicked stop while we were awaiting the startSession
      // promise, abort: tear down this brand-new session immediately
      // instead of installing it. This prevents the orphaned-session
      // bug where a stop+start race leaves two live sessions.
      if (startAbortRef.current) {
        startAbortRef.current = false;
        try {
          await conv.endSession();
        } catch {
          // Session may already be closed
        }
        return;
      }
      convRef.current = conv;

      // Now that convRef is populated, flush any queued nav context.
      // This is necessary because onConnect fires INSIDE the await
      // above, before convRef.current = conv runs.
      if (pendingNavRef.current) {
        const queuedNav = pendingNavRef.current;
        pendingNavRef.current = null;
        const ctx = buildContextForNav(queuedNav);
        if (ctx) {
          try {
            conv.sendContextualUpdate(ctx);
          } catch (err) {
            console.error('[voice] sendContextualUpdate failed:', err);
          }
        }
      }
    } catch (err) {
      console.error('[voice] startSession failed:', err);
      setSessionStarted(false);
      setRawStatus('disconnected');
      setMicError('device');
    }
  }, [agentId, sessionStarted, buildClientTools]);

  const clearMicError = useCallback(() => setMicError(null), []);

  const notifyNavChange = useCallback((nav: NavigationState) => {
    if (!agentId) return;
    const key = JSON.stringify(nav);
    if (currentNavRef.current === key) return;
    currentNavRef.current = key;
    const ctx = buildContextForNav(nav);
    if (!ctx) return;
    if (convRef.current && rawStatus === 'connected') {
      try {
        convRef.current.sendContextualUpdate(ctx);
      } catch (err) {
        console.error('[voice] sendContextualUpdate failed:', err);
      }
    } else {
      pendingNavRef.current = nav;
    }
  }, [agentId, rawStatus]);

  const notifyLayerChange = useCallback((layerIndex: number) => {
    if (!agentId || !convRef.current || rawStatus !== 'connected') return;
    const layer = sun.layers[layerIndex];
    const peeledLayers = sun.layers.slice(0, layerIndex).map(l => l.name);
    const deeperLayers = sun.layers.slice(layerIndex + 1).map(l => l.name);
    convRef.current.sendContextualUpdate(
      [
        `[SUN LAYER PEELED] The child just peeled to the ${layer.name} layer!`,
        peeledLayers.length > 0
          ? `They've peeled past: ${peeledLayers.join(', ')}.`
          : `This is the outermost layer.`,
        `Now viewing: ${layer.name} — ${layer.temperature}.`,
        layer.description,
        deeperLayers.length > 0
          ? `Deeper layers they can still explore: ${deeperLayers.join(', ')}.`
          : `This is the innermost layer — the core! They've peeled all the way down!`,
        '',
        `React with excitement about what they just revealed! Share a cool fact about this layer.`,
      ].join('\n')
    );
  }, [agentId, rawStatus]);

  const notifyNavClosed = useCallback(() => {
    if (!agentId || !convRef.current || rawStatus !== 'connected') return;
    currentNavRef.current = null;
    convRef.current.sendContextualUpdate(
      '[CLOSED] The child returned to the solar system overview. ' +
      'Encourage them to explore a planet, moon, or the Sun!'
    );
  }, [agentId, rawStatus]);

  const notifyModeChange = useCallback((mode: ViewMode) => {
    if (!agentId || !convRef.current || rawStatus !== 'connected') return;
    let ctx: string;
    if (mode === 'orrery') {
      ctx = buildOrreryContext(displayTimeRef.current, latestNavRef.current);
    } else if (mode === 'sky') {
      ctx = buildSkyContext(displayTimeRef.current, observerRef.current);
    } else {
      ctx = '[MODE: EXPLORE] The user switched back to the playful artistic view. ' +
        'All navigation tools work normally. Encourage them to explore!';
    }
    try {
      convRef.current.sendContextualUpdate(ctx);
    } catch (err) {
      console.error('[voice] sendContextualUpdate (mode) failed:', err);
    }
  }, [agentId, rawStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      convRef.current?.endSession().catch(() => { /* swallow */ });
      convRef.current = null;
    };
  }, []);

  // Derived UI status: optimistic on user intent, upgrades when SDK confirms.
  let status: VoiceStatus = 'off';
  if (sessionStarted) {
    status = rawStatus === 'connected' ? 'connected' : 'connecting';
  }

  return {
    status,
    isSpeaking,
    micError,
    clearMicError,
    notifyNavChange,
    notifyNavClosed,
    notifyLayerChange,
    notifyModeChange,
    toggle,
    agentId,
  };
}
