import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackRubinFindView, trackVoiceSessionEnded } from './analytics';

describe('analytics', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('sends GA4 events even when PostHog never initialized', () => {
    const gtag = vi.fn();
    vi.stubGlobal('window', { gtag });
    trackRubinFindView('2025-mn45', 'list');
    expect(gtag).toHaveBeenCalledWith('event', 'rubin_find_viewed', { find_id: '2025-mn45', source: 'list' });
  });

  it('reports voice sessions as rounded counts only', () => {
    const gtag = vi.fn();
    vi.stubGlobal('window', { gtag });
    trackVoiceSessionEnded(283.6, 12, 14);
    expect(gtag).toHaveBeenCalledWith('event', 'voice_session_ended', { duration_s: 284, user_turns: 12, agent_turns: 14 });
  });
});
