import { useCallback, useEffect, useRef, useState } from 'react';
// We bypass @elevenlabs/react's ConversationProvider and use the underlying
// @elevenlabs/client SDK directly. The React provider's state layer is
// broken on iOS Safari 18.7: useConversation reports `disconnected` within
// 1ms of `connected`, useRawConversation never populates, and
// useConversationClientTool registrations don't reach the live session —
// so tool calls vanish. Calling Conversation.startSession() directly
// works perfectly on the same device. Diagnosed via a window.debugStartDirect
// bypass that ran end-to-end with greeting, transcripts, and agent responses.
import { Conversation } from '@elevenlabs/client';

// =====================================================================
// AudioContext monkey-patch — iOS Safari workaround
// =====================================================================
// Problem: the SDK's MediaDeviceOutput.create() does:
//   context = new AudioContext(...)
//   /* lots of async setup */
//   await context.resume()
// On iOS Safari 18.7, that resume() resolves successfully but leaves
// the context in 'suspended' state because we're past the user gesture
// window. The MediaStream destination then produces silence, and the
// hidden <audio> element faithfully plays the silence — fooling our
// "force play" workaround into thinking audio is fine.
//
// Fix: track every AudioContext that gets created on the page. After
// our toggle click (which IS a user gesture), force .resume() on every
// tracked context. This catches the SDK's context once it's been
// created and unlocks it from inside our gesture's task chain.
// =====================================================================
const audioContextInstances: AudioContext[] = [];
{
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext; __solarAcPatched?: boolean };
  const Original = w.AudioContext || w.webkitAudioContext;
  if (Original && !w.__solarAcPatched) {
    w.__solarAcPatched = true;
    const Patched = function(this: AudioContext, ...args: ConstructorParameters<typeof AudioContext>) {
      const inst = new Original(...args);
      audioContextInstances.push(inst);
      console.log(`[voice:mobile] AudioContext patch: tracked instance #${audioContextInstances.length - 1}, state=${inst.state}, sampleRate=${inst.sampleRate}`);
      return inst;
    } as unknown as typeof AudioContext;
    Patched.prototype = Original.prototype;
    Object.setPrototypeOf(Patched, Original);
    w.AudioContext = Patched;
    if (w.webkitAudioContext) w.webkitAudioContext = Patched;
    console.log('[voice:mobile] AudioContext patch installed');
  }
}
function resumeAllAudioContexts(label: string) {
  audioContextInstances.forEach((ctx, i) => {
    if (ctx.state === 'closed') return;
    const before = ctx.state;
    ctx.resume().then(() => {
      console.log(`[voice:mobile] resumeAll@${label} #${i}: ${before} → ${ctx.state}`);
    }).catch(err => {
      console.warn(`[voice:mobile] resumeAll@${label} #${i} FAILED:`, err?.name, err?.message);
    });
  });
}

// The createGain monkey-patch was here. Removed after sub-agent
// diagnosis: the audio IS playing (confirmed via
// audioElement.currentTime advancing past 15s during "silent" greeting),
// but iOS is routing it to the earpiece at near-zero volume because
// getUserMedia puts Safari into AVAudioSessionCategoryPlayAndRecord.
// Connecting gain → context.destination created a second audio path
// that caused echo on later messages without fixing the routing of
// the first message. See playback primer below for the real fix.
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

