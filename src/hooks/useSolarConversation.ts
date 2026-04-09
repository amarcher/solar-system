import { useCallback, useEffect, useRef, useState } from 'react';
import { useConversation, useConversationClientTool, useRawConversation } from '@elevenlabs/react';
import type { Planet, Moon, NavigationState } from '../types/celestialBody';
import type { Mission } from '../types/mission';
import { planets } from '../data/planets';
import { getMoonsByPlanet, getMoonById } from '../data/moons';
import { missions, getMissionById } from '../data/missions';
import { trackVoiceAgentActivated } from '../utils/analytics';
import { categoryLabels } from '../utils/colors';
import { sun } from '../data/sun';

interface ConversationCallbacks {
  currentNav: NavigationState;
  onNavigatePlanet: (planetId: string) => void;
  onNavigateMoon: (planetId: string, moonId: string) => void;
  onNavigateSun: () => void;
  onTrackMission: (missionId: string) => void;
  onGoBack: () => void;
  onPeelSunLayer: (layerIndex: number) => void;
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

// Hard teardown fallback. The ElevenLabs SDK's endSession has been observed
// to silently no-op when called during a race (e.g. the user toggles stop
// right as onConnect fires, before useRawConversation has populated). When
// that happens the <audio> element the SDK injected stays alive and keeps
// playing — and a subsequent start leaks a SECOND session on top of it.
// This function walks the DOM, pauses every audio element, clears its
// source, and removes it. It's aggressive but it's the only reliable way
// to guarantee no stray audio output survives a stop click.
function hardStopStrayAudio(label: string): number {
  const els = Array.from(document.querySelectorAll('audio'));
  if (els.length === 0) return 0;
  console.log(`[voice:mobile] hardStopStrayAudio@${label}: found ${els.length} <audio> element(s), tearing down`);
  for (const el of els) {
    try {
      el.pause();
      // Detach both src forms
      if (el.srcObject) {
        const stream = el.srcObject as MediaStream;
        if (typeof stream.getTracks === 'function') {
          stream.getTracks().forEach(t => t.stop());
        }
        el.srcObject = null;
      }
      el.removeAttribute('src');
      el.load();
      el.remove();
    } catch (err) {
      console.warn('[voice:mobile] hardStopStrayAudio element teardown failed:', err);
    }
  }
  return els.length;
}

// Mobile diagnostic: dump what we can observe about the audio environment
// at a given checkpoint. This is intentionally verbose — we only enable it
// while debugging the mobile greeting issue.
function logAudioEnv(label: string): void {
  try {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints! > 1);
    const isAndroid = /Android/.test(ua);
    const audioEls = Array.from(document.querySelectorAll('audio'));
    const audioSummary = audioEls.map((el, i) => ({
      i,
      paused: el.paused,
      muted: el.muted,
      volume: el.volume,
      readyState: el.readyState,
      srcType: el.src ? 'src' : el.srcObject ? 'srcObject' : 'none',
    }));
    console.log(`[voice:mobile] env@${label}`, {
      isIOS,
      isAndroid,
      visibility: document.visibilityState,
      hidden: document.hidden,
      audioElementCount: audioEls.length,
      audioEls: audioSummary,
    });
  } catch (err) {
    console.warn('[voice:mobile] logAudioEnv failed:', err);
  }
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

export function useSolarConversation({ currentNav, onNavigatePlanet, onNavigateMoon, onNavigateSun, onTrackMission, onGoBack, onPeelSunLayer }: ConversationCallbacks) {
  const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string | undefined;
  const [micError, setMicError] = useState<MicError>(null);
  const pendingNavRef = useRef<NavigationState | null>(null);
  const currentNavRef = useRef<string | null>(null);
  const latestNavRef = useRef<NavigationState>(currentNav);
  latestNavRef.current = currentNav;
  const inputVolumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Optimistic session-active flag driven by user intent (toggle clicks).
  // We used to derive this purely from `conversation.status`, but the SDK's
  // status transitions are async and take 1–2s to propagate — meaning the
  // toolbar button visibly lagged behind every click. Now we flip this
  // state synchronously on click and sync DOWN from the SDK only for
  // external disconnects (see the `useEffect` below that watches status).
  const [sessionStarted, setSessionStarted] = useState(false);
  // Tracks whether the SDK has ever reached 'connected' during the current
  // session. Used to distinguish an initial 'disconnected' (pre-click) from
  // a post-connection drop — only the latter should reset sessionStarted.
  const hasConnectedRef = useRef(false);
  // Timestamp of the most recent toggle→start click. Used to time-stamp
  // every log line relative to the click so we can see on mobile where
  // the greeting pipeline stalls.
  const toggleStartedAtRef = useRef<number | null>(null);
  // Promise that resolves when the current tear-down completes (i.e.
  // when onDisconnect fires for the session we just stopped). The SDK
  // clears its React refs synchronously in endSession() but the actual
  // WebRTC teardown of the underlying Conversation instance is async
  // and NOT awaited — so if the user clicks Talk again immediately,
  // the SDK's guard `if (conversationRef.current)` passes (it's null)
  // and a second session spawns on top of the first one still playing
  // audio mid-teardown. We gate the next start on this promise.
  const teardownPromiseRef = useRef<Promise<void> | null>(null);
  const teardownResolveRef = useRef<(() => void) | null>(null);
  // Counters for chatty SDK events so we don't spam the console.
  const audioChunkCountRef = useRef(0);
  const vadEventCountRef = useRef(0);

  // Helper: timestamp relative to the most recent toggle click
  const tFromClick = () =>
    toggleStartedAtRef.current ? `+${Date.now() - toggleStartedAtRef.current}ms` : 'pre-click';

  const conversation = useConversation({
    onConnect: () => {
      console.log(`[voice:mobile] onConnect (${tFromClick()})`);
      logAudioEnv('onConnect');
      if (pendingNavRef.current) {
        const ctx = buildContextForNav(pendingNavRef.current);
        if (ctx) conversation.sendContextualUpdate(ctx);
        pendingNavRef.current = null;
      }
    },
    onDisconnect: (details: unknown) => {
      console.log(`[voice:mobile] onDisconnect (${tFromClick()}):`, details);
      if (teardownResolveRef.current) {
        console.log('[voice:mobile] teardown promise resolving from onDisconnect');
        teardownResolveRef.current();
        teardownResolveRef.current = null;
        teardownPromiseRef.current = null;
      }
    },
    onError: (error: unknown) => {
      console.error(`[voice:mobile] onError (${tFromClick()}):`, error);
    },
    // ——— FULL INSTRUMENTATION ———
    // These surface SDK-internal events that are normally invisible.
    // `onMessage` gives us agent/user transcript text — tells us whether
    // the user's voice is being transcribed at all.
    onMessage: (msg: unknown) => {
      console.log(`[voice:mobile] onMessage (${tFromClick()}):`, msg);
    },
    // `onStatusChange` is the ground-truth status transition callback.
    // Our useEffect watcher on conversation.status may miss intermediate
    // transitions; this catches every one.
    onStatusChange: (s: unknown) => {
      console.log(`[voice:mobile] onStatusChange (${tFromClick()}):`, s);
    },
    // `onModeChange` fires on listening ↔ speaking transitions. If
    // isSpeaking never flips in our React state but this does, the
    // SDK's React state is the thing that's broken, not the session.
    onModeChange: (m: unknown) => {
      console.log(`[voice:mobile] onModeChange (${tFromClick()}):`, m);
    },
    // `onAudio` fires for every audio chunk the agent sends. If the
    // agent is speaking but we hear nothing, this will still fire —
    // telling us the audio IS arriving, it's just not being played.
    onAudio: (audio: unknown) => {
      // Too chatty to log every chunk — count them instead.
      audioChunkCountRef.current += 1;
      if (audioChunkCountRef.current === 1 || audioChunkCountRef.current % 50 === 0) {
        console.log(`[voice:mobile] onAudio chunk #${audioChunkCountRef.current} (${tFromClick()})`, typeof audio);
      }
    },
    // `onVadScore` fires with voice-activity-detection scores from the
    // user's mic. If this never fires (or stays 0), the mic isn't
    // hearing the user — which would explain "agent ignores me".
    onVadScore: (score: unknown) => {
      vadEventCountRef.current += 1;
      if (vadEventCountRef.current === 1 || vadEventCountRef.current % 20 === 0) {
        console.log(`[voice:mobile] onVadScore #${vadEventCountRef.current} (${tFromClick()}):`, score);
      }
    },
    // `onUnhandledClientToolCall` fires when the agent calls a tool the
    // current session does NOT have registered. If this fires with
    // `navigate_to_planet`, it means the session the user is talking
    // to is not the session our hook registered tools on — definitive
    // proof of a ghost-session bug.
    onUnhandledClientToolCall: (call: unknown) => {
      console.warn(`[voice:mobile] onUnhandledClientToolCall (${tFromClick()}):`, call);
    },
    // `onAgentToolRequest` fires when the agent intends to call a tool.
    // Pairs with the per-tool `useConversationClientTool` logs: if
    // this fires but the tool handler never runs, the call is
    // vanishing somewhere between the SDK and our handlers.
    onAgentToolRequest: (req: unknown) => {
      console.log(`[voice:mobile] onAgentToolRequest (${tFromClick()}):`, req);
    },
    onAgentToolResponse: (resp: unknown) => {
      console.log(`[voice:mobile] onAgentToolResponse (${tFromClick()}):`, resp);
    },
    onInterruption: (i: unknown) => {
      console.log(`[voice:mobile] onInterruption (${tFromClick()}):`, i);
    },
    onGuardrailTriggered: (g: unknown) => {
      console.warn(`[voice:mobile] onGuardrailTriggered (${tFromClick()}):`, g);
    },
    onConversationMetadata: (meta: unknown) => {
      console.log(`[voice:mobile] onConversationMetadata (${tFromClick()}):`, meta);
    },
    onAsrInitiationMetadata: (meta: unknown) => {
      console.log(`[voice:mobile] onAsrInitiationMetadata (${tFromClick()}):`, meta);
    },
    onDebug: (d: unknown) => {
      console.log(`[voice:mobile] onDebug (${tFromClick()}):`, d);
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK's UseConversationOptions doesn't include all CALLBACK_KEYS in its public type
  } as any);

  // Direct handle to the live Conversation instance. We use this in the
  // stop path to call `endSession()` directly on the instance, bypassing
  // the ConversationProvider's wrapped endSession — which was observed
  // to silently no-op in some race conditions (when the provider's
  // conversationRef had already been cleared by an onDisconnect listener
  // but the underlying WebRTC session was still alive).
  const rawConv = useRawConversation();

  // Each client tool is registered via the SDK's ref-backed hook so the
  // live Conversation instance always invokes the LATEST closure — not
  // whatever was captured at session start. This avoids stale closures
  // that could fire against an orphaned React tree. Each handler is also
  // wrapped in try/catch so thrown exceptions become graceful error
  // strings rather than being surfaced to the agent as "something went
  // wrong" via the SDK's `is_error: true` response path.
  useConversationClientTool('navigate_to_planet', (params) => {
    console.log('[voice] navigate_to_planet called:', params);
    try {
      const name = String(params.name ?? '');
      const match = planets.find(p =>
        p.name.toLowerCase() === name.toLowerCase() ||
        p.id === name.toLowerCase()
      );
      if (!match) return `No planet found matching "${name}"`;
      onNavigatePlanet(match.id);
      return `Navigated to ${match.name}`;
    } catch (err) {
      console.error('[voice] navigate_to_planet failed:', err);
      return `Navigation failed: ${(err as Error)?.message ?? 'unknown error'}`;
    }
  });

  useConversationClientTool('navigate_to_moon', (params) => {
    console.log('[voice] navigate_to_moon called:', params);
    try {
      const name = String(params.name ?? '');
      for (const planet of planets) {
        const moons = getMoonsByPlanet(planet.id);
        const moon = moons.find(m =>
          m.name.toLowerCase() === name.toLowerCase() ||
          m.id === name.toLowerCase()
        );
        if (moon) {
          onNavigateMoon(planet.id, moon.id);
          return `Navigated to ${moon.name} (moon of ${planet.name})`;
        }
      }
      return `No moon found matching "${name}"`;
    } catch (err) {
      console.error('[voice] navigate_to_moon failed:', err);
      return `Navigation failed: ${(err as Error)?.message ?? 'unknown error'}`;
    }
  });

  useConversationClientTool('navigate_to_sun', () => {
    console.log('[voice] navigate_to_sun called');
    try {
      onNavigateSun();
      return 'Navigated to the Sun';
    } catch (err) {
      console.error('[voice] navigate_to_sun failed:', err);
      return `Navigation failed: ${(err as Error)?.message ?? 'unknown error'}`;
    }
  });

  useConversationClientTool('track_mission', (params) => {
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
      onTrackMission(match.id);
      return `Opened the live ${match.name} mission tracker. The solar system is paused and the camera is flying out to the spacecraft.`;
    } catch (err) {
      console.error('[voice] track_mission failed:', err);
      return `Mission tracker failed: ${(err as Error)?.message ?? 'unknown error'}`;
    }
  });

  useConversationClientTool('go_back', () => {
    console.log('[voice] go_back called');
    try {
      onGoBack();
      return 'Went back';
    } catch (err) {
      console.error('[voice] go_back failed:', err);
      return `Go back failed: ${(err as Error)?.message ?? 'unknown error'}`;
    }
  });

  useConversationClientTool('peel_sun_layer', (params) => {
    console.log('[voice] peel_sun_layer called:', params);
    try {
      const layerName = String(params.layer ?? '');
      const idx = sun.layers.findIndex(l =>
        l.name.toLowerCase() === layerName.toLowerCase()
      );
      if (idx === -1) {
        return `No layer found matching "${layerName}". Available layers: ${sun.layers.map(l => l.name).join(', ')}`;
      }
      onPeelSunLayer(idx);
      const layer = sun.layers[idx];
      return `Peeled to ${layer.name} layer (${layer.temperature}). ${layer.description.slice(0, 120)}...`;
    } catch (err) {
      console.error('[voice] peel_sun_layer failed:', err);
      return `Sun layer failed: ${(err as Error)?.message ?? 'unknown error'}`;
    }
  });

  // Poll input volume continuously while a session is active. We used to
  // gate this on `conversation.status === 'connected'`, but on iOS that
  // status sometimes never updates even though audio is flowing — and we
  // need visibility into whether the mic is actually capturing.
  useEffect(() => {
    if (!sessionStarted) {
      if (inputVolumeIntervalRef.current !== null) {
        clearInterval(inputVolumeIntervalRef.current);
        inputVolumeIntervalRef.current = null;
      }
      return;
    }

    const startedAt = Date.now();
    let pollCount = 0;
    let lastNonZeroAt = 0;

    inputVolumeIntervalRef.current = setInterval(() => {
      pollCount += 1;
      let volume = -1;
      try {
        volume = conversation.getInputVolume();
      } catch (err) {
        if (pollCount === 1) console.warn('[voice:mobile] getInputVolume threw:', err);
      }
      if (volume > 0) {
        if (lastNonZeroAt === 0) {
          console.log(`[voice:mobile] FIRST mic input volume>0: ${volume.toFixed(3)} (${tFromClick()})`);
        }
        lastNonZeroAt = Date.now();
      }
      // Log every 2s so we can see whether the mic is silent or active.
      if (pollCount % 4 === 0) {
        const sinceVoice = lastNonZeroAt > 0 ? `${Date.now() - lastNonZeroAt}ms ago` : 'never';
        console.log(`[voice:mobile] mic poll #${pollCount}: vol=${volume.toFixed?.(3) ?? volume}, lastVoice=${sinceVoice} (${tFromClick()})`);
      }
      // Stop polling after 30s to avoid unbounded log spam.
      if (Date.now() - startedAt >= 30_000) {
        clearInterval(inputVolumeIntervalRef.current!);
        inputVolumeIntervalRef.current = null;
      }
    }, 500);

    return () => {
      if (inputVolumeIntervalRef.current !== null) {
        clearInterval(inputVolumeIntervalRef.current);
        inputVolumeIntervalRef.current = null;
      }
    };
  }, [sessionStarted]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(async () => {
    if (!agentId) return;

    if (sessionStarted) {
      // Stop path. The SDK's endSession clears its React refs synchronously
      // but does NOT await the underlying WebRTC teardown — so we install a
      // promise that the next start path will wait on. The promise resolves
      // either when onDisconnect fires (happy path) or after a 3s safety
      // timeout (in case onDisconnect never fires, which we've observed on
      // races where rawConv was never populated).
      console.log('[voice:mobile] toggle → stop (rawConv present:', !!rawConv, ', status:', conversation.status, ')');
      setSessionStarted(false);
      hasConnectedRef.current = false;

      // Arm the teardown-wait promise BEFORE calling endSession so a
      // lightning-fast onDisconnect can still resolve it.
      if (!teardownPromiseRef.current) {
        teardownPromiseRef.current = new Promise<void>(resolve => {
          teardownResolveRef.current = resolve;
        });
        // Safety: if onDisconnect never fires, unblock after 3s.
        setTimeout(() => {
          if (teardownResolveRef.current) {
            console.warn('[voice:mobile] teardown safety-timeout (3s) — forcing resolve');
            teardownResolveRef.current();
            teardownResolveRef.current = null;
            teardownPromiseRef.current = null;
          }
        }, 3000);
      }

      if (rawConv) {
        try {
          rawConv.endSession();
        } catch (err) {
          console.error('[voice:mobile] rawConv.endSession failed:', err);
        }
      }
      try {
        conversation.endSession();
      } catch (err) {
        console.error('[voice:mobile] conversation.endSession failed:', err);
      }
      // DOM <audio> teardown as a last-resort safety net. WebRTC audio
      // typically plays via WebAudio and may not live on an <audio>
      // element, so this is not sufficient on its own — but it can't hurt.
      hardStopStrayAudio('stop-immediate');
      return;
    }

    // Start path. Flip UI on synchronously BEFORE the mic prompt so the
    // button shows "connecting" the moment the user clicks. Rolled back
    // if mic permission fails.
    toggleStartedAtRef.current = Date.now();
    audioChunkCountRef.current = 0;
    vadEventCountRef.current = 0;
    console.log('[voice:mobile] toggle → start (t0)');
    logAudioEnv('toggle-start');
    setSessionStarted(true);

    // If a previous session is still tearing down, wait for it to
    // actually disconnect before we start the next one.
    if (teardownPromiseRef.current) {
      console.log('[voice:mobile] awaiting previous session teardown...');
      const waitStart = Date.now();
      await teardownPromiseRef.current;
      console.log(`[voice:mobile] previous teardown complete (+${Date.now() - waitStart}ms)`);
    }

    // NOTE: We previously did a pre-flight `navigator.mediaDevices.getUserMedia`
    // here as a way to surface mic permission errors early. iOS Safari's
    // media stack is fragile to back-to-back acquire/stop/acquire cycles —
    // stopping a track and immediately re-acquiring (which the SDK does
    // internally) can leave the mic in a half-broken state where audio
    // appears to flow but no input data is sent. Removing the pre-flight
    // and letting the SDK acquire the mic exactly once.
    console.log('[voice:mobile] pre-flight mic check SKIPPED (testing)');

    trackVoiceAgentActivated();

    // If the user is already focused on something, queue context for onConnect
    // and override the first message to match what they're looking at
    const navAtStart = latestNavRef.current;
    if (navAtStart.level !== 'system') {
      pendingNavRef.current = navAtStart;
    }

    const firstMessage = buildFirstMessage(navAtStart);
    console.log('[voice:mobile] startSession about to dispatch', {
      navLevel: navAtStart.level,
      hasFirstMessageOverride: !!firstMessage,
      firstMessagePreview: firstMessage?.slice(0, 60),
    });

    try {
      // Note: the ElevenLabs SDK's startSession is fire-and-forget (returns
      // void), so awaiting it is a no-op. The catch only fires on synchronous
      // throws during setup. Session status transitions are observed via
      // `conversation.status` and the sync-down effect below.
      // Transport: forced 'websocket'. We tried removing this to fall back
      // to the SDK default (LiveKit/WebRTC), but ElevenLabs' LiveKit server
      // returns 404 on `/rtc/v1` (the path the bundled livekit-client uses
      // in @elevenlabs/client 1.1.x), making LiveKit completely unusable.
      // Websocket is the only transport we have evidence of ever working
      // on iOS Safari 18.7 (the very first iPhone test passed end-to-end
      // with this exact config: SDK 1.0.x + connectionType websocket).
      await conversation.startSession({
        agentId,
        connectionType: 'websocket',
        ...(firstMessage && {
          overrides: {
            agent: { firstMessage },
          },
        }),
      });
      const tDispatch = Date.now() - (toggleStartedAtRef.current ?? Date.now());
      console.log(`[voice:mobile] startSession dispatched (+${tDispatch}ms)`);
      logAudioEnv('post-startSession');
    } catch (err) {
      console.error('[voice:mobile] startSession failed:', err);
      setSessionStarted(false);
    }
  }, [agentId, sessionStarted, conversation, rawConv]);

  const clearMicError = useCallback(() => setMicError(null), []);

  const notifyNavChange = useCallback((nav: NavigationState) => {
    if (!agentId) return;

    const key = JSON.stringify(nav);
    if (currentNavRef.current === key) return;
    currentNavRef.current = key;

    const ctx = buildContextForNav(nav);
    if (!ctx) return;

    if (conversation.status === 'connected') {
      conversation.sendContextualUpdate(ctx);
    } else {
      pendingNavRef.current = nav;
    }
  }, [agentId, conversation]);

  const notifyLayerChange = useCallback((layerIndex: number) => {
    if (!agentId || conversation.status !== 'connected') return;
    const layer = sun.layers[layerIndex];
    const peeledLayers = sun.layers.slice(0, layerIndex).map(l => l.name);
    const deeperLayers = sun.layers.slice(layerIndex + 1).map(l => l.name);
    conversation.sendContextualUpdate(
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
  }, [agentId, conversation]);

  const notifyNavClosed = useCallback(() => {
    if (!agentId || conversation.status !== 'connected') return;
    currentNavRef.current = null;
    conversation.sendContextualUpdate(
      '[CLOSED] The child returned to the solar system overview. ' +
      'Encourage them to explore a planet, moon, or the Sun!'
    );
  }, [agentId, conversation]);

  // Sync DOWN from the SDK: if an external event disconnects the session
  // (network drop, agent-side timeout, error) we need to reset sessionStarted
  // so the button goes back to "Talk to Stella". We only treat a
  // 'disconnected' status as an external drop AFTER we've seen 'connected'
  // during this session — otherwise the initial page-load 'disconnected'
  // would clear sessionStarted before the user even clicks.
  useEffect(() => {
    if (conversation.status === 'connected') {
      hasConnectedRef.current = true;
    }
    if (
      conversation.status === 'disconnected' &&
      hasConnectedRef.current &&
      sessionStarted
    ) {
      console.log('[voice] external disconnect detected, resetting UI');
      setSessionStarted(false);
      hasConnectedRef.current = false;
    }
  }, [conversation.status, sessionStarted]);

  // Mobile diagnostic: log every isSpeaking transition with timing relative
  // to the toggle click. If we see 'connected' but never isSpeaking=true,
  // the greeting audio is being blocked (iOS autoplay / AudioContext).
  useEffect(() => {
    console.log(`[voice:mobile] isSpeaking → ${conversation.isSpeaking} (${tFromClick()})`);
    if (conversation.isSpeaking) logAudioEnv('isSpeaking-true');
  }, [conversation.isSpeaking]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ground-truth: log every conversation.status transition. This is the
  // React-observable status — if it doesn't reflect reality (e.g. stays
  // "disconnected" after onConnect fires) we know the SDK's React state
  // isn't syncing with the underlying session.
  useEffect(() => {
    console.log(`[voice:mobile] status → ${conversation.status} (${tFromClick()})`);
  }, [conversation.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Watch conversation.mode (listening/speaking/connecting). Another
  // independent signal in case isSpeaking is stale.
  useEffect(() => {
    console.log(`[voice:mobile] mode → ${conversation.mode} (${tFromClick()})`);
  }, [conversation.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Watch useRawConversation() — SDK's "is there a live session?" signal.
  useEffect(() => {
    console.log(`[voice:mobile] rawConv → ${rawConv ? 'present' : 'null'} (${tFromClick()})`);
  }, [rawConv]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mobile diagnostic: log visibility changes during an active session.
  // If the user backgrounds the tab during the handshake, iOS suspends
  // the audio context and the greeting gets eaten.
  useEffect(() => {
    if (!sessionStarted) return;
    const onVis = () => {
      console.log(`[voice:mobile] visibilitychange → ${document.visibilityState} (${tFromClick()})`);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [sessionStarted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect iOS Safari back/forward cache (bfcache). If the user navigates
  // away and comes back via the back button, Safari may restore a live
  // page including any in-flight WebRTC sessions — meaning our React
  // state is fresh but there's a ghost session still running audio.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      console.log(`[voice:mobile] pageshow (persisted=${e.persisted}) audioElementCount=${document.querySelectorAll('audio').length}`);
      if (e.persisted) {
        console.warn('[voice:mobile] page restored from bfcache — possible ghost session');
        hardStopStrayAudio('bfcache-restore');
      }
    };
    const onPageHide = (e: PageTransitionEvent) => {
      console.log(`[voice:mobile] pagehide (persisted=${e.persisted})`);
    };
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  // Log the full UA + build identifier once on mount. The build SHA lets
  // us verify the deployed bundle matches the latest commit on the
  // preview branch — so we know we're not testing a stale Vercel build.
  useEffect(() => {
    console.log(`[voice:mobile] BUILD ${__BUILD_SHA__} @ ${__BUILD_TIME__}`);
    console.log('[voice:mobile] UA:', navigator.userAgent);
    console.log('[voice:mobile] initial audioElementCount:', document.querySelectorAll('audio').length);
  }, []);

  // GLOBAL ERROR/REJECTION CATCHERS. The @elevenlabs/client startSession
  // factory returns a promise that the SDK's React provider holds in
  // lockRef.current.then(...). If that promise rejects on iOS — which we
  // strongly suspect, since useRawConversation() never transitions to
  // present even though onConnect fires — the rejection is silently
  // swallowed (the .then's second arg only sets lockRef=null without
  // logging). These global listeners surface every uncaught error so we
  // can finally see what's blowing up.
  useEffect(() => {
    const onUnhandled = (e: PromiseRejectionEvent) => {
      console.error('[voice:mobile] UNHANDLED REJECTION:', e.reason?.message ?? e.reason, e.reason);
    };
    const onError = (e: ErrorEvent) => {
      console.error('[voice:mobile] WINDOW ERROR:', e.message, e.error);
    };
    window.addEventListener('unhandledrejection', onUnhandled);
    window.addEventListener('error', onError);
    return () => {
      window.removeEventListener('unhandledrejection', onUnhandled);
      window.removeEventListener('error', onError);
    };
  }, []);

  // Cleanup — tear down any active session on unmount
  useEffect(() => {
    return () => {
      conversation.endSession();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Derived UI status: optimistic on user intent, but upgrades to 'connected'
  // when the SDK confirms. During the mic prompt + handshake window, the
  // button shows 'connecting' so the user gets instant click feedback.
  let status: VoiceStatus = 'off';
  if (sessionStarted) {
    status = conversation.status === 'connected' ? 'connected' : 'connecting';
  }

  return {
    status,
    isSpeaking: conversation.isSpeaking,
    micError,
    clearMicError,
    notifyNavChange,
    notifyNavClosed,
    notifyLayerChange,
    toggle,
    agentId,
  };
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
