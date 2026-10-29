/* 효과음 + 16비트 레트로 배경음악 (WebAudio로 직접 만든 창작곡 · 중국풍 5음계)
   곡: title 타이틀 · map 탐정 사무소/지도 · cq 충칭 · cd 청두 · km 쿤밍 · heb 하얼빈 · hq 수사 회의
       ladder 결승 탑 · check 검문소 · talk 대화 · win 성공(1번) · fail 실패(1번) */
const Sound = (() => {
  let ac = null, master, bgmGain, sfxGain, echoIn, revIn, sfxOn = true, bgmOn = true, cur = null, pulse = null, noiseBuf = null;
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ac = new AC(); master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination);
    bgmGain = ac.createGain(); bgmGain.gain.value = 0.2; bgmGain.connect(master);
    sfxGain = ac.createGain(); sfxGain.gain.value = 0.4; sfxGain.connect(master);
    // 리드용 메아리
    echoIn = ac.createGain(); const d = ac.createDelay(1), fb = ac.createGain(), wet = ac.createGain();
    d.delayTime.value = 0.27; fb.gain.value = 0.28; wet.gain.value = 0.35;
    echoIn.connect(d); d.connect(fb); fb.connect(d); d.connect(wet); wet.connect(bgmGain);
    // 16비트 느낌의 잔향 (홀 리버브)
    const rv = ac.createConvolver(), len = ac.sampleRate * 2.2, ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    rv.buffer = ir; revIn = ac.createGain(); revIn.gain.value = 0.42; const rvOut = ac.createGain(); rvOut.gain.value = 0.9;
    revIn.connect(rv); rv.connect(rvOut); rvOut.connect(bgmGain);
    // 25% 펄스파 (8비트 소리)
    const n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25);
    pulse = ac.createPeriodicWave(re, im);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    if (pending) { const p = pending; pending = null; bgm(p); }
  }
  const N = n => 440 * Math.pow(2, (n - 69) / 12);
  function tone(f, t0, dur, type = 'square', g = 1, dest = sfxGain, slide = 0, att = 0.008) {
    if (!ac) return;
    const o = ac.createOscillator(), v = ac.createGain();
    if (type === 'pulse') o.setPeriodicWave(pulse); else o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t0 + dur);
    v.gain.setValueAtTime(0.0001, t0); v.gain.linearRampToValueAtTime(g, t0 + att);
    v.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(v); v.connect(dest); o.start(t0); o.stop(t0 + dur + 0.03);
    return v;
  }
  function noise(t0, dur, g, dest = sfxGain, type = 'highpass', freq = 6000, q = 1) {
    if (!ac) return;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), v = ac.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
    v.gain.setValueAtTime(g, t0); v.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(v); v.connect(dest); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.02);
  }

  /* ───── 효과음 ───── */
  const T = () => ac.currentTime;
  const SFX = {
    blip: () => tone(1320, T(), 0.05, 'sine', 0.3),
    sel: () => { const t = T(); tone(N(84), t, 0.1, 'pulse', 0.25); tone(N(91), t + 0.05, 0.14, 'pulse', 0.22); },
    paper: () => { const t = T(); noise(t, 0.12, 0.35, sfxGain, 'bandpass', 2500, 0.8); noise(t + 0.07, 0.1, 0.25, sfxGain, 'bandpass', 3800, 0.8); },
    page: () => { const t = T(); [79, 84, 88, 91].forEach((n, i) => tone(N(n), t + i * 0.1, 0.3, 'pulse', 0.22)); },
    door: () => { const t = T(); tone(N(72), t, 0.12, 'pulse', 0.25); tone(N(79), t + 0.08, 0.18, 'pulse', 0.25); },
    good: () => { const t = T(); [76, 79, 84, 88].forEach((n, i) => tone(N(n), t + i * 0.06, 0.2, 'pulse', 0.24)); },
    bad: () => { const t = T(); tone(N(64), t, 0.15, 'square', 0.2); tone(N(58), t + 0.12, 0.28, 'square', 0.2); },
    pop: () => tone(N(91), T(), 0.07, 'sine', 0.35),
    // 달리기
    jump: () => tone(N(72), T(), 0.16, 'pulse', 0.24, sfxGain, 2.0),
    jump2: () => { const t = T(); tone(N(79), t, 0.14, 'pulse', 0.22, sfxGain, 2.2); noise(t, 0.12, 0.15, sfxGain, 'highpass', 5000); },
    land: () => { noise(T(), 0.06, 0.25, sfxGain, 'lowpass', 900); },
    slide: () => { const t = T(); noise(t, 0.35, 0.3, sfxGain, 'bandpass', 1800, 0.6); tone(300, t, 0.3, 'triangle', 0.15, sfxGain, 0.6); },
    step: () => noise(T(), 0.04, 0.18, sfxGain, 'lowpass', 1200),
    clue: () => { const t = T(); [88, 93, 100].forEach((n, i) => tone(N(n), t + i * 0.045, 0.16, 'pulse', 0.2)); tone(N(105), t + 0.14, 0.22, 'sine', 0.15); },
    bike: () => { const t = T(); tone(N(93), t, 0.06, 'sine', 0.35); tone(N(93), t + 0.1, 0.06, 'sine', 0.35); [72, 76, 79, 84].forEach((n, i) => tone(N(n), t + 0.2 + i * 0.05, 0.15, 'pulse', 0.2)); },
    hurt: () => { const t = T(); tone(220, t, 0.25, 'square', 0.25, sfxGain, 0.4); noise(t, 0.18, 0.3, sfxGain, 'lowpass', 1500); },
    pit: () => { const t = T(); tone(600, t, 0.5, 'triangle', 0.25, sfxGain, 0.2); },
    smash: () => { const t = T(); noise(t, 0.2, 0.45, sfxGain, 'lowpass', 2500); tone(160, t, 0.15, 'square', 0.2, sfxGain, 0.5); },
    open: () => { const t = T(); [72, 79, 84, 91].forEach((n, i) => tone(N(n), t + i * 0.05, 0.22, 'pulse', 0.22)); noise(t, 0.2, 0.12, sfxGain, 'highpass', 7000); },
    lock: () => { const t = T(); tone(120, t, 0.1, 'square', 0.3); noise(t, 0.08, 0.4, sfxGain, 'bandpass', 1200, 2); tone(N(52), t + 0.1, 0.3, 'square', 0.18, sfxGain, 0.8); },
    gate: () => { const t = T(); tone(N(81), t, 0.1, 'pulse', 0.18); tone(N(86), t + 0.12, 0.18, 'pulse', 0.18); },
    // 사다리
    tile: () => { const t = T(); tone(N(84), t, 0.08, 'pulse', 0.22); noise(t, 0.03, 0.15, sfxGain, 'highpass', 6000); },
    tuk: () => { const t = T(); noise(t, 0.05, 0.4, sfxGain, 'bandpass', 900, 3); tone(N(96), t + 0.03, 0.25, 'sine', 0.3); },
    climb: () => { const t = T(); [0, 1, 2, 3].forEach(i => { noise(t + i * 0.09, 0.04, 0.2, sfxGain, 'bandpass', 1500 + i * 300, 2); }); },
    // 검문소
    stamp: () => { const t = T(); tone(110, t, 0.14, 'sine', 0.9, sfxGain, 0.4); noise(t, 0.09, 0.5, sfxGain, 'lowpass', 900); },
    warn: () => { const t = T(); [0, 0.18].forEach(d => { tone(N(76), t + d, 0.12, 'square', 0.2); tone(N(70), t + d + 0.08, 0.1, 'square', 0.2); }); },
    rule: () => { const t = T(); noise(t, 0.15, 0.3, sfxGain, 'bandpass', 2200, 0.8); tone(N(84), t + 0.12, 0.2, 'pulse', 0.2); tone(N(88), t + 0.2, 0.25, 'pulse', 0.2); },
    caught: () => { const t = T(); [67, 71, 74, 79, 83, 86].forEach((n, i) => tone(N(n), t + i * 0.06, 0.25, 'pulse', 0.2)); },
    wind: () => noise(T(), 0.4, 0.25, sfxGain, 'bandpass', 1400, 0.5),
    whistle: () => { const t = T(); for (let i = 0; i < 2; i++) { const o = ac.createOscillator(), v = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain(); o.type = 'sine'; o.frequency.value = 2600; l.frequency.value = 28; lg.gain.value = 180; l.connect(lg); lg.connect(o.frequency); v.gain.setValueAtTime(0.0001, t + i * .32); v.gain.linearRampToValueAtTime(0.22, t + i * .32 + 0.02); v.gain.setValueAtTime(0.22, t + i * .32 + (i ? .42 : .2)); v.gain.exponentialRampToValueAtTime(0.0001, t + i * .32 + (i ? .5 : .26)); o.connect(v); v.connect(sfxGain); o.start(t + i * .32); l.start(t + i * .32); o.stop(t + i * .32 + .55); l.stop(t + i * .32 + .55); } },
    crack: () => { const t = T(); noise(t, 0.08, 0.5, sfxGain, 'bandpass', 2500, 2); noise(t + 0.09, 0.3, 0.45, sfxGain, 'lowpass', 1200); tone(90, t + 0.05, 0.4, 'square', 0.2, sfxGain, 0.5); },
    cheer: () => { const t = T(); for (let i = 0; i < 6; i++) noise(t + i * 0.05, 0.08, 0.15, sfxGain, 'bandpass', 2000 + i * 400, 1); [84, 88, 91, 96].forEach((n, i) => tone(N(n), t + i * 0.07, 0.25, 'pulse', 0.2)); }
  };
  function sfx(n) { if (!ac || !sfxOn || !SFX[n]) return; try { SFX[n](); } catch (e) {} }

  /* ───── 배경음악 ─────
     lead: "음이름옥타브:길이(8분음표)" 공백으로 구분, r = 쉼. bass: 마디(8분음표 8개)마다 뿌리음. drum: 마디 패턴 k 킥 · s 스네어 · h 하이햇 · . 쉼 */
  const SONGS = {
    title: { mode: 'maj', bpm: 132, wave: 'pulse', style: 'bounce', drum: 'k.h.s.hk',
      lead: 'E5:1 G5:1 A5:2 G5:1 E5:1 D5:2 C5:1 D5:1 E5:2 G5:2 E5:2 A5:1 G5:1 E5:2 D5:1 C5:1 D5:2 E5:6 r:2 E5:1 G5:1 A5:2 C6:2 A5:2 G5:1 A5:1 G5:1 E5:1 D5:2 C5:2 D5:1 E5:1 G5:2 A5:1 G5:1 E5:2 C5:6 r:2',
      bass: 'C3 A2 F2 G2 C3 A2 F2 C3' },
    map: { mode: 'min', bpm: 104, wave: 'pulse', style: 'walk', drum: 'k...h.s.',
      lead: 'A4:2 C5:2 D5:2 E5:2 G5:3 E5:1 D5:4 C5:2 D5:2 E5:2 A4:2 G4:6 r:2 A4:2 C5:2 D5:2 G5:2 A5:3 G5:1 E5:4 D5:2 E5:2 C5:2 D5:2 A4:6 r:2',
      bass: 'A2 F2 C3 G2 A2 F2 G2 A2' },
    talk: { mode: 'maj', bpm: 112, wave: 'triangle', style: 'pluck', drum: 'k...h...',
      lead: 'G4:2 A4:2 C5:2 A4:2 D5:3 C5:1 A4:4 C5:2 D5:2 E5:2 D5:2 C5:6 r:2',
      bass: 'C3 A2 F2 C3' },
    cq: { mode: 'min', bpm: 152, wave: 'pulse', style: 'bounce', drum: 'k.hsk.hs',
      lead: 'D5:1 F5:1 G5:1 A5:1 C6:2 A5:2 G5:1 A5:1 G5:1 F5:1 D5:4 F5:1 G5:1 A5:2 D6:2 C6:2 A5:1 G5:1 F5:1 G5:1 A5:4 D6:1 C6:1 A5:1 G5:1 A5:2 F5:2 G5:2 F5:1 D5:1 C5:4 D5:1 F5:1 G5:2 A5:1 C6:1 A5:2 D5:6 r:2',
      bass: 'D2 F2 G2 A2 D2 C2 G2 D2' },
    cd: { mode: 'maj', bpm: 96, wave: 'pluck', style: 'pluck', drum: 'k...s.h.',
      lead: 'G4:2 A4:1 B4:1 D5:4 E5:2 D5:1 B4:1 A4:4 G4:1 A4:1 B4:2 D5:2 E5:2 D5:6 r:2 E5:2 G5:2 E5:1 D5:1 B4:2 A4:2 B4:1 A4:1 G4:4 E4:2 G4:2 A4:2 B4:2 G4:6 r:2',
      bass: 'G2 E2 C3 D3 G2 E2 C3 G2' },
    km: { mode: 'maj', bpm: 124, wave: 'pulse', style: 'bounce', drum: 'k.h.s.h.',
      lead: 'C5:1 D5:1 F5:2 G5:2 A5:2 G5:1 F5:1 D5:2 C5:4 D5:1 F5:1 G5:2 A5:2 C6:2 A5:6 r:2 C6:2 A5:1 G5:1 F5:2 G5:2 A5:2 G5:1 F5:1 D5:4 F5:1 G5:1 A5:2 G5:1 F5:1 D5:2 F5:6 r:2',
      bass: 'F2 D2 C3 F2 A2 D2 C3 F2' },
    heb: { mode: 'min', bpm: 112, wave: 'bell', style: 'walk', drum: 'k..hs.h.',
      lead: 'E5:2 A5:2 C6:2 B5:2 A5:3 E5:1 G5:4 D5:2 G5:2 A5:2 G5:2 E5:6 r:2 A5:2 C6:2 D6:2 E6:2 D6:3 C6:1 A5:4 G5:2 A5:2 E5:2 D5:2 E5:6 r:2',
      bass: 'A2 F2 G2 E2 A2 F2 G2 A2' },
    hq: { mode: 'min', bpm: 140, wave: 'pulse', style: 'bounce', drum: 'k.hsk.hs',
      lead: 'E5:1 E5:1 G5:1 E5:1 A5:2 G5:2 B5:1 A5:1 G5:1 E5:1 D5:4 E5:1 E5:1 G5:1 E5:1 B5:2 A5:2 G5:1 A5:1 B5:1 D6:1 E6:4',
      bass: 'E2 C2 D2 B1' },
    ladder: { mode: 'maj', bpm: 128, wave: 'pulse', style: 'bounce', drum: 'k.h.k.s.',
      lead: 'C5:1 E5:1 G5:1 C6:1 G5:1 E5:1 C5:2 D5:1 F5:1 A5:1 D6:1 A5:1 F5:1 D5:2 E5:1 G5:1 B5:1 E6:1 B5:1 G5:1 E5:2 F5:1 A5:1 C6:1 F6:1 E6:2 D6:2',
      bass: 'C3 D3 E3 F3' },
    check: { mode: 'min', bpm: 92, wave: 'pluck', style: 'walk', drum: 'k.h.k.h.',
      lead: 'A4:1 r:1 C5:1 r:1 E5:1 r:1 D5:2 C5:1 r:1 A4:1 r:1 B4:4 A4:1 r:1 C5:1 r:1 E5:1 G5:1 F5:2 E5:2 D5:2 E5:4',
      bass: 'A2 E2 F2 E2' },
    win: { mode: 'maj', bpm: 150, wave: 'pulse', style: 'bounce', drum: 'k.k.s.ss', once: true,
      lead: 'C5:1 E5:1 G5:1 C6:3 A5:1 C6:1 E6:4 r:2 D6:1 C6:1 A5:1 C6:1 G5:6 r:2', bass: 'C3 F3 G3 C3' },
    fail: { mode: 'min', bpm: 110, wave: 'square', style: 'pluck', drum: '........', once: true,
      lead: 'G4:2 F#4:2 F4:2 E4:6', bass: 'C3 C3' }
  };
  const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const midi = s => { const m = /^([A-G]#?)(-?\d)$/.exec(s); return m ? NOTE[m[1]] + (+m[2] + 1) * 12 : 0; };
  const built = {};
  function build(name) {
    if (built[name]) return built[name];
    const s = SONGS[name], ev = []; let t = 0;
    s.lead.split(/\s+/).forEach(tok => { const [n, l] = tok.split(':'); const len = +l || 1; if (n !== 'r') ev.push({ t, k: 'lead', n: midi(n), len }); t += len; });
    const bars = Math.max(1, Math.ceil(t / 8)), roots = s.bass.split(/\s+/).map(midi), L = bars * 8;
    for (let b = 0; b < bars; b++) {
      const r = roots[b % roots.length];
      for (let i = 0; i < 8; i++) {
        if (s.style === 'bounce') ev.push({ t: b * 8 + i, k: 'bass', n: r + (i % 2 ? 12 : 0), len: .9 });
        else if (s.style === 'walk') { if (i % 2 === 0) ev.push({ t: b * 8 + i, k: 'bass', n: r + [0, 7, 12, 7][i / 2], len: 1.8 }); }
        else if (i === 0 || i === 4 || i === 6) ev.push({ t: b * 8 + i, k: 'bass', n: r + (i === 6 ? 7 : 0), len: i === 6 ? 1.6 : 3.6 });
        const d = s.drum[i]; if (d && d !== '.') ev.push({ t: b * 8 + i, k: d });
        if (i === 0 && !s.once) ev.push({ t: b * 8, k: 'pad', n: r, len: 8 });
      }
    }
    ev.sort((a, b) => a.t - b.t);
    return built[name] = { ev, L, step: 60 / s.bpm / 2, s };
  }
  /* 16비트 악기 */
  function lead16(f, at, dur, g, bright = 2600) {
    const v = ac.createGain(), fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = bright; fl.Q.value = 2;
    fl.frequency.setValueAtTime(bright * 1.6, at); fl.frequency.exponentialRampToValueAtTime(bright, at + 0.15);
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 5.6; lg.gain.setValueAtTime(0, at); lg.gain.linearRampToValueAtTime(f * 0.012, at + Math.min(0.35, dur));
    lfo.connect(lg);
    [['sawtooth', -7, .5], ['square', 7, .32]].forEach(([type, det, gg]) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; lg.connect(o.frequency); const og = ac.createGain(); og.gain.value = gg; o.connect(og); og.connect(fl); o.start(at); o.stop(at + dur + 0.3); });
    lfo.start(at); lfo.stop(at + dur + 0.3);
    v.gain.setValueAtTime(0.0001, at); v.gain.linearRampToValueAtTime(0.26, at + 0.012); v.gain.exponentialRampToValueAtTime(0.17, at + 0.12); v.gain.setValueAtTime(0.17, at + Math.max(0.12, dur - 0.04)); v.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.25);
    fl.connect(v); v.connect(g); v.connect(revIn); v.connect(echoIn);
  }
  function koto(f, at, dur, g) {      // 고쟁 느낌 뜯는 소리
    const v = ac.createGain(), fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(5000, at); fl.frequency.exponentialRampToValueAtTime(900, at + 0.4);
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 1.01, at); o.frequency.exponentialRampToValueAtTime(f, at + 0.05);
    const o2 = ac.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 2;
    v.gain.setValueAtTime(0.0001, at); v.gain.linearRampToValueAtTime(0.34, at + 0.004); v.gain.exponentialRampToValueAtTime(0.0001, at + Math.min(1.4, dur * 1.8 + 0.4));
    o.connect(fl); const g2 = ac.createGain(); g2.gain.value = .3; o2.connect(g2); g2.connect(fl); fl.connect(v); v.connect(g); v.connect(revIn);
    o.start(at); o2.start(at); o.stop(at + 1.5); o2.stop(at + 1.5);
  }
  function bell(f, at, dur, g) {      // FM 종소리 (얼음)
    const c = ac.createOscillator(), m = ac.createOscillator(), mg = ac.createGain(), v = ac.createGain();
    c.frequency.value = f; m.frequency.value = f * 3.5; mg.gain.setValueAtTime(f * 2.2, at); mg.gain.exponentialRampToValueAtTime(f * 0.1, at + 0.8);
    m.connect(mg); mg.connect(c.frequency);
    v.gain.setValueAtTime(0.0001, at); v.gain.linearRampToValueAtTime(0.26, at + 0.004); v.gain.exponentialRampToValueAtTime(0.0001, at + dur + 1.0);
    c.connect(v); v.connect(g); v.connect(revIn); c.start(at); m.start(at); c.stop(at + dur + 1.1); m.stop(at + dur + 1.1);
  }
  function pad(root, at, dur, g, mode) {   // 화음 패드 (스트링)
    const v = ac.createGain(), fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1100; fl.Q.value = .7;
    [0, mode === 'min' ? 15 : 16, 19, 24].forEach((iv, k) => { [-9, 9].forEach(det => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = N(root + 12 + iv); o.detune.value = det + k; o.connect(fl); o.start(at); o.stop(at + dur + 0.6); }); });
    v.gain.setValueAtTime(0.0001, at); v.gain.linearRampToValueAtTime(0.028, at + Math.min(0.4, dur * .4)); v.gain.setValueAtTime(0.028, at + dur * .85); v.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.5);
    fl.connect(v); v.connect(g); v.connect(revIn);
  }
  function bass16(f, at, dur, g) {
    const v = ac.createGain(), fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(1400, at); fl.frequency.exponentialRampToValueAtTime(420, at + 0.12); fl.Q.value = 4;
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const s2 = ac.createOscillator(); s2.type = 'sine'; s2.frequency.value = f;
    v.gain.setValueAtTime(0.0001, at); v.gain.linearRampToValueAtTime(0.42, at + 0.006); v.gain.exponentialRampToValueAtTime(0.22, at + 0.1); v.gain.exponentialRampToValueAtTime(0.0001, at + dur + 0.05);
    o.connect(fl); fl.connect(v); const sg = ac.createGain(); sg.gain.value = .5; s2.connect(sg); sg.connect(v); v.connect(g);
    o.start(at); s2.start(at); o.stop(at + dur + 0.1); s2.stop(at + dur + 0.1);
  }
  function play(e, at, song, g) {
    const st = song.step, w = song.s.wave;
    if (e.k === 'lead') {
      const f = N(e.n), d = e.len * st;
      if (w === 'pluck') koto(f, at, d, g);
      else if (w === 'bell') { bell(f, at, d, g); }
      else lead16(f, at, d * 0.92, g, w === 'triangle' ? 1500 : 2600);
    } else if (e.k === 'bass') bass16(N(e.n), at, e.len * st * 0.95, g);
    else if (e.k === 'pad') pad(e.n, at, e.len * st, g, song.s.mode);
    else if (e.k === 'k') { tone(130, at, 0.18, 'sine', 0.9, g, 0.28, 0.002); noise(at, 0.012, 0.25, g, 'highpass', 3000); }
    else if (e.k === 's') { noise(at, 0.16, 0.36, g, 'bandpass', 2200, 0.6); tone(190, at, 0.08, 'triangle', 0.3, g, 0.6, 0.002); const r = ac.createGain(); r.gain.value = 0; }
    else if (e.k === 'h') noise(at, 0.035, 0.11, g, 'highpass', 9000);
  }
  let pending = null, wanted = null, songGain = null, sched = null;
  function bgm(name) {
    wanted = name;
    if (cur === name) return;
    stopBgm();
    if (!ac) { pending = name; return; }
    if (!bgmOn || !SONGS[name]) return;
    cur = name;
    const song = build(name), g = songGain = ac.createGain(); g.gain.value = 1; g.connect(bgmGain);
    let t0 = ac.currentTime + 0.08, i = 0, loopN = 0;
    const tick = () => {
      if (songGain !== g) return;
      const until = ac.currentTime + 0.35;
      while (true) {
        if (i >= song.ev.length) { if (song.s.once) return; i = 0; loopN++; }
        const e = song.ev[i], at = t0 + (loopN * song.L + e.t) * song.step;
        if (at > until) break;
        if (at > ac.currentTime - 0.05) play(e, at, song, g);
        i++;
      }
    };
    tick(); sched = setInterval(tick, 80);
  }
  function stopBgm() {
    cur = null; clearInterval(sched); sched = null;
    if (songGain && ac) { const g = songGain; try { g.gain.setTargetAtTime(0, ac.currentTime, 0.05); setTimeout(() => g.disconnect(), 400); } catch (e) {} }
    songGain = null;
  }
  return {
    init, sfx, bgm,
    stopBgm() { wanted = null; stopBgm(); },
    setSfx(v) { sfxOn = v; },
    setBgm(v) { bgmOn = v; const w = wanted; if (!v) stopBgm(); else if (w) { cur = null; bgm(w); } },
    get current() { return cur; }
  };
})();
