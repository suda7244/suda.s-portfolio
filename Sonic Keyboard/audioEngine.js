// audioEngine.js (GLOBAL VERSION)
// Web Audio: percussive “tap” family with rhythm sensitivity (delta time).

let audioCtx = null;
let masterGain = null;
let lastKeyTime = 0;
let muted = false;
let lastWasD = false;


function initAudio() {
  if (audioCtx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  audioCtx = new Ctx();

  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.9;
  masterGain.connect(audioCtx.destination);
}

async function resumeAudioIfNeeded() {
  initAudio();
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
}

function setMuted(m) {
  muted = m;
  if (!masterGain) return;
  masterGain.gain.value = muted ? 0.0 : 0.9;
}

function getDeltaAndIntensity(now) {
  const delta = lastKeyTime ? (now - lastKeyTime) : 0.5;
  lastKeyTime = now;

  // slow > 350ms, steady 120–350ms, fast < 120ms
  let intensity;
  if (delta > 0.35) intensity = 0.32;
  else if (delta > 0.12) intensity = 0.62;
  else intensity = 0.92;

  intensity = Math.min(1, Math.max(0.25, intensity));
  return { delta, intensity };
}

function makeNoiseBurst(ctx, durSeconds) {
  const length = Math.floor(ctx.sampleRate * durSeconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  return src;
}

function playTapVoice({
  baseFreq,
  wave,
  filterBase,
  filterRange,
  gainBase,
  gainRange,
  decayBase,
  decayRange,
  gritBase,
  gritRange
}) {
  initAudio();
  if (muted) return;

  const now = audioCtx.currentTime;
  const { intensity } = getDeltaAndIntensity(now);

  const osc = audioCtx.createOscillator();
  const filter = audioCtx.createBiquadFilter();
  const gain = audioCtx.createGain();

  osc.type = wave;
  osc.frequency.setValueAtTime(baseFreq, now);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(filterBase + intensity * filterRange, now);
  filter.Q.setValueAtTime(0.7 + intensity * 3.2, now);

  const peak = gainBase + intensity * gainRange;
  const decay = decayBase + intensity * decayRange;

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

  const gritMix = gritBase + intensity * gritRange;
  const noise = makeNoiseBurst(audioCtx, Math.min(0.12, decay));
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(gritMix, now);

  osc.connect(filter);
  noise.connect(noiseGain);
  noiseGain.connect(filter);

  filter.connect(gain);
  gain.connect(masterGain);

  osc.start(now);
  osc.stop(now + decay + 0.03);

  noise.start(now);
  noise.stop(now + decay + 0.03);
}

function playA() {
  lastWasD = false;
  resumeAudioIfNeeded();
  playTapVoice({
    baseFreq: 180,
    wave: "sine",
    filterBase: 700,
    filterRange: 1400,
    gainBase: 0.08,
    gainRange: 0.10,
    decayBase: 0.07,
    decayRange: 0.08,
    gritBase: 0.01,
    gritRange: 0.03
  });
}

function playS() {
  lastWasD = false;
  resumeAudioIfNeeded();
  playTapVoice({
    baseFreq: 200,
    wave: "triangle",
    filterBase: 900,
    filterRange: 1900,
    gainBase: 0.10,
    gainRange: 0.12,
    decayBase: 0.08,
    decayRange: 0.09,
    gritBase: 0.015,
    gritRange: 0.05
  });
}

function playD() {
  lastWasD = true;
  resumeAudioIfNeeded();
  playTapVoice({
    baseFreq: 220,
    wave: "triangle",
    filterBase: 1100,
    filterRange: 2400,
    gainBase: 0.12,
    gainRange: 0.20,
    decayBase: lastWasD ? 0.16 : 0.13,
    decayRange: 0.18,
    gritBase: 0.02,
    gritRange: 0.07
  });
}

function playF() {
  lastWasD = false;
  resumeAudioIfNeeded();
  playTapVoice({
    baseFreq: 150,
    wave: "square",
    filterBase: 650,
    filterRange: 1500,
    gainBase: 0.14,
    gainRange: 0.16,
    decayBase: 0.10,
    decayRange: 0.12,
    gritBase: 0.02,
    gritRange: 0.09
  });
}
function playSpace() {
  resumeAudioIfNeeded();

  playTapVoice({
    baseFreq: 90,
    wave: "sine",
    filterBase: 350,
    filterRange: 900,
    gainBase: 0.04,
    gainRange: 0.05,
    decayBase: 0.18,
    decayRange: 0.22,
    gritBase: 0.04,   // a bit more noise
    gritRange: 0.12
  });
}

function playEnter() {
  resumeAudioIfNeeded();

  playTapVoice({
    baseFreq: 62,
    wave: "sine",
    filterBase: 220,
    filterRange: 120,
    gainBase: 0.06,
    gainRange: 0.04,
    decayBase: 0.08,
    decayRange: 0.06,
    gritBase: 0.0,
    gritRange: 0.02
  });
}

function playErase() {
  resumeAudioIfNeeded();

  // Failed erase / system rejection sound
  playTapVoice({
    baseFreq: 420,        // higher than Enter, feels sharper
    wave: "square",       // brittle, digital
    filterBase: 900,      // narrow, band-pass-ish feel
    filterRange: 300,
    gainBase: 0.045,      // quiet but noticeable
    gainRange: 0.02,
    decayBase: 0.035,     // very short
    decayRange: 0.02,
    gritBase: 0.18,       // glitch texture
    gritRange: 0.12
  });
}

function playLabourSound(k) {
  const keyChar = (k || "").toUpperCase();
  if (keyChar === "A") playA();
  else if (keyChar === "S") playS();
  else if (keyChar === "D") playD();
  else if (keyChar === "F") playF();
  else playD(); // default sound for other keys
}
