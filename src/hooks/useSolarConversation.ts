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
import { tidesVoiceContext, type TidesState } from '../lessons/tides/model';
import { sun } from '../data/sun';
import { buildSceneContext, createSceneTools, parseTimeRate, type SceneToolHandlers, type SceneVoiceState } from '../voice/sceneTools';

interface ConversationCallbacks extends SceneToolHandlers {
  scene: Omit<SceneVoiceState, 'nav' | 'mode' | 'tides'>;
  currentNav: NavigationState;
  currentTides?: TidesState | null;
  currentMode: ViewMode;
  currentObserver: ObserverLocation;
  displayTime: Date;
  currentRate: number;
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

function buildPlanetContext(planet: Planet, detailsVisible: boolean): string {
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
    detailsVisible ? `- Planet name, category, and key properties displayed` : '- Compact/cinema view hides property cards and moon lists; use these facts as reference, not visible text',
    `- ${planet.atmosphereComposition ? `Atmosphere: ${planet.atmosphereComposition}` : 'No significant atmosphere'}`,
  ];

  if (detailsVisible && moons.length > 0) {
    parts.push(`- A list of ${moons.length} notable moons they can click on:`);
    moons.forEach(m => parts.push(`  • ${m.name}: ${m.notableFeature}`));
  }

  parts.push('', `[ABOUT]`, planet.summary);
  parts.push('', detailsVisible ? `[FUN FACTS on screen]` : '[REFERENCE FACTS — not displayed]');
  planet.funFacts.forEach((fact, i) => parts.push(`${i + 1}. ${fact}`));

  if (planet.discoveredBy) {
    parts.push('', `Discovered by ${planet.discoveredBy} (${planet.yearDiscovered}).`);
  }

  parts.push('', `Get excited about ${planet.name}! Reference what the child sees on screen.`);
  return parts.join('\n');
}

function buildMoonContext(moon: Moon, planet: Planet, detailsVisible: boolean): string {
  return [
    `[MOON CLICK] The child is now looking at ${moon.name}, a moon of ${planet.name}.`,
    `Notable feature: ${moon.notableFeature}`,
    `Diameter: ${moon.diameter.toLocaleString()} km. Gravity: ${moon.gravity} m/s².`,
    `Temperature: ${moon.meanTemperature}°C. Orbital period: ${moon.orbitalPeriod} days.`,
    '',
    moon.summary,
    '',
    detailsVisible ? `[FUN FACTS on screen]` : '[REFERENCE FACTS — compact/cinema hides the detail panel]',
    ...moon.funFacts.map((f, i) => `${i + 1}. ${f}`),
    '',
    moon.discoveredBy ? `Discovered by ${moon.discoveredBy} (${moon.yearDiscovered}).` : '',
    '',
    `Tell the child about this fascinating moon!`,
  ].filter(Boolean).join('\n');
}

function buildMissionContext(mission: Mission): string {
  return [
    `[MISSION REPLAY] The app is showing ${mission.name} (${mission.agency}).`,
    'A procedural trajectory illustration shows Earth, the Moon, and a spacecraft path. The user can pan and zoom. This is not live spacecraft telemetry or a verified current mission status.',
    'Do not claim the spacecraft is flying right now, give a current flight phase from the wall clock, or describe this illustrative curve as the exact flown path.',
  ].join('\n');
}

function buildSunContext(detailsVisible: boolean): string {
  return [
    `[SUN CLICK] The child just clicked on the Sun!`,
    `The Sun is a ${sun.spectralType} main-sequence star.`,
    `Diameter: ${sun.diameter.toLocaleString()} km. Surface temperature: ${sun.surfaceTemperature}°C. Core: ${sun.coreTemperature}.`,
    `Age: ${sun.age}. Luminosity: ${sun.luminosity}.`,
    '',
    `[WHAT THE CHILD SEES]`,
    `- ${detailsVisible ? "An interactive visualization where they can peel back the Sun’s layers" : "The Sun in the scene; compact/cinema view hides layer controls"}`,
    `- Layers from outside in: ${sun.layers.map(l => l.name).join(' → ')}`,
    detailsVisible ? `- Each layer shows its temperature and description when clicked` : `- Explain layers verbally; no peeling control is visible`,
    '',
    sun.summary,
    '',
    `[FUN FACTS on screen]`,
    ...sun.funFacts.map((f, i) => `${i + 1}. ${f}`),
    '',
    detailsVisible ? `Encourage the child to explore the layers.` : `Explain the Sun without claiming any layer was peeled.`,
  ].join('\n');
}

