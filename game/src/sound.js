// Starfall Court — tiny synthesised sounds, no audio files.
// Every sound is a WebAudio oscillator, so the game loads nothing over
// the network and needs no assets. Silent until the first click, as
// browsers require a user gesture before audio starts.

let context = null;
let muted = false;

/** Create (or reuse) the audio context on the first user gesture. */
export function unlockAudio() {
  if (context) {
    if (context.state === 'suspended') context.resume();
    return;
  }
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) context = new AudioContext();
  } catch {
    context = null;
  }
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, seconds, type = 'sine', gainValue = 0.08, when = 0) {
  if (!context || muted) return;
  const start = context.currentTime + when;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(gainValue, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + seconds + 0.05);
}

export function playClick() {
  tone(660, 0.06, 'triangle', 0.05);
}

export function playCardSound() {
  tone(392, 0.1, 'triangle', 0.08);
  tone(523, 0.12, 'triangle', 0.07, 0.05);
}

export function playChainSound() {
  tone(523, 0.09, 'triangle', 0.08);
  tone(659, 0.09, 'triangle', 0.08, 0.06);
  tone(784, 0.14, 'triangle', 0.08, 0.12);
}

export function playDamageSound() {
  tone(180, 0.18, 'sawtooth', 0.06);
  tone(120, 0.22, 'sawtooth', 0.05, 0.05);
}

export function playHealSound() {
  tone(523, 0.12, 'sine', 0.06);
  tone(784, 0.18, 'sine', 0.06, 0.08);
}

export function playTurnSound() {
  tone(440, 0.08, 'triangle', 0.05);
  tone(587, 0.1, 'triangle', 0.05, 0.07);
}

export function playWinSound() {
  [523, 659, 784, 1047].forEach((freq, i) => tone(freq, 0.22, 'triangle', 0.08, i * 0.12));
}

export function playLoseSound() {
  [392, 330, 262, 196].forEach((freq, i) => tone(freq, 0.28, 'sine', 0.07, i * 0.14));
}
