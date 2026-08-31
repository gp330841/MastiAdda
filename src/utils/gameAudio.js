let audioContext = null;
let masterSoundEnabled = true;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;

  if (!audioContext) {
    audioContext = new AudioCtor();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
};

export const setMasterSoundEnabled = (enabled) => {
  masterSoundEnabled = enabled;
};

export const isMasterSoundEnabled = () => masterSoundEnabled;

const playTone = ({
  frequency = 440,
  duration = 0.12,
  type = 'sine',
  volume = 0.08,
  slide = 0,
  delay = 0,
}) => {
  if (!masterSoundEnabled) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const execute = () => {
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, now);
      if (slide) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(40, frequency + slide),
          now + duration
        );
      }

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Audio playback fails gracefully if user hasn't interacted yet
    }
  };

  if (delay > 0) {
    setTimeout(execute, delay);
  } else {
    execute();
  }
};

export const playMoveSound = () => {
  playTone({ frequency: 480, duration: 0.06, type: 'sine', volume: 0.06, slide: 80 });
};

export const playCaptureSound = () => {
  playTone({ frequency: 280, duration: 0.12, type: 'triangle', volume: 0.09, slide: -120 });
  playTone({ frequency: 160, duration: 0.18, type: 'sawtooth', volume: 0.05, slide: -60, delay: 60 });
};

export const playCheckSound = () => {
  playTone({ frequency: 520, duration: 0.1, type: 'square', volume: 0.05, slide: 120 });
  playTone({ frequency: 650, duration: 0.14, type: 'square', volume: 0.05, slide: 100, delay: 90 });
};

export const playWinSound = () => {
  playTone({ frequency: 440, duration: 0.12, type: 'triangle', volume: 0.08, slide: 100 });
  playTone({ frequency: 587, duration: 0.15, type: 'triangle', volume: 0.08, slide: 80, delay: 110 });
  playTone({ frequency: 880, duration: 0.3, type: 'sine', volume: 0.09, slide: 120, delay: 240 });
};

export const playLoseSound = () => {
  playTone({ frequency: 380, duration: 0.15, type: 'sawtooth', volume: 0.06, slide: -80 });
  playTone({ frequency: 260, duration: 0.25, type: 'sawtooth', volume: 0.06, slide: -100, delay: 140 });
};

export const playDrawSound = () => {
  playTone({ frequency: 330, duration: 0.15, type: 'sine', volume: 0.06 });
  playTone({ frequency: 330, duration: 0.2, type: 'sine', volume: 0.06, delay: 140 });
};

export const playMergeSound = () => {
  playTone({ frequency: 400, duration: 0.08, type: 'triangle', volume: 0.07, slide: 180 });
  playTone({ frequency: 600, duration: 0.12, type: 'sine', volume: 0.08, slide: 240, delay: 60 });
};

export const playCountdownTick = () => {
  playTone({ frequency: 600, duration: 0.05, type: 'sine', volume: 0.06 });
};

export const playLudoSound = (event) => {
  if (!masterSoundEnabled) return;

  switch (event) {
    case 'roll':
      playTone({ frequency: 180, duration: 0.18, type: 'triangle', volume: 0.04, slide: 70 });
      playTone({ frequency: 240, duration: 0.12, type: 'triangle', volume: 0.03, slide: 60, delay: 80 });
      break;
    case 'six':
      playTone({ frequency: 260, duration: 0.18, type: 'triangle', volume: 0.05, slide: 110 });
      playTone({ frequency: 420, duration: 0.15, type: 'sine', volume: 0.04, slide: 140, delay: 90 });
      break;
    case 'move':
      playTone({ frequency: 420, duration: 0.08, type: 'sine', volume: 0.05, slide: 50 });
      break;
    case 'capture':
      playCaptureSound();
      break;
    case 'bonus':
      playTone({ frequency: 520, duration: 0.12, type: 'triangle', volume: 0.05, slide: 90 });
      playTone({ frequency: 640, duration: 0.12, type: 'triangle', volume: 0.04, slide: 100, delay: 90 });
      break;
    case 'turn':
      playTone({ frequency: 300, duration: 0.1, type: 'sine', volume: 0.03, slide: 35 });
      break;
    case 'win':
      playWinSound();
      break;
    default:
      break;
  }
};

