// AirPlay (WebKit only). The picker works on a media element, which is why playback
// uses a single <audio> element rather than Web Audio.

interface WebKitAudio extends HTMLAudioElement {
  webkitShowPlaybackTargetPicker?: () => void;
  webkitCurrentPlaybackTargetIsWireless?: boolean;
}

export interface AirPlay {
  /** True if the picker can be shown (Safari with a target in range). */
  available: boolean;
  /** True while audio is being sent to an AirPlay device. */
  wireless: boolean;
  showPicker(): void;
}

export function setupAirPlay(audio: HTMLAudioElement, onChange: (s: AirPlay) => void): AirPlay {
  const el = audio as WebKitAudio;
  const state: AirPlay = {
    available: false,
    wireless: false,
    showPicker() {
      try {
        el.webkitShowPlaybackTargetPicker?.();
      } catch {
        /* ignore */
      }
    },
  };
  const emit = () => onChange(state);

  el.addEventListener('webkitplaybacktargetavailabilitychanged', (e) => {
    state.available = (e as Event & { availability?: string }).availability === 'available';
    emit();
  });
  el.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', () => {
    state.wireless = Boolean(el.webkitCurrentPlaybackTargetIsWireless);
    emit();
  });
  return state;
}
