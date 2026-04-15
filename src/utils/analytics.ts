import posthog from 'posthog-js';

// ---------- PostHog ----------
// Replace with your PostHog project API key and host
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string) || 'https://us.i.posthog.com';

let initialized = false;

export function initAnalytics() {
  if (initialized || !POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: false,
    capture_pageview: true,
    persistence: 'localStorage',
  });
  initialized = true;
}

// ---------- Navigation Events ----------

export function trackPlanetView(planetId: string, viewMode?: string) {
  if (!initialized) return;
  posthog.capture('planet_viewed', { planet_id: planetId, view_mode: viewMode });
  fbq('track', 'ViewContent', { content_name: planetId, content_type: 'planet' });
  gtag('event', 'planet_viewed', { planet_id: planetId, view_mode: viewMode });
}

export function trackMoonView(planetId: string, moonId: string, viewMode?: string) {
  if (!initialized) return;
  posthog.capture('moon_viewed', { planet_id: planetId, moon_id: moonId, view_mode: viewMode });
  fbq('track', 'ViewContent', { content_name: moonId, content_type: 'moon' });
  gtag('event', 'moon_viewed', { planet_id: planetId, moon_id: moonId, view_mode: viewMode });
}

export function trackSunView(viewMode?: string) {
  if (!initialized) return;
  posthog.capture('sun_viewed', { view_mode: viewMode });
  fbq('track', 'ViewContent', { content_name: 'sun', content_type: 'sun' });
  gtag('event', 'sun_viewed', { view_mode: viewMode });
}

export function trackModeSwitch(mode: string) {
  if (!initialized) return;
  posthog.capture('mode_switched', { view_mode: mode });
  gtag('event', 'mode_switched', { view_mode: mode });
}

export function trackVoiceAgentActivated() {
  if (!initialized) return;
  posthog.capture('voice_agent_activated');
  fbq('track', 'Lead');
  gtag('event', 'voice_agent_activated');
}

// Track engagement milestone: user explored N planets in this session
let planetsExploredThisSession = new Set<string>();

export function trackExplorationMilestone(planetId: string) {
  if (!initialized) return;
  planetsExploredThisSession.add(planetId);
  const count = planetsExploredThisSession.size;
  if (count === 3) {
    posthog.capture('exploration_milestone', { planets_count: 3 });
    fbq('track', 'CompleteRegistration');
    gtag('event', 'exploration_milestone', { planets_count: 3 });
  }
}

// ---------- GA4 Helpers ----------

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

function gtag(...args: unknown[]) {
  window.gtag?.(...args);
}

// ---------- Meta Pixel Helpers ----------

function fbq(...args: unknown[]) {
  window.fbq?.(...args);
}
