let _ctx: AudioContext | null = null;
function ctx(): AudioContext {
  if (!_ctx) _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function tone(
  freq: number, dur: number,
  type: OscillatorType = 'sine', vol = 0.25, delay = 0
) {
  try {
    const c = ctx();
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + delay);
    g.gain.setValueAtTime(vol, c.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + dur);
    osc.connect(g); g.connect(c.destination);
    osc.start(c.currentTime + delay);
    osc.stop(c.currentTime + delay + dur + 0.01);
  } catch { /* AudioContext blocked — silently ignore */ }
}

function noise(dur: number, freqHz = 400, vol = 0.15, delay = 0) {
  try {
    const c = ctx();
    const sr = c.sampleRate;
    const buf = c.createBuffer(1, sr * dur, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filt = c.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = freqHz;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, c.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + dur);
    src.connect(filt); filt.connect(g); g.connect(c.destination);
    src.start(c.currentTime + delay);
    src.stop(c.currentTime + delay + dur + 0.01);
  } catch { /* silently ignore */ }
}

export function soundDiceRoll() {
  // Rapid rattling effect — multiple short bursts like dice shaking in a cup
  for (let i = 0; i < 6; i++) {
    noise(0.06, 500 + Math.random() * 400, 0.14, i * 0.06);
  }
  // Final landing thud
  noise(0.12, 200, 0.20, 0.36);
}

export function soundStep() {
  // Soft tick per board step — like a token sliding to the next space
  tone(520 + Math.random() * 80, 0.06, 'sine', 0.07);
}

export function soundBuy() {
  tone(440, 0.08, 'square', 0.12);
  tone(554, 0.08, 'square', 0.12, 0.09);
  tone(659, 0.18, 'square', 0.12, 0.18);
}

export function soundRent() {
  tone(880, 0.09, 'sine', 0.18);
  tone(660, 0.14, 'sine', 0.13, 0.07);
}

export function soundJail() {
  tone(220, 0.25, 'sawtooth', 0.18);
  tone(165, 0.35, 'sawtooth', 0.14, 0.22);
}

export function soundPassGo() {
  [261, 329, 392, 523].forEach((f, i) => tone(f, 0.14, 'sine', 0.18, i * 0.09));
}

export function soundCard() {
  tone(600, 0.08, 'sine', 0.10);
  tone(900, 0.12, 'sine', 0.12, 0.07);
  tone(1200, 0.16, 'sine', 0.08, 0.14);
}

export function soundWin() {
  [523, 659, 784, 1047, 1047].forEach((f, i) =>
    tone(f, i === 4 ? 0.7 : 0.22, 'sine', 0.28, i * 0.14)
  );
}

export function soundBuildHouse() {
  tone(300, 0.05, 'square', 0.13);
  tone(450, 0.08, 'square', 0.13, 0.06);
  tone(600, 0.14, 'square', 0.13, 0.14);
}

export function soundMyTurn() {
  // Three ascending pings — "hey, it's your turn!"
  tone(600, 0.10, 'sine', 0.18);
  tone(800, 0.10, 'sine', 0.18, 0.12);
  tone(1000, 0.22, 'sine', 0.22, 0.24);
}