function buildOrreryContext(displayTime: Date, nav: NavigationState): string {
  const dateStr = displayTime.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const parts = [
    `[MODE: ORRERY] The user is viewing the real-time orrery — planet directions come from ephemerides for ${dateStr}, with compressed display distances.`,
    `Orbital data comes from astronomy-engine; body sizes, moon spacing, and focused-system spacing are illustrative, not one physical scale.`,
    `The user can scrub time forward/backward and change playback speed.`,
  ];
  if (nav.level === 'planet') {
    const planet = planets.find(p => p.id === nav.planetId);
    if (planet) {
      const moons = getMoonsByPlanet(planet.id);
      parts.push(``, `They're focused on ${planet.name} and can see its ${moons.length} curated moons; the app uses a mix of ephemerides and illustrative moon orbits.`);
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
    `Sky shows sky markers, not 3D body close-ups. User-requested time, speed, constellation, quality, and mode changes are supported; use their tools and honor the returned limitations.`,
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
      return `Hi there! I'm Stella, your space guide! Whoa — you found the secret mission tracker! That's the ${mission.name} trajectory illustration. Want to explore the path around Earth and the Moon?`;
    }
    default:
      return undefined;
  }
}

function buildContextForNav(nav: NavigationState, detailsVisible: boolean): string | null {
  switch (nav.level) {
    case 'sun':
      return buildSunContext(detailsVisible);
    case 'planet': {
      const planet = planets.find(p => p.id === nav.planetId);
      return planet ? buildPlanetContext(planet, detailsVisible) : null;
    }
    case 'moon': {
      const planet = planets.find(p => p.id === nav.planetId);
      const moon = getMoonById(nav.moonId);
      return planet && moon ? buildMoonContext(moon, planet, detailsVisible) : null;
    }
    case 'mission': {
      const mission = getMissionById(nav.missionId);
      return mission ? buildMissionContext(mission) : null;
    }
    default:
      return null;
  }
}

