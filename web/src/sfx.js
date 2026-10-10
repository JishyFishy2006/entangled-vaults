// Tiny synthesized sounds (Web Audio, no asset files). M toggles mute; the
// choice is remembered per browser when storage is available.
let muted = false;
try { muted = localStorage.getItem('entangled-vaults-muted') === '1'; } catch { /* storage blocked */ }

export const isMuted = () => muted;

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('entangled-vaults-muted', muted ? '1' : '0'); } catch { /* storage blocked */ }
  return muted;
}

function tone(scene, { freq, slide, dur = 0.07, type = 'sine', gain = 0.04, delay = 0 }) {
  const ctx = scene.sound.context;
  if (muted || !ctx) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur);
}

export const sfx = {
  win: scene => tone(scene, { freq: 880, slide: 1320, type: 'triangle' }),
  loss: scene => tone(scene, { freq: 196, slide: 140, dur: 0.09, type: 'square', gain: 0.02 }),
  open: scene => [523, 659, 784, 1047].forEach((freq, i) =>
    tone(scene, { freq, dur: 0.3, type: 'triangle', gain: 0.06, delay: i * 0.12 })),
  shut: scene => tone(scene, { freq: 150, slide: 60, dur: 0.5, type: 'sawtooth', gain: 0.04 }),
  tick: scene => tone(scene, { freq: 1400, dur: 0.03, type: 'square', gain: 0.015 }),
  ready: scene => [660, 990].forEach((freq, i) => tone(scene, { freq, dur: 0.18, type: 'triangle', gain: 0.05, delay: i * 0.1 })),
  jump: scene => tone(scene, { freq: 320, slide: 640, dur: 0.1, type: 'square', gain: 0.015 }),
  death: scene => tone(scene, { freq: 500, slide: 70, dur: 0.45, type: 'sawtooth', gain: 0.04 }),
  pickup: scene => [1320, 1760].forEach((freq, i) => tone(scene, { freq, dur: 0.08, type: 'triangle', gain: 0.04, delay: i * 0.06 })),
  lever: scene => [220, 330].forEach((freq, i) => tone(scene, { freq, dur: 0.07, type: 'square', gain: 0.03, delay: i * 0.07 })),
  door: scene => tone(scene, { freq: 120, slide: 70, dur: 0.6, type: 'sawtooth', gain: 0.03 }),
};
