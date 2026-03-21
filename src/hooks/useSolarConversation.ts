import { useCallback, useEffect, useRef, useState } from 'react';
import { useConversation } from '@elevenlabs/react';
import type { Planet, Moon, NavigationState } from '../types/celestialBody';
import { planets } from '../data/planets';
import { getMoonsByPlanet, getMoonById } from '../data/moons';
import { categoryLabels } from '../utils/colors';
import { sun } from '../data/sun';

interface ConversationCallbacks {
  onNavigatePlanet: (planetId: string) => void;
  onNavigateMoon: (planetId: string, moonId: string) => void;
  onNavigateSun: () => void;
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

export function useSolarConversation({ onNavigatePlanet, onNavigateMoon, onNavigateSun, onGoBack, onPeelSunLayer }: ConversationCallbacks) {
  const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string | undefined;
  const [sessionStarted, setSessionStarted] = useState(false);
  const [micError, setMicError] = useState<MicError>(null);
  const pendingNavRef = useRef<NavigationState | null>(null);
  const currentNavRef = useRef<string | null>(null);
  const inputVolumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const conversation = useConversation({
    clientTools: {
      navigate_to_planet: (params: { name: string }) => {
        const match = planets.find(p =>
          p.name.toLowerCase() === params.name.toLowerCase() ||
          p.id === params.name.toLowerCase()
        );
        if (!match) return `No planet found matching "${params.name}"`;
        onNavigatePlanet(match.id);
        return `Navigated to ${match.name}`;
      },
      navigate_to_moon: (params: { name: string }) => {
        // Search all moons
        for (const planet of planets) {
          const moons = getMoonsByPlanet(planet.id);
          const moon = moons.find(m =>
            m.name.toLowerCase() === params.name.toLowerCase() ||
            m.id === params.name.toLowerCase()
          );
          if (moon) {
            onNavigateMoon(planet.id, moon.id);
            return `Navigated to ${moon.name} (moon of ${planet.name})`;
          }
        }
        return `No moon found matching "${params.name}"`;
      },
      navigate_to_sun: () => {
        onNavigateSun();
        return 'Navigated to the Sun';
      },
      go_back: () => {
        onGoBack();
        return 'Went back';
      },
      peel_sun_layer: (params: { layer_name: string }) => {
        const idx = sun.layers.findIndex(l =>
          l.name.toLowerCase() === params.layer_name.toLowerCase()
        );
        if (idx === -1) {
          return `No layer found matching "${params.layer_name}". Available layers: ${sun.layers.map(l => l.name).join(', ')}`;
        }
        onPeelSunLayer(idx);
        const layer = sun.layers[idx];
        return `Peeled to ${layer.name} layer (${layer.temperature}). ${layer.description.slice(0, 120)}...`;
      },
    },
    onConnect: () => {
      if (pendingNavRef.current) {
        const ctx = buildContextForNav(pendingNavRef.current);
        if (ctx) conversation.sendContextualUpdate(ctx);
        pendingNavRef.current = null;
      }
    },
    onError: (error: unknown) => {
      console.error('[VoiceAgent] session error:', error);
    },
  });

  // Poll input volume after connecting
  useEffect(() => {
    if (conversation.status !== 'connected') {
      if (inputVolumeIntervalRef.current !== null) {
        clearInterval(inputVolumeIntervalRef.current);
        inputVolumeIntervalRef.current = null;
      }
      return;
    }

    const startedAt = Date.now();
    const POLL_DURATION_MS = 10_000;
    const POLL_INTERVAL_MS = 500;

    inputVolumeIntervalRef.current = setInterval(() => {
      const volume = conversation.getInputVolume();
      if (volume > 0) {
        clearInterval(inputVolumeIntervalRef.current!);
        inputVolumeIntervalRef.current = null;
        return;
      }
      if (Date.now() - startedAt >= POLL_DURATION_MS) {
        clearInterval(inputVolumeIntervalRef.current!);
        inputVolumeIntervalRef.current = null;
        setMicError('no-input');
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (inputVolumeIntervalRef.current !== null) {
        clearInterval(inputVolumeIntervalRef.current);
        inputVolumeIntervalRef.current = null;
      }
    };
  }, [conversation.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = useCallback(async () => {
    if (!agentId) return;

    if (sessionStarted) {
      await conversation.endSession().catch(() => {});
      setSessionStarted(false);
      return;
    }

    try {
      const micPromise = navigator.mediaDevices.getUserMedia({ audio: true });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new DOMException('getUserMedia timed out', 'TimeoutError')), 5_000)
      );
      const tempStream = await Promise.race([micPromise, timeoutPromise]);
      tempStream.getTracks().forEach(t => t.stop());
    } catch (err) {
      const error = err as DOMException;
      if (error.name === 'TimeoutError') setMicError('timeout');
      else if (error.name === 'NotAllowedError') setMicError('not-allowed');
      else setMicError('device');
      return;
    }

    setSessionStarted(true);

    try {
      await conversation.startSession({
        agentId,
        connectionType: 'websocket',
      });
    } catch (err) {
      console.error('[VoiceAgent] startSession failed:', err);
      setSessionStarted(false);
    }
  }, [agentId, sessionStarted, conversation]);

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

  // Cleanup
  useEffect(() => {
    return () => {
      if (sessionStarted) {
        conversation.endSession().catch(() => {});
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  let status: VoiceStatus = 'off';
  if (sessionStarted) {
    if (conversation.status === 'connected') status = 'connected';
    else if (conversation.status === 'connecting') status = 'connecting';
    else if (conversation.status === 'disconnected') status = 'error';
    else status = 'connecting';
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
    default:
      return null;
  }
}
