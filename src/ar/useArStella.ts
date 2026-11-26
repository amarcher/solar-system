import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Conversation } from '@elevenlabs/client';
import { FIRST_MESSAGE, UNSUPPORTED_REPLY, UNSUPPORTED_TOOLS, arSceneContext, bodyName, findBodyId } from './arVoice';

/** What the scene lets the voice guide do. */
export interface ArControls {
  /** Fly to a body, or back to the room view with null. False if the scene is not ready. */
  flyTo: (id: string | null) => boolean;
  focusId: () => string | null;
}

export type StellaState = 'unavailable' | 'off' | 'connecting' | 'on' | 'error';

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string | undefined;

/**
 * Stella, the voice guide, in the headset view. A lean cousin of
 * useSolarConversation: the same agent, but only the tools that make sense
 * when the solar system is floating in a room.
 */
export function useArStella(controls: RefObject<ArControls | null>) {
  const [state, setState] = useState<StellaState>(AGENT_ID ? 'off' : 'unavailable');
  const conversation = useRef<Conversation | null>(null);
  const busy = useRef(false);

  const stop = useCallback(() => {
    const live = conversation.current;
    conversation.current = null;
    live?.endSession().catch(() => { /* already closed */ });
    setState((current) => (current === 'unavailable' ? current : 'off'));
  }, []);

  const start = useCallback(async () => {
    if (!AGENT_ID || busy.current || conversation.current) return;
    busy.current = true;
    setState('connecting');
    try {
      // Ask for the microphone first so a refusal is reported plainly.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());

      const fly = (id: string | null) => {
        if (!controls.current?.flyTo(id)) return 'The solar system is not ready yet. Try again in a moment.';
        return id ? `Flying to ${bodyName(id)} now.` : 'Flying back to the room view.';
      };
      const unsupported = Object.fromEntries(UNSUPPORTED_TOOLS.map((tool) => [tool, () => UNSUPPORTED_REPLY]));
      const live = await Conversation.startSession({
        agentId: AGENT_ID,
        connectionType: 'websocket',
        overrides: { agent: { firstMessage: FIRST_MESSAGE } },
        clientTools: {
          ...unsupported,
          navigate_to_planet: (params: { name?: unknown }) => {
            const id = findBodyId(params?.name);
            return id ? fly(id) : `No planet found matching "${String(params?.name ?? '')}".`;
          },
          navigate_to_sun: () => fly('sun'),
          go_back: () => fly(null),
        },
        onDisconnect: () => {
          conversation.current = null;
          setState((current) => (current === 'on' || current === 'connecting' ? 'off' : current));
        },
        onError: (error: unknown) => console.error('[stella] session error:', error),
      });
      conversation.current = live;
      setState('on');
      live.sendContextualUpdate(arSceneContext(controls.current?.focusId() ?? null));
    } catch (error) {
      console.error('[stella] could not start:', error);
      setState('error');
    } finally {
      busy.current = false;
    }
  }, [controls]);

  const toggle = useCallback(() => {
    if (conversation.current) stop();
    else void start();
  }, [start, stop]);

  /** Tell Stella what the child is looking at now. */
  const describe = useCallback((focusId: string | null) => {
    try { conversation.current?.sendContextualUpdate(arSceneContext(focusId)); }
    catch (error) { console.error('[stella] context update failed:', error); }
  }, []);

  useEffect(() => stop, [stop]);

  return { state, toggle, stop, describe };
}

/** Ask for the microphone on the ordinary page, where the headset can show its permission prompt. */
export async function allowMicrophone(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}
