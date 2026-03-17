import type { MicError, VoiceStatus } from '../../hooks/useSolarConversation';
import './VoiceAgent.css';

interface VoiceAgentProps {
  status: VoiceStatus;
  isSpeaking: boolean;
  onToggle: () => void;
  micError: MicError;
  onDismissError: () => void;
}

function MicIcon() {
  return (
    <svg className="voice-agent__mic-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}

const MIC_ERROR_MESSAGES: Record<NonNullable<MicError>, string> = {
  timeout:
    'Microphone not responding. Try quitting audio apps like Wispr Flow or superwhisper, then restart your browser.',
  'not-allowed':
    'Microphone access denied. Please allow microphone access in your browser settings and try again.',
  device:
    "Couldn't access your microphone. Please check that a microphone is connected.",
  'no-input':
    'No audio input detected. Your microphone may be muted or the wrong device is selected. Check your input device in System Settings \u2192 Sound \u2192 Input.',
};

function statusText(status: VoiceStatus, isSpeaking: boolean, micError: MicError): string {
  if (micError) return 'Tap to try again';
  if (status === 'connecting') return 'Getting ready...';
  if (status === 'connected' && isSpeaking) return 'Talking to you!';
  if (status === 'connected') return 'Listening...';
  if (status === 'error') return 'Tap to try again';
  return 'Tap to talk';
}

export function VoiceAgent({ status, isSpeaking, onToggle, micError, onDismissError }: VoiceAgentProps) {
  const orbClass = [
    'voice-agent__orb',
    status === 'connecting' && 'voice-agent__orb--connecting',
    status === 'connected' && !isSpeaking && 'voice-agent__orb--listening',
    status === 'connected' && isSpeaking && 'voice-agent__orb--speaking',
  ].filter(Boolean).join(' ');

  const containerClass = [
    'voice-agent__orb-container',
    isSpeaking && 'voice-agent__orb-container--speaking',
  ].filter(Boolean).join(' ');

  return (
    <div className="voice-agent">
      <div className={containerClass}>
        <button className={orbClass} aria-label="Voice agent" onClick={onToggle} type="button">
          <MicIcon />
        </button>
        <div className="voice-agent__wave" />
        <div className="voice-agent__wave" />
        <div className="voice-agent__wave" />
      </div>
      <span className="voice-agent__status">
        {statusText(status, isSpeaking, micError)}
      </span>
      {micError && (
        <button
          className="voice-agent__error"
          onClick={onDismissError}
          type="button"
          aria-label="Dismiss microphone error"
        >
          {MIC_ERROR_MESSAGES[micError]}
        </button>
      )}
    </div>
  );
}
