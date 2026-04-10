# [@elevenlabs/react] ConversationProvider state broken on iOS Safari 18+ — tools don't fire, status stuck at disconnected

## Summary

`ConversationProvider` from `@elevenlabs/react` is broken on iOS Safari 18.7. When using `useConversation()` + `useConversationClientTool()` inside a `ConversationProvider`, the session connects at the WebSocket level (the `onConnect` callback fires, audio streams in both directions), but React state never updates:

- `status` reports `disconnected` within 1ms of briefly showing `connected`
- `isSpeaking` never updates
- Client tools registered via `useConversationClientTool()` never fire — the SDK logs `"Client tool not defined"` errors for every tool call

The same agent, same device, same browser works perfectly when calling `Conversation.startSession()` from `@elevenlabs/client` directly, bypassing the React provider entirely.

## Environment

| Component | Version |
|-----------|---------|
| Device | iPhone (iOS 18.7) |
| Browser | Safari 26.4 |
| `@elevenlabs/react` | 1.0.3 |
| `@elevenlabs/client` | 1.1.2 |
| React | 19.x |
| Vite | 8.x |

Desktop browsers (Chrome, Firefox, Safari on macOS) work correctly with `ConversationProvider`.

## Expected behavior

1. Mount `<ConversationProvider>` at root
2. Inside a child component, call `useConversation()` to get `{ status, isSpeaking, startSession, endSession }`
3. Register client tools via `useConversationClientTool('tool_name', handler)`
4. Call `startSession({ agentId })` from a button click handler
5. `status` transitions: `disconnected` -> `connecting` -> `connected`
6. `isSpeaking` toggles as the agent speaks
7. Client tools fire when the agent invokes them

## Actual behavior (iOS Safari 18.7)

1. `startSession()` is called
2. `status` briefly flashes `connected`, then immediately reverts to `disconnected` (~1ms)
3. The WebSocket connection IS alive — the agent speaks, audio plays (after the first message), transcripts appear in `onMessage`
4. `isSpeaking` never changes from `false`
5. When the agent tries to call a client tool, the SDK logs: `"Client tool not defined: navigate_to_planet"` — the tool registrations from `useConversationClientTool()` are not reaching the live session
6. The session is effectively headless: audio works, but all React state and tool dispatch is broken

## Steps to reproduce

Minimal reproduction:

```tsx
// main.tsx
import { ConversationProvider } from '@elevenlabs/react';

createRoot(document.getElementById('root')!).render(
  <ConversationProvider>
    <App />
  </ConversationProvider>
);

// App.tsx
import { useConversation, useConversationClientTool } from '@elevenlabs/react';

function App() {
  const { status, isSpeaking, startSession, endSession } = useConversation();

  useConversationClientTool('navigate_to_planet', (params) => {
    console.log('Tool called:', params); // Never fires on iOS
    return 'OK';
  });

  return (
    <button onClick={() => {
      if (status === 'connected') endSession();
      else startSession({ agentId: 'your-agent-id' });
    }}>
      {status} {isSpeaking ? '(speaking)' : ''}
    </button>
  );
}
```

1. Deploy to a public URL (localhost won't have mic permissions on iOS)
2. Open on iPhone running iOS 18.7 in Safari
3. Tap the button to start a session
4. Observe: button shows "disconnected" even though the agent is audibly speaking
5. Ask the agent to use a tool — observe `"Client tool not defined"` in the console

## Root cause analysis

The provider's internal state management appears to break on iOS Safari. Based on debugging:

1. `ConversationProvider` wraps `Conversation.startSession()` in a `.then(success, failure)` chain that manages React context state
2. On iOS Safari, either:
   - The promise rejects silently (the failure handler runs but doesn't surface the error), or
   - The provider's internal state machine enters an inconsistent state where the WebSocket session is alive but the React context layer believes it's disconnected
3. Because the context reports `disconnected`, the tool dispatch layer (which is gated on connection status) never forwards tool calls to the registered handlers
4. The `useConversationClientTool()` registrations are stored in React context state that is stale/disconnected from the live `Conversation` instance

The iOS-specific trigger is likely related to how Safari 18 handles async promise resolution timing, `getUserMedia` lifecycle, or `AudioContext` state transitions differently from other browsers.

## Evidence

Key diagnostic log lines from an iOS Safari session using `ConversationProvider`:

```
// onConnect fires at the SDK level...
[voice] onConnect fired
// ...but status immediately reverts
[voice] status: disconnected (1ms after connected)
// Agent speaks (audio works), but isSpeaking never updates
// Agent tries to call a tool:
[elevenlabs] Client tool not defined: navigate_to_planet
```

When bypassing the provider entirely via a `window.debugStartDirect()` function that called `Conversation.startSession()` from `@elevenlabs/client` with the same `agentId` and `clientTools`:

```
// Same device, same browser, same session:
[voice] onConnect fired
[voice] status: connected
[voice] onModeChange: speaking
[voice] navigate_to_planet called: { name: "Mars" }
// Everything works perfectly
```

This confirms the bug is in `ConversationProvider`'s state management layer, not in the underlying `@elevenlabs/client` SDK or in iOS Safari's WebSocket/WebRTC support.

## Workaround

Bypass `ConversationProvider` and `useConversation()` entirely. Use `Conversation` from `@elevenlabs/client` directly:

```tsx
import { Conversation } from '@elevenlabs/client';

// In your component/hook:
const convRef = useRef<Conversation | null>(null);
const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
const [isSpeaking, setIsSpeaking] = useState(false);

const startSession = async () => {
  setStatus('connecting');
  const conv = await Conversation.startSession({
    agentId: 'your-agent-id',
    connectionType: 'websocket',
    clientTools: {
      navigate_to_planet: (params) => {
        // Tools work reliably when passed directly
        return 'Navigated';
      },
    },
    onConnect: () => setStatus('connected'),
    onDisconnect: () => {
      setStatus('disconnected');
      setIsSpeaking(false);
      convRef.current = null;
    },
    onModeChange: (m) => setIsSpeaking(m.mode === 'speaking'),
  });
  convRef.current = conv;
};
```

This works reliably on iOS Safari 18.7, desktop browsers, and Android.

## Related issues

- **#422** — `isSpeaking` not updating on iOS (same root cause: provider state not propagating)
- **#361** — iOS mic not initialized (related iOS Safari audio lifecycle issue)

## Additional iOS issue (separate bug)

There is a second, unrelated issue on iOS Safari: the **first agent message audio is inaudible**. Subsequent messages play normally.

Symptoms:
- `AudioContext.state` is `running`
- The SDK's hidden `<audio>` element has `currentTime` advancing (confirmed past 15+ seconds)
- `paused` is `false`
- No audible output from the speaker

This appears to be an iOS Safari autoplay/MediaStream interaction:
- `getUserMedia()` switches iOS to `AVAudioSessionCategoryPlayAndRecord`, which routes audio to the earpiece at low volume
- The SDK creates an `<audio>` element with `autoplay` and later sets `srcObject` to a `MediaStream`, but iOS does not restart playback for the new source
- By the time the second message arrives, iOS has resolved the audio routing and subsequent messages play through the loudspeaker normally

This is a separate issue from the `ConversationProvider` state bug and affects the direct `@elevenlabs/client` SDK as well.
