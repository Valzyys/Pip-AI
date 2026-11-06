/**
 * Tiny 8-bit "text blip" voice for Pip, made with WebAudio (no audio files).
 * Off by default; the room has a toggle.
 */
let ctx: AudioContext | null = null;
let last = 0;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, vol = 0.04, when = 0) {
  const a = audio();
  const t = a.currentTime + when;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** One syllable of Pip-speak. Throttled so fast streams don't turn into noise. */
export function blip(pitch = 1) {
  const now = performance.now();
  if (now - last < 55) return;
  last = now;
  tone((520 + Math.random() * 180) * pitch, 0.05, "square", 0.025);
}

export const sfx = {
  send: () => [660, 880, 1320].forEach((f, i) => tone(f, 0.07, "square", 0.03, i * 0.05)),
  done: () => [880, 1175].forEach((f, i) => tone(f, 0.09, "triangle", 0.05, i * 0.08)),
  poof: () => tone(180, 0.18, "sawtooth", 0.03),
  error: () => [300, 200].forEach((f, i) => tone(f, 0.12, "square", 0.03, i * 0.1)),
  key: () => tone(1400 + Math.random() * 300, 0.02, "square", 0.01),
};