export function useSolarConversation({ currentNav, onNavigatePlanet, onNavigateMoon, onNavigateSun, onTrackMission, onGoBack, onPeelSunLayer }: ConversationCallbacks) {
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
  const inputVolumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toggleStartedAtRef = useRef<number | null>(null);

  // Refs to navigation handlers so client tools always invoke the LATEST
  // closure even though clientTools are passed once at session start.
  // Without this, a tool call halfway through a session would fire
  // against stale React state.
  const handlersRef = useRef({ onNavigatePlanet, onNavigateMoon, onNavigateSun, onTrackMission, onGoBack, onPeelSunLayer });
  handlersRef.current = { onNavigatePlanet, onNavigateMoon, onNavigateSun, onTrackMission, onGoBack, onPeelSunLayer };

  // Playback primer for iOS speaker routing. iOS Safari routes audio
  // to the earpiece (receiver) when getUserMedia is active because it
  // switches the audio session to AVAudioSessionCategoryPlayAndRecord.
  // A file-sourced HTMLAudioElement playing concurrently forces the
  // session into "Playback" mode routing to the loudspeaker, and the
  // SDK's subsequent MediaStream audio element inherits that route.
  // Held in a ref so it survives the whole session — never gc'd.
  const playbackPrimerRef = useRef<HTMLAudioElement | null>(null);

  // Sticky AudioContext for iOS audio unlock. Created lazily on the
  // first toggle click and kept alive for the lifetime of the page.
  // Once iOS sees an AudioContext successfully resumed inside a user
  // gesture, it allows subsequent AudioContexts (the SDK's) to resume
  // without a fresh gesture. This is the canonical iOS unlock pattern
  // used by Howler.js, Tone.js, etc.
  const unlockCtxRef = useRef<AudioContext | null>(null);

  // Abort flag for in-flight startSession. If the user clicks stop
  // while the start path is still awaiting Conversation.startSession,
  // we set this flag. When the promise resolves, the start path tears
  // down the new session immediately — preventing the "double session"
  // bug where rapid stop+start leaks two live sessions.
  const startAbortRef = useRef(false);

  const tFromClick = () =>
    toggleStartedAtRef.current ? `+${Date.now() - toggleStartedAtRef.current}ms` : 'pre-click';

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
      console.log(`[voice:mobile] toggle → stop (${tFromClick()})`);
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
          console.log('[voice:mobile] conv.endSession resolved');
        } catch (err) {
          console.error('[voice:mobile] conv.endSession failed:', err);
        }
      }
      return;
    }

    // Start path
    toggleStartedAtRef.current = Date.now();
    startAbortRef.current = false;
    console.log('[voice:mobile] toggle → start (t0)');
    setSessionStarted(true);
    setRawStatus('connecting');

    // ===== iOS speaker routing primer =====
    // Fire-and-forget playback of a tiny silent WAV file. A file-backed
    // <audio> element playing concurrently forces iOS to select a
    // "Playback" audio session category routing to the loudspeaker
    // rather than the earpiece (the default when getUserMedia is used).
    // CRITICAL: do NOT await the .play() — on iOS if routing is wrong
    // the promise never settles. Fire and forget.
    try {
      if (!playbackPrimerRef.current) {
        const a = new Audio();
        // Minimal silent 8-bit mono WAV (≈44 bytes): header + 0 samples.
        a.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==';
        a.loop = true;
        a.setAttribute('playsinline', '');
        a.setAttribute('webkit-playsinline', '');
        a.volume = 0.01;
        a.muted = false;
        playbackPrimerRef.current = a;
        console.log('[voice:mobile] iOS speaker primer: created');
      }
      // Fire-and-forget. The returned promise may never settle on iOS
      // if routing is contested, but the play() call itself inside the
      // gesture is what tells iOS "use Playback session".
      const p = playbackPrimerRef.current.play();
      if (p && typeof p.then === 'function') {
        p.then(() => console.log('[voice:mobile] iOS speaker primer: playing'))
         .catch(err => console.warn('[voice:mobile] iOS speaker primer play rejected:', err?.name, err?.message));
      }
    } catch (err) {
      console.warn('[voice:mobile] iOS speaker primer threw:', err);
    }

    // ===== iOS AUDIO UNLOCK — synchronous, in the user gesture =====
    // Canonical iOS pattern: create an AudioContext (or reuse existing)
    // and call .resume() SYNCHRONOUSLY in the user gesture. Once iOS
    // sees an AudioContext successfully unlocked here, it allows the
    // SDK's later-created AudioContext to resume too. The context is
    // held in unlockCtxRef forever — never closed, never connected,
    // just a "this page is allowed to play audio" sentinel.
    try {
      if (!unlockCtxRef.current) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx) {
          unlockCtxRef.current = new Ctx();
          console.log('[voice:mobile] iOS unlock: created AudioContext, state=', unlockCtxRef.current.state);
        }
      }
      if (unlockCtxRef.current) {
        const ctx = unlockCtxRef.current;
        // Play a 1-sample silent buffer to prove audio output works.
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        // Resume — sync call, async resolution. The KEY for iOS unlock
        // is that this call originates inside the user gesture.
        ctx.resume().then(() => {
          console.log('[voice:mobile] iOS unlock: resume resolved, state=', ctx.state);
        }).catch(err => {
          console.warn('[voice:mobile] iOS unlock: resume rejected', err);
        });
        console.log('[voice:mobile] iOS unlock: silent buffer started, state=', ctx.state);
      }
    } catch (err) {
      console.warn('[voice:mobile] iOS unlock: threw', err);
    }

    trackVoiceAgentActivated();

    // Pre-flight getUserMedia inside the user gesture to trigger the mic
    // permission prompt early (so the SDK's later acquisition uses cached
    // perm) AND to keep user activation alive for iOS audio.
    console.log('[voice:mobile] pre-flight getUserMedia');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[voice:mobile] pre-flight getUserMedia ok');
      stream.getTracks().forEach(t => t.stop());
    } catch (err) {
      const error = err as DOMException;
      console.error('[voice:mobile] pre-flight getUserMedia failed:', error.name);
      if (error.name === 'NotAllowedError') setMicError('not-allowed');
      else setMicError('device');
      setSessionStarted(false);
      setRawStatus('disconnected');
      return;
    }

    const navAtStart = latestNavRef.current;
    const firstMessage = buildFirstMessage(navAtStart);
    // Restored after testing showed the override is NOT the cause — the
    // first agent message is silent on iOS even at system level (no
    // override). The actual cause is iOS audio output not being unlocked
    // by the time the SDK plays its first audio chunk.
    if (navAtStart.level !== 'system') {
      pendingNavRef.current = navAtStart;
    }

    console.log('[voice:mobile] startSession about to dispatch', {
      navLevel: navAtStart.level,
      hasFirstMessageOverride: !!firstMessage,
    });

    try {
      const conv = await Conversation.startSession({
        agentId,
        connectionType: 'websocket',
        clientTools: buildClientTools(),
        ...(firstMessage && {
          overrides: { agent: { firstMessage } },
        }),
        onConnect: () => {
          console.log(`[voice:mobile] onConnect (${tFromClick()})`);
          setRawStatus('connected');
          // NOTE: We can't send queued nav context here — onConnect fires
          // INSIDE the awaited Conversation.startSession() call, so
          // convRef.current hasn't been assigned yet. The send happens
          // immediately after the await resolves below.
        },
        onDisconnect: (details: unknown) => {
          console.log(`[voice:mobile] onDisconnect (${tFromClick()}):`, details);
          setRawStatus('disconnected');
          setIsSpeaking(false);
          setSessionStarted(false);
          convRef.current = null;
        },
        onError: (err: unknown) => {
          console.error(`[voice:mobile] onError (${tFromClick()}):`, err);
        },
        onMessage: (msg: unknown) => {
          console.log(`[voice:mobile] onMessage (${tFromClick()}):`, msg);
        },
        onStatusChange: (s: { status: string }) => {
          console.log(`[voice:mobile] onStatusChange (${tFromClick()}):`, s);
          if (s.status === 'connected' || s.status === 'connecting' || s.status === 'disconnected') {
            setRawStatus(s.status);
          }
        },
        onModeChange: (m: { mode: string }) => {
          console.log(`[voice:mobile] onModeChange (${tFromClick()}):`, m);
          setIsSpeaking(m.mode === 'speaking');
        },
        onDebug: (d: unknown) => {
          console.log(`[voice:mobile] onDebug (${tFromClick()}):`, d);
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- callbacks not all in public type
      } as any);
      // If the user clicked stop while we were awaiting the startSession
      // promise, abort: tear down this brand-new session immediately
      // instead of installing it. This prevents the orphaned-session
      // bug where a stop+start race leaves two live sessions.
      if (startAbortRef.current) {
        console.log('[voice:mobile] startSession resolved but ABORTED — tearing down');
        startAbortRef.current = false;
        try {
          await conv.endSession();
        } catch (err) {
          console.error('[voice:mobile] aborted endSession failed:', err);
        }
        return;
      }
      convRef.current = conv;
      console.log(`[voice:mobile] startSession RESOLVED (${tFromClick()})`);

      // Force-resume any AudioContexts (defensive — they're usually
      // already running at this point per the latest test).
      resumeAllAudioContexts('after-startSession');

      // Force playsInline on the SDK's hidden <audio> element so iOS
      // doesn't treat it as a "media player" that would route to the
      // receiver. Combined with the playback primer running concurrently
      // in the gesture, this should force loudspeaker routing.
      try {
        const audioEls = Array.from(document.querySelectorAll('audio'));
        for (const el of audioEls) {
          el.setAttribute('playsinline', '');
          el.setAttribute('webkit-playsinline', '');
          el.muted = false;
          el.volume = 1;
        }
        console.log(`[voice:mobile] applied playsinline/volume to ${audioEls.length} <audio> element(s)`);
      } catch (err) {
        console.warn('[voice:mobile] playsinline apply failed:', err);
      }

      // iOS audio output workaround: the SDK creates a hidden <audio>
      // element with autoplay=true and srcObject=MediaStream. iOS Safari
      // BLOCKS autoplay of <audio> with MediaStream sources unless they
      // are muted OR .play() is called inside a user gesture. Since we
      // can't modify the SDK, find the element after creation and
      // explicitly call .play() on it. The user gesture from the original
      // toggle click may still be active here (within ~5s of the click).
      try {
        const audioEls = Array.from(document.querySelectorAll('audio'));
        console.log(`[voice:mobile] iOS audio kick: found ${audioEls.length} <audio> element(s)`);
        for (let i = 0; i < audioEls.length; i++) {
          const el = audioEls[i];
          if (el.paused) {
            const p = el.play();
            if (p && typeof p.then === 'function') {
              p.then(() => {
                console.log(`[voice:mobile] iOS audio kick #${i}: PLAYED ok`);
              }).catch(err => {
                console.warn(`[voice:mobile] iOS audio kick #${i}: FAILED`, err?.name, err?.message);
              });
            }
          } else {
            console.log(`[voice:mobile] iOS audio kick #${i}: already playing`);
          }
        }
      } catch (err) {
        console.warn('[voice:mobile] iOS audio kick threw:', err);
      }

      // Now that convRef is populated, flush any queued nav context.
      // This is necessary because onConnect fires INSIDE the await
      // above, before convRef.current = conv runs.
      if (pendingNavRef.current) {
        const queuedNav = pendingNavRef.current;
        pendingNavRef.current = null;
        const ctx = buildContextForNav(queuedNav);
        if (ctx) {
          console.log('[voice:mobile] flushing queued nav context after RESOLVED', { level: queuedNav.level, ctxLength: ctx.length });
          try {
            conv.sendContextualUpdate(ctx);
          } catch (err) {
            console.error('[voice:mobile] sendContextualUpdate threw:', err);
          }
        }
      }
    } catch (err) {
      console.error('[voice:mobile] startSession REJECTED:', err);
      if (err instanceof Error) {
        console.error('[voice:mobile] error.name:', err.name, 'message:', err.message);
      }
      setSessionStarted(false);
      setRawStatus('disconnected');
      setMicError('device');
    }
  }, [agentId, sessionStarted, buildClientTools]);

  const clearMicError = useCallback(() => setMicError(null), []);

  const notifyNavChange = useCallback((nav: NavigationState) => {
    if (!agentId) {
      console.log('[voice:mobile] notifyNavChange skipped (no agentId)');
      return;
    }
    const key = JSON.stringify(nav);
    if (currentNavRef.current === key) {
      console.log('[voice:mobile] notifyNavChange skipped (dedup):', nav.level);
      return;
    }
    currentNavRef.current = key;
    const ctx = buildContextForNav(nav);
    if (!ctx) {
      console.log('[voice:mobile] notifyNavChange no context for', nav.level);
      return;
    }
    if (convRef.current && rawStatus === 'connected') {
      console.log('[voice:mobile] notifyNavChange → sendContextualUpdate', { level: nav.level, ctxLength: ctx.length });
      try {
        convRef.current.sendContextualUpdate(ctx);
      } catch (err) {
        console.error('[voice:mobile] sendContextualUpdate threw:', err);
      }
    } else {
      console.log('[voice:mobile] notifyNavChange queued (not connected yet):', { hasConv: !!convRef.current, rawStatus });
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

  // Diagnostic: continuous mic input volume polling. Logs every 2s.
  useEffect(() => {
    if (!sessionStarted) {
      if (inputVolumeIntervalRef.current) {
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
        volume = convRef.current?.getInputVolume() ?? -1;
      } catch (err) {
        if (pollCount === 1) console.warn('[voice:mobile] getInputVolume threw:', err);
      }
      if (volume > 0 && lastNonZeroAt === 0) {
        console.log(`[voice:mobile] FIRST mic input volume>0: ${volume.toFixed(3)} (${tFromClick()})`);
        lastNonZeroAt = Date.now();
      } else if (volume > 0) {
        lastNonZeroAt = Date.now();
      }
      if (pollCount % 4 === 0) {
        const sinceVoice = lastNonZeroAt > 0 ? `${Date.now() - lastNonZeroAt}ms ago` : 'never';
        console.log(`[voice:mobile] mic poll #${pollCount}: vol=${volume.toFixed?.(3) ?? volume}, lastVoice=${sinceVoice} (${tFromClick()})`);
      }
      if (Date.now() - startedAt >= 30_000) {
        clearInterval(inputVolumeIntervalRef.current!);
        inputVolumeIntervalRef.current = null;
      }
    }, 500);
    return () => {
      if (inputVolumeIntervalRef.current) {
        clearInterval(inputVolumeIntervalRef.current);
        inputVolumeIntervalRef.current = null;
      }
    };
  }, [sessionStarted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Diagnostic: log status & isSpeaking transitions
  useEffect(() => {
    console.log(`[voice:mobile] status → ${rawStatus} (${tFromClick()})`);
  }, [rawStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    console.log(`[voice:mobile] isSpeaking → ${isSpeaking} (${tFromClick()})`);
  }, [isSpeaking]); // eslint-disable-line react-hooks/exhaustive-deps

  // Diagnostic: page lifecycle (bfcache)
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      console.log(`[voice:mobile] pageshow (persisted=${e.persisted})`);
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

  // Diagnostic: build identifier + UA on mount
  useEffect(() => {
    console.log(`[voice:mobile] BUILD ${__BUILD_SHA__} @ ${__BUILD_TIME__}`);
    console.log('[voice:mobile] UA:', navigator.userAgent);
  }, []);

  // Diagnostic: global error/rejection catchers
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
    toggle,
    agentId,
  };
}