export function useSolarConversation({ scene, onSetTides, onSetConstellations, onSetQuality, currentNav, currentTides = null, currentMode, currentObserver, displayTime, currentRate, onNavigatePlanet, onNavigateMoon, onNavigateSun, onTrackMission, onGoBack, onPeelSunLayer, onSwitchMode, onSetDate, onSetRate }: ConversationCallbacks) {
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
  const tidesRef = useRef(currentTides);
  const sceneRef = useRef<SceneVoiceState>({ ...scene, nav: currentNav, mode: currentMode, tides: !!currentTides });
  const sceneHandlersRef = useRef({ onSetTides, onSetConstellations, onSetQuality });
  useEffect(() => {
    sceneRef.current = { ...scene, nav: currentNav, mode: currentMode, tides: !!currentTides };
    sceneHandlersRef.current = { onSetTides, onSetConstellations, onSetQuality };
  }, [scene, currentNav, currentMode, currentTides, onSetTides, onSetConstellations, onSetQuality]);
  const hadTidesContext = useRef(false);

  // Refs to navigation handlers so client tools always invoke the LATEST
  // closure even though clientTools are passed once at session start.
  // Without this, a tool call halfway through a session would fire
  // against stale React state.
  const handlersRef = useRef({ onNavigatePlanet, onNavigateMoon, onNavigateSun, onTrackMission, onGoBack, onPeelSunLayer, onSwitchMode, onSetDate, onSetRate });

  // Keep mode/observer/time refs for contextual updates
  const modeRef = useRef(currentMode);
  const observerRef = useRef(currentObserver);
  const displayTimeRef = useRef(displayTime);
  const rateRef = useRef(currentRate);
  useEffect(() => { rateRef.current = currentRate; }, [currentRate]);
  const sceneContext = useCallback(() => [
    buildSceneContext(sceneRef.current),
    modeRef.current === 'sky' ? buildSkyContext(displayTimeRef.current, observerRef.current)
      : modeRef.current === 'orrery' ? buildOrreryContext(displayTimeRef.current, latestNavRef.current) : '',
    modeRef.current !== 'artistic' ? `Simulation snapshot: ${displayTimeRef.current.toISOString()}; rate ${rateRef.current} simulated seconds per real second. This snapshot advances while the rate is nonzero.` : '',
  ].filter(Boolean).join('\n'), []);

  useEffect(() => {
    latestNavRef.current = currentNav;
    tidesRef.current = currentTides;
    handlersRef.current = {
      onNavigatePlanet,
      onNavigateMoon,
      onNavigateSun,
      onTrackMission,
      onGoBack,
      onPeelSunLayer,
      onSwitchMode,
      onSetDate,
      onSetRate,
    };
    modeRef.current = currentMode;
    observerRef.current = currentObserver;
    displayTimeRef.current = displayTime;
  }, [
    currentNav,
    currentTides,
    currentMode,
    currentObserver,
    displayTime,
    onNavigatePlanet,
    onNavigateMoon,
    onNavigateSun,
    onTrackMission,
    onGoBack,
    onPeelSunLayer,
    onSwitchMode,
    onSetDate,
    onSetRate,
  ]);

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
    ...createSceneTools(() => sceneRef.current, () => sceneHandlersRef.current),
    navigate_to_planet: (params: { name?: unknown }) => {
      console.log('[voice] navigate_to_planet called:', params);
      try {
        if (modeRef.current === 'sky') return 'Close-up navigation is unavailable in Sky. Switch to Explore or Orrery first.';
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
        if (modeRef.current === 'sky') return 'Close-up navigation is unavailable in Sky. Switch to Explore or Orrery first.';
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
        if (modeRef.current === 'sky') return 'Sun close-up navigation is unavailable in Sky. Switch to Explore or Orrery first.';
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
        );
        if (!match) return 'That mission is not available. The app supports the Artemis II trajectory replay.';
        if (modeRef.current === 'sky') return 'Mission replay is unavailable in Sky. Switch to Explore or Orrery first.';
        handlersRef.current.onTrackMission(match.id);
        return `Opened the ${match.name} trajectory illustration. It is a replay, not live spacecraft telemetry.`;
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
        if (modeRef.current === 'artistic') return 'Explore uses illustrative motion. Switch to Orrery or Sky before setting simulation time.';
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
        if (modeRef.current === 'artistic') return 'Explore uses illustrative motion. Switch to Orrery or Sky before changing simulation speed.';
        const rate = parseTimeRate(params.speed);
        if (rate === null) return 'Choose a finite time speed up to one month per second, such as paused, real-time, 1 hour, or 1 day.';
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
        if (!sceneRef.current.detailsVisible) return 'Sun layer controls are hidden in compact or cinema view. I can explain the layers, but cannot show peeling here.';
        if (modeRef.current === 'sky') return 'Sun layers are unavailable in Sky. Switch to Explore or Orrery first.';
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
    const firstMessage = tidesRef.current ? 'Hi! We’re exploring why Earth has tides. Let’s look at how gravity pulls differently across our planet.' : navAtStart.level === 'sun' && !sceneRef.current.detailsVisible ? 'Hi! I’m Stella. You’re exploring the Sun. What would you like to know about our star?' : buildFirstMessage(navAtStart);
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
      try { conv.sendContextualUpdate(sceneContext()); }
      catch (error) { console.error('[voice] scene context failed:', error); }

      // Now that convRef is populated, flush any queued nav context.
      // This is necessary because onConnect fires INSIDE the await
      // above, before convRef.current = conv runs.
      if (tidesRef.current) {
        pendingNavRef.current = null;
        try {
          conv.sendContextualUpdate(tidesVoiceContext(tidesRef.current));
          hadTidesContext.current = true;
        } catch (err) {
          console.error('[voice] sendContextualUpdate failed:', err);
        }
      } else if (pendingNavRef.current) {
        const queuedNav = pendingNavRef.current;
        pendingNavRef.current = null;
        const ctx = buildContextForNav(queuedNav, sceneRef.current.detailsVisible);
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
  }, [agentId, sessionStarted, buildClientTools, sceneContext]);

  useEffect(() => {
    if (!convRef.current || rawStatus !== 'connected') return;
    if (!currentTides && !hadTidesContext.current) return;
    hadTidesContext.current = !!currentTides;
    const context = currentTides ? tidesVoiceContext(currentTides) : buildContextForNav(currentNav, sceneRef.current.detailsVisible);
    // Allow the Earth layer and navigation to settle before describing them.
    const timer = window.setTimeout(() => {
      if (!context || !convRef.current) return;
      try { convRef.current.sendContextualUpdate(context); }
      catch (error) { console.error('[voice] lesson context update failed:', error); }
    }, currentTides ? 200 : 0);
    return () => window.clearTimeout(timer);
  }, [currentTides, currentNav, rawStatus]);

  useEffect(() => {
    if (!convRef.current || rawStatus !== 'connected') return;
    try { convRef.current.sendContextualUpdate(sceneContext()); }
    catch (error) { console.error('[voice] scene context failed:', error); }
  }, [currentNav, currentMode, currentTides, scene.constellations, scene.quality, scene.missionActive, scene.detailsVisible, currentRate, currentObserver, rawStatus, sceneContext]);

  useEffect(() => {
    if (rawStatus !== 'connected' || currentMode === 'artistic') return;
    const timer = window.setInterval(() => {
      try { convRef.current?.sendContextualUpdate(sceneContext()); }
      catch (error) { console.error('[voice] time context failed:', error); }
    }, 10000);
    return () => window.clearInterval(timer);
  }, [rawStatus, currentMode, sceneContext]);

  const clearMicError = useCallback(() => setMicError(null), []);

  const notifyNavChange = useCallback((nav: NavigationState) => {
    if (!agentId) return;
    const key = JSON.stringify(nav);
    if (currentNavRef.current === key) return;
    currentNavRef.current = key;
    const ctx = buildContextForNav(nav, sceneRef.current.detailsVisible);
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
