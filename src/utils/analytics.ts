import posthog from 'posthog-js';

// ---------- PostHog ----------
// Env values set through `vercel env add` via stdin can carry a trailing
// newline; an untrimmed key silently breaks every PostHog capture.
const POSTHOG_KEY = (import.meta.env.VITE_POSTHOG_KEY as string | undefined)?.trim() || undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined)?.trim() || 'https://us.i.posthog.com';

let initialized = false;

export function initAnalytics() {
  if (initialized || !POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: false,
    capture_pageview: true,
    persistence: 'localStorage',
  });
  // Several apps share one PostHog project; tag every event with its app.
  posthog.register({ app: 'space-explorer' });
  initialized = true;
}

type EventProps = Record<string, string | number | boolean | undefined>;

/**
 * Send to every configured sink independently: GA4 (configured in
 * index.html) must not depend on PostHog having initialized.
 */
function track(event: string, props?: EventProps) {
  if (initialized) posthog.capture(event, props);
  gtag('event', event, props ?? {});
}

// ---------- Navigation Events ----------

export function trackPlanetView(planetId: string, viewMode?: string) {
  track('planet_viewed', { planet_id: planetId, view_mode: viewMode });
}

export function trackMoonView(planetId: string, moonId: string, viewMode?: string) {
  track('moon_viewed', { planet_id: planetId, moon_id: moonId, view_mode: viewMode });
}

export function trackSunView(viewMode?: string) {
  track('sun_viewed', { view_mode: viewMode });
}

export function trackModeSwitch(mode: string) {
  track('mode_switched', { view_mode: mode });
}

// ---------- Rubin finds ----------

export type RubinSource = 'list' | 'scene' | 'voice' | 'toolbar';

export function trackRubinToggle(enabled: boolean, source: RubinSource) {
  track('rubin_finds_toggled', { enabled, source });
}

export function trackRubinFindView(findId: string, source: RubinSource) {
  track('rubin_find_viewed', { find_id: findId, source });
}

// ---------- Voice guide (Stella) ----------

/** The talk button was pressed (before mic permission or connection). */
export function trackVoiceAgentActivated() {
  track('voice_agent_activated');
}

export function trackVoiceAgentFailed(reason: 'mic_denied' | 'mic_unavailable' | 'connect_failed') {
  track('voice_agent_failed', { reason });
}

export function trackVoiceSessionConnected(msToConnect: number) {
  track('voice_session_connected', { ms_to_connect: Math.round(msToConnect) });
}

/** Turn counts only: never transcript content. */
export function trackVoiceSessionEnded(durationS: number, userTurns: number, agentTurns: number) {
  track('voice_session_ended', { duration_s: Math.round(durationS), user_turns: userTurns, agent_turns: agentTurns });
}

// Track engagement milestone: user explored N planets in this session
const planetsExploredThisSession = new Set<string>();

export function trackExplorationMilestone(planetId: string) {
  planetsExploredThisSession.add(planetId);
  if (planetsExploredThisSession.size === 3) track('exploration_milestone', { planets_count: 3 });
}

// ---------- GA4 Helpers ----------

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function gtag(...args: unknown[]) {
  window.gtag?.(...args);
}
