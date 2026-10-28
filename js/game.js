/* 진담 도시 탐정 런 — 게임 본체 (교재 1권 「중국 도시 미스터리 파일」 과제용)
   지도 → 편지(수상한 질문) → 친구 대화 → 달리기(단서 10개 · 덩어리 관문 · 공유 자전거) → 결승 탑 덩어리 사다리 → 사건 해결 · 과제 확인증 */
const APP_VERSION = 'v0.2.0 (2026.10.29)';
const KEY = 'jcr1-';
const H = ART.H, GY = ART.GY;

/* ───────── 저장 ───────── */
const newSave = () => ({ v: 1, name: '', intro: false, cleared: {}, weakClue: {}, weakGate: {}, meeting: 0, unlockAll: false, history: [] });
const store = {
  get(k, d) { try { const v = localStorage.getItem(KEY + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) {} },
  clear() { try { Object.keys(localStorage).filter(k => k.startsWith(KEY)).forEach(k => localStorage.removeItem(k)); } catch (e) {} }
};
let save = Object.assign(newSave(), store.get('save', {}) || {});
const set = Object.assign({ py: true, ko: true, rate: .85, sfx: true, bgm: true }, store.get('set', {}));
const persist = () => store.set('save', save), persistSet = () => store.set('set', set);
TTS.setRate(set.rate); Sound.setSfx(set.sfx); Sound.setBgm(set.bgm);

/* ───────── 화면 ───────── */
const $ = s => document.querySelector(s);
const topEl = $('#top'), cv = $('#cv'), ov = $('#ov'), pad = $('#pad'), uiRoot = $('#ui');
const ctx = cv.getContext('2d');
let W = 300, S = 2, DPR = 1;
let LAND = false;
function fit() {
  const app = $('#app'); DPR = window.devicePixelRatio || 1;
  LAND = app.clientWidth > app.clientHeight;
  if (LAND) {
    const cssW = app.clientWidth, cssH = app.clientHeight;
    S = Math.max(1, Math.round(cssH * DPR / H)); if (H * S / DPR > cssH * 1.1) S = Math.max(1, S - 1);
    W = Math.max(260, Math.floor(cssW * DPR / S));
  } else {
    const cssW = Math.min(app.clientWidth, 560);
    S = Math.max(1, Math.round(cssW * DPR / 300));
    W = Math.max(220, Math.floor(cssW * DPR / S));
  }
  cv.width = W; cv.height = H; ctx.imageSmoothingEnabled = false;
  const cw = W * S / DPR, ch = H * S / DPR;
  cv.style.width = ov.style.width = cw + 'px'; cv.style.height = ov.style.height = ch + 'px';
  skyC = null;
}
window.addEventListener('resize', () => { fit(); if (LD) LD.scene = ART.towerScene(LD.cs.theme, W, viewCX()); ov._k = null; });
/* 가로 화면에서 오른쪽 패널에 가리지 않는 가운데 */
const viewCX = () => LAND && pad.innerHTML && !/pad-(run|title)/.test(pad.className) ? Math.round(W * .28) : Math.round(W / 2);
$('#rotOK').onclick = () => { document.body.classList.add('portraitOK'); };
const gx = x => x * S / DPR;            // 게임 픽셀 → 화면(css) 픽셀

/* ───────── 도우미 ───────── */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[(Math.random() * a.length) | 0];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const el = h => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstElementChild; };
const nm = s => String(s).replace(/\{name\}/g, save.name || '탐정');
const speak = s => TTS.speak(s);
function toast(m) { const t = el(`<div class="toast">${esc(m)}</div>`); uiRoot.appendChild(t); setTimeout(() => t.remove(), 1900); }
const zhBlock = (zh, py, ko, big) => `<div class="zh ${big ? 'big' : ''}">${esc(zh)}</div>${set.py && py ? `<div class="py">${esc(py)}</div>` : ''}${set.ko && ko ? `<div class="ko">${esc(ko)}</div>` : ''}`;
const WHO = { teacher: ['진아쌤', 'teacher'], minhao: ['民浩', 'minhao'] };
let enterHook = null, SPEAK = null;
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if ((e.key === 'Enter' || e.key === ' ') && enterHook) { e.preventDefault(); enterHook(); return; }
  if (screen === 'run') runKey(e, true);
});
document.addEventListener('keyup', e => { if (screen === 'run') runKey(e, false); });
/* 대화 한 줄씩: {who, t} 또는 {who, zh:[zh,py,ko]} */
function say(lines, extra = {}) {
  return [].concat(lines).reduce((p, l) => p.then(() => new Promise(res => {
    const w = extra.who || WHO[l.who] || (l.who ? [l.who, l.look || 'minhao'] : null);
    const z = l.zh, txt = z ? z[0] : nm(l.t || '');
    const emo = /[！!]/.test(txt) ? '!' : /[？?]|吗/.test(txt) ? '?' : /[♪~]|好吃|喜欢|开心/.test(txt) ? '♪' : '';
    const mood = l.mood || (emo === '!' ? 'happy' : emo === '?' ? 'surprise' : 'ok');
    SPEAK = w ? { look: w[1], mood, emo, t0: performance.now(), dur: Math.min(4200, 900 + txt.length * 110) } : null;
    const b = el(`<div class="box">${w ? `<img class="face" src="${PX.faceURL(w[1], mood)}">` : ''}<div class="body">${w ? `<div class="who">${esc(w[0])}</div>` : ''}
      ${z ? zhBlock(z[0], z[1], z[2]) + '<button class="mini sp">🔊</button>' : `<div class="t">${esc(nm(l.t))}</div>`}<div class="more">▼</div></div></div>`);
    uiRoot.appendChild(b);
    if (z) { speak(z[0]); b.querySelector('.sp').onclick = e => { e.stopPropagation(); speak(z[0]); }; }
    const done = () => { enterHook = null; SPEAK = null; b.remove(); Sound.sfx('blip'); res(); };
    b.onclick = done; enterHook = done;
  })), Promise.resolve());
}
function card(html, cls = '') {
  const dim = el('<div class="dim"></div>'); uiRoot.appendChild(dim);
  const c = el(`<div class="card ${cls}">${html}</div>`); uiRoot.appendChild(c);
  c.close = () => { dim.remove(); c.remove(); enterHook = null; };
  c.querySelectorAll('[data-say]').forEach(d => d.onclick = () => speak(d.dataset.say));
  return c;
}
const wait = (c, sel = '.go') => new Promise(res => { const b = c.querySelector(sel); const f = () => { TTS.stop(); c.close(); res(); }; b.onclick = f; enterHook = f; });

/* ───────── 화면 전환 ───────── */
let screen = 'title', cur = null;
function go(s) { screen = s; ov.innerHTML = ''; ov._k = null; pad.innerHTML = ''; pad.className = 'pad-' + s; setTop(); }
function setTop() {
  if (screen === 'title') { topEl.innerHTML = ''; return; }
  const stamps = CASES.filter(c => save.cleared[c.no]).length;
  topEl.innerHTML = `<span class="badge">🔍 ${esc(save.name || '탐정')}</span><span class="grow">${screen === 'run' ? '' : `도장 조각 ${stamps}/12`}</span>
    ${screen === 'run' ? '<button class="ib" id="pz">⏸</button>' : ''}<button class="ib" id="mn">☰</button>`;
  $('#mn').onclick = openMenu; const pz = $('#pz'); if (pz) pz.onclick = pauseRun;
}
const unlocked = no => save.unlockAll || no === 1 || !!save.cleared[no - 1];

/* ───────── 타이틀 ───────── */
let skyC = null, titleT = 0;
function titleScreen() {
  go('title'); Sound.bgm('title');
  pad.innerHTML = `<div class="title"><div class="t-sub">中国城市之谜 · 교재 1권</div><div class="logo">진담 도시 탐정 런</div>
    <div class="t-tag">12개 도시의 수상한 질문, 중국어로 달려서 풀어라!</div>
    <div class="tb">${save.intro ? `<button class="big" data-k="c">▶ 이어서 수사하기</button>` : ''}<button class="big ${save.intro ? 'ghost' : ''}" data-k="n">${save.intro ? '처음부터 새로' : '▶ 수사 시작'}</button></div>
    <div class="small">${APP_VERSION} · © 2026 진담중국어</div></div>`;
  pad.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { Sound.init(); Sound.sfx('sel'); goLandscape(); if (b.dataset.k === 'n') { save = newSave(); persist(); prologue(); } else mapScreen(); });
}
function goLandscape() {
  try { const d = document.documentElement; if (!document.fullscreenElement && d.requestFullscreen && matchMedia('(pointer: coarse)').matches) d.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {}); } catch (e) {}
}
async function prologue() {
  go('office'); Sound.bgm('map');
  await say(STORY.prologue);
  const c = card(`<h2>🕵️ 탐정 등록</h2><div class="small">교재 표지의 '탐정 이름'을 적어 주세요.</div><input class="name" maxlength="8" placeholder="탐정 이름">
    <div class="row"><button class="big go">등록하기</button></div>`);
  const inp = c.querySelector('input'); setTimeout(() => inp.focus(), 50);
  await new Promise(res => { c.querySelector('.go').onclick = () => { save.name = inp.value.trim().slice(0, 8) || '탐정'; c.close(); res(); }; });
  save.intro = true; persist(); setTop();
  await say(STORY.afterName);
  mapScreen();
}
function drawOffice(t) {
  const g = ctx;
  PX.R(g, 0, 0, W, H, '#3b2f45'); PX.R(g, 0, 120, W, 80, '#6a4a3a');
  for (let x = 0; x < W; x += 16) PX.R(g, x, 120, 1, 80, '#5a3e30');
  PX.R(g, 20, 20, 90, 60, '#2a1d24'); PX.R(g, 22, 22, 86, 56, '#c99a6b');
  for (let i = 0; i < 6; i++) { PX.R(g, 26 + (i % 3) * 27, 26 + Math.floor(i / 3) * 26, 22, 18, '#fff8ec'); PX.R(g, 34 + (i % 3) * 27, 24 + Math.floor(i / 3) * 26, 4, 4, '#e2504c'); }
  PX.line(g, 37, 35, 64, 60, '#e2504c'); PX.line(g, 64, 35, 91, 60, '#e2504c');
  PX.R(g, W - 120, 30, 100, 50, '#7fb2ec'); PX.R(g, W - 118, 32, 96, 46, '#bfe3ff'); PX.R(g, W - 72, 30, 3, 50, '#2a1d24');
  PX.R(g, 30, 130, 140, 10, '#8a5a3a'); PX.R(g, 30, 130, 140, 2, '#a8744e'); PX.R(g, 40, 140, 6, 40, '#6a4028'); PX.R(g, 154, 140, 6, 40, '#6a4028');
  for (let i = 0; i < 12; i++) { PX.R(g, 44 + (i % 6) * 18, 118 - Math.floor(i / 6) * 8, 14, 9, '#fff8ec'); PX.R(g, 49 + (i % 6) * 18, 120 - Math.floor(i / 6) * 8, 4, 4, save.cleared[i + 1] ? '#5fae6e' : '#e2504c'); }
  const cx = LAND ? Math.round(W * .62) : W - 76;
  drawCast(t, [{ look: 'minhao', x: cx - 22, face: 1 }, { look: 'teacher', x: cx + 14, face: -1 }]);
}
/* 대화하는 사람들: 마주 보고, 말할 때 입·손짓, 듣는 사람은 눈 깜빡·끄덕 */
function drawCast(t, cast, base = GY) {
  cast.forEach((p, i) => {
    let pose = p.pose || 'stand', f = 0, mood = p.mood || '', dy = 0;
    const sp = SPEAK && SPEAK.look === p.look ? SPEAK : null, el2 = sp ? t - sp.t0 : 0;
    if (!p.pose && sp) {
      if (el2 < sp.dur) { pose = sp.emo === '?' ? (Math.floor(el2 / 700) % 2 ? 'talk' : 'think') : 'talk'; f = Math.floor(t / 150) % 2; mood = (f ? 'talk' : '') + sp.mood; }
      else mood = sp.mood === 'happy' ? 'happy' : '';
      if (el2 < 160) dy = -2; else if (el2 < 260) dy = -1;
    } else if (!p.pose) {
      const k = (t + i * 1300) % 3400; if (k < 130) mood = 'blink';
      if (SPEAK && SPEAK.mood === 'happy' && t - SPEAK.t0 < 900) { mood = 'happy'; f = Math.floor((t - SPEAK.t0) / 220) % 2; }
      else if (SPEAK && t - SPEAK.t0 > 500 && t - SPEAK.t0 < 1100) f = 1;     // 끄덕
    } else f = p.f || 0;
    let im = PX.person(p.look, pose, f, mood || undefined); if (p.face < 0) im = PX.flip(im);
    const y = base - PX.SH + 1 + dy;
    PX.ellipse(ctx, p.x + 12, base + 1, 8, 1, 'rgba(0,0,0,.18)');
    ctx.drawImage(im, Math.round(p.x), Math.round(y));
    if (sp && sp.emo && el2 < 1500) {   // 말풍선 표시
      const bx = Math.round(p.x + (p.face < 0 ? 2 : 12)), by = Math.round(y - 12 - (el2 < 200 ? 2 : 0));
      PX.R(ctx, bx, by, 11, 10, '#1d1424'); PX.R(ctx, bx + 1, by + 1, 9, 8, '#ffffff'); PX.R(ctx, bx + 4, by + 10, 2, 2, '#1d1424');
      PX.text(ctx, sp.emo, bx + (sp.emo === '♪' ? 1 : 3), by, 8, sp.emo === '!' ? '#e2504c' : sp.emo === '?' ? '#4f7fdc' : '#e05a9a');
    }
  });
}

/* ───────── 지도 ───────── */
let mapView = { x: 0, y: 0, drag: null, sel: 1 };
function mapScreen() {
  go('map'); Sound.bgm('map');
  mapPad();
  const m = ART.mapCanvas(); const c = CITY_MAP.find(c => c.no === (nextCase() || 1)); const [px, py] = m.proj(c.lon, c.lat);
  mapView.x = Math.max(0, Math.min(ART.MAP.W - W, px - viewCX())); mapView.y = Math.max(0, Math.min(ART.MAP.H - H, py - H / 2));
}
function nextCase() { for (const c of CASES) if (!save.cleared[c.no]) return c.no; return 0; }
function mapPad() {
  const nc = nextCase();
  const meetingOpen = CASES.every(c => save.cleared[c.no]);
  pad.innerHTML = `<div class="panel"><div class="ptitle">🗺 사건 편지 <span class="small">지도를 끌어서 볼 수 있어요</span></div>
    <div class="cases">${CITY_MAP.map(c => {
      const has = CASES.find(x => x.no === c.no), done = save.cleared[c.no], open = has && unlocked(c.no);
      return `<button class="case ${done ? 'done' : ''} ${open && !done ? 'open' : ''}" data-no="${c.no}" ${has ? '' : 'disabled'}><b>${String(c.no).padStart(2, '0')}</b> ${esc(c.zh)}<small>${has ? (done ? '★'.repeat(done) + '☆'.repeat(3 - done) : open ? '편지 열기' : '🔒') : '준비 중'}</small></button>`;
    }).join('')}</div>
    <button class="big ${meetingOpen ? '' : 'ghost'}" id="mt" ${meetingOpen ? '' : 'disabled'}>🗂 중간 수사 회의 (1~4과) ${save.meeting ? '★'.repeat(save.meeting) : meetingOpen ? '' : '— 4과까지 해결하면 열려요'}</button>
    <div class="small final">📮 ${esc(STORY.finalTeaser)}</div></div>`;
  pad.querySelectorAll('.case').forEach(b => b.onclick = () => {
    const no = +b.dataset.no; if (!unlocked(no)) { Sound.sfx('bad'); return toast(`먼저 ${no - 1}과 사건을 해결해요`); }
    Sound.sfx('sel'); openCase(no);
  });
  $('#mt').onclick = () => meeting();
}
function drawMap(t) {
  const m = ART.mapCanvas();
  ctx.fillStyle = '#3a76b8'; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(m.c, -Math.round(mapView.x), -Math.round(mapView.y));
  CITY_MAP.forEach(c => {
    const [x, y] = m.proj(c.lon, c.lat); const sx = Math.round(x - mapView.x), sy = Math.round(y - mapView.y);
    const has = CASES.find(k => k.no === c.no), st = save.cleared[c.no] ? 'done' : has && unlocked(c.no) ? 'open' : 'lock';
    const bob = st === 'open' && !save.cleared[c.no] && c.no === nextCase() ? Math.round(Math.sin(t / 200) * 2) : 0;
    ctx.drawImage(ART.cityIcon(c.no, st), sx - 9, sy - 9 + bob);
  });
  // 도시 이름표 (HTML)
  const k = Math.round(mapView.x) + ',' + Math.round(mapView.y) + W;
  if (ov._k !== k) {
    ov._k = k; ov.innerHTML = '';
    CITY_MAP.forEach(c => { const [x, y] = m.proj(c.lon, c.lat); const d = el(`<div class="mlabel ${CASES.find(k => k.no === c.no) ? '' : 'faint'}">${esc(c.zh)}<small>${esc(c.ko)}</small></div>`); d.style.left = gx(x - mapView.x) + 'px'; d.style.top = gx(y - mapView.y + 9) + 'px'; ov.appendChild(d); });
  }
}
cv.addEventListener('pointerdown', e => {
  Sound.init();
  if (screen === 'map') { mapView.drag = { x: e.clientX, y: e.clientY, vx: mapView.x, vy: mapView.y, moved: 0 }; cv.setPointerCapture(e.pointerId); return; }
  if (screen === 'run') runPointer(e, 'down');
});
cv.addEventListener('pointermove', e => {
  if (screen === 'map' && mapView.drag) { const d = mapView.drag, k = DPR / S; mapView.x = Math.max(0, Math.min(ART.MAP.W - W, d.vx - (e.clientX - d.x) * k)); mapView.y = Math.max(0, Math.min(ART.MAP.H - H, d.vy - (e.clientY - d.y) * k)); d.moved++; }
  if (screen === 'run') runPointer(e, 'move');
});
cv.addEventListener('pointerup', e => {
  if (screen === 'map' && mapView.drag) {
    const d = mapView.drag; mapView.drag = null;
    if (d.moved < 4) { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W + mapView.x, y = (e.clientY - r.top) / r.height * H + mapView.y, m = ART.mapCanvas();
      const c = CITY_MAP.find(c => { const [cx, cy] = m.proj(c.lon, c.lat); return Math.hypot(cx - x, cy - y) < 12; });
      if (c) { const has = CASES.find(k => k.no === c.no); if (!has) return toast(`${c.zh}(${c.ko}) 사건은 준비 중이에요`); if (!unlocked(c.no)) return toast(`먼저 ${c.no - 1}과 사건을 해결해요`); openCase(c.no); } }
  }
  if (screen === 'run') runPointer(e, 'up');
});

/* ───────── 사건 편지 → 출발 ───────── */
async function openCase(no) {
  cur = CASES.find(c => c.no === no);
  go('intro'); Sound.sfx('page');
  const c = card(`<div class="letter"><div class="stampTop">TOP SECRET · CASE ${String(no).padStart(2, '0')}</div>
    <div class="city">${esc(cur.city)} <small>${esc(cur.py)} · ${esc(cur.ko)}</small></div>
    ${zhBlock(cur.title.zh, cur.title.py, '', true)}<button class="mini" data-say="${esc(cur.title.zh)}">🔊</button>
    <div class="q">❓ ${esc(cur.title.ko)}</div>
    <div class="note">📁 사건 파일 · ${esc(cur.note)}</div>
    <div class="small">📚 교재 1권 ${no}과 과제 · 단서 10개 → 덩어리 관문 → 덩어리 사다리</div></div>
    <div class="row"><button class="big go">🚄 ${esc(cur.city)}로 출발!</button></div>`, 'lettercard');
  speak(cur.title.zh);
  await wait(c);
  await say([{ who: 'teacher', t: STORY.depart[no] }]);
  // 도착 장면 + 친구 대화 (교재 미니 대화)
  go('arrive'); Sound.bgm('map'); arriveT = performance.now();
  const f = cur.friend;
  await sleep(Math.max(900, (viewCX() + 20) * 14 + 200));
  for (const [zh, py, ko, who] of cur.intro) await say([{ who: who === 'me' ? 'minhao' : f.name, look: f.look, zh: [zh, py, ko] }], who === 'me' ? {} : { who: [`${f.name} (${f.ko})`, f.look] });
  await say([{ who: f.name, look: f.look, t: `이 도시의 비밀을 풀려면 단서 10개가 필요해. 길에 떨어진 단서를 주우면서 따라와!` }], { who: [`${f.name} (${f.ko})`, f.look] });
  startRun(cur);
}
let arriveT = 0;
function drawScene(theme, t, people) {
  if (!skyC || skyC.theme !== theme) { const [c, g] = PX.mk(W, H); ART.THEMES[theme]().sky(g); c.theme = theme; skyC = c; THEME = ART.THEMES[theme](); }
  ctx.drawImage(skyC, 0, 0);
  THEME.layers.forEach(L => ctx.drawImage(L.c, 0, 0));
  for (let x = 0; x < W; x += ART.LW) ctx.drawImage(THEME.ground, x, GY);
  if (people) drawCast(t, people);
}
function arriveCast(t) {
  const cx = viewCX(), el2 = t - arriveT, mx = Math.min(cx - 24, -20 + el2 / 14);
  const arrived = mx >= cx - 24, f = cur.friend.look;
  if (screen === 'solved') return [{ look: 'minhao', x: cx - 24, face: 1, pose: 'cheer', f: Math.floor(t / 300) % 2 }, { look: f, x: cx + 8, face: -1, pose: 'cheer', f: Math.floor(t / 300 + 1) % 2 }];
  return [arrived ? { look: 'minhao', x: mx, face: 1 } : { look: 'minhao', x: mx, face: 1, pose: 'run', f: Math.floor(t / 90) % 6 },
    arrived ? { look: f, x: cx + 8, face: -1 } : { look: f, x: cx + 8, face: -1, pose: 'wave', f: Math.floor(t / 250) % 2 }];
}

/* ───────── 🏃 달리기 ───────── */
let THEME = null, R = null;
const PLAYER_X = 46, GRAV = 720, JUMP = 275, JUMP2 = 245, PH = 30, PH_SLIDE = 13;
/* 땅 높이: 평지 · 오르막 · 내리막 (꺾은선) */
function makeTerrain(L, gatesAt) {
  const pts = [[-200, 0], [320, 0]]; let x = 320, h = 0;
  const LV = [0, 14, 28, 42];
  while (x < L + 400) {
    let nh = pick(LV.filter(v => v !== h && Math.abs(v - h) <= 28));
    const len = Math.abs(nh - h) * 3.2;
    if (gatesAt.some(g => g > x - 120 && g < x + len + 120) || x + len > L - 40) { x += 50; pts.push([x, h]); continue; }
    x += len; h = nh; pts.push([x, h]);
    x += 160 + Math.random() * 240; pts.push([x, h]);
  }
  pts.push([x + 2000, h]);
  return pts;
}
function gh(x) {
  const P = R.terr; let lo = 0, hi = P.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P[m][0] <= x) lo = m; else hi = m; }
  const [x0, h0] = P[lo], [x1, h1] = P[hi]; return x1 === x0 ? h1 : h0 + (h1 - h0) * Math.max(0, Math.min(1, (x - x0) / (x1 - x0)));
}
const flatAt = (x, w) => Math.abs(gh(x - 4) - gh(x + w + 4)) < .5 && Math.abs(gh(x + w / 2) - gh(x)) < .5;
const pitAt = x => R.pits.find(p => !p.filled && x > p.x + 2 && x < p.x + p.w - 2);
function buildLevel(cs, boss) {
  const L = boss ? 3600 : 2700, objs = [];
  const gatesAt = boss ? Array.from({ length: 8 }, (_, i) => 320 + i * 400) : [.2, .41, .62, .82].map(f => f * L);
  R.terr = makeTerrain(L, gatesAt); R.pits = [];
  const near = (x, d = 120) => gatesAt.some(g => Math.abs(g - x) < d);
  let x = 260, n = 0;
  const lows = THEME.low, highs = THEME.high;
  while (x < L - 80) {
    x += 115 + Math.random() * 110; if (near(x)) continue; n++;
    const r = Math.random(), late = x > 420;
    if (late && r < .14 && flatAt(x, 40)) { const w = 30 + ((Math.random() * 10) | 0); R.pits.push({ x, w }); objs.push({ k: 'pit', x, w }); continue; }
    if (late && r < .26) { objs.push({ k: 'obs', x, roll: 1, ob: THEME.roll, w: 16, h: 16 }); continue; }
    if (late && r < .37) { objs.push({ k: 'obs', x, bird: 1, ph: Math.random() * 6, w: 14, h: 9 }); continue; }
    if (late && r < .47 && flatAt(x, 20)) { const ob = THEME.tall; objs.push({ k: 'obs', x, ob, w: 18, h: 56 }); continue; }
    if (!flatAt(x, 26)) { x -= 60; continue; }
    const hi = late && r < .68; const ob = pick(hi ? highs : lows);
    objs.push({ k: 'obs', x, ob, high: ob.high, w: ob.c.width - 4, h: ob.c.height - 2 });
  }
  if (!boss) {
    const order = shuffle(cs.clues.map((c, i) => i)).sort((a, b) => (save.weakClue[cs.no + ':' + b] ? 1 : 0) - (save.weakClue[cs.no + ':' + a] ? 1 : 0));
    order.forEach((ci, k) => { const cx = 200 + (k + .5) * (L - 300) / 10 + (Math.random() * 40 - 20); const ob = objs.find(o => Math.abs(o.x - cx) < 28 && o.k !== 'pit'); objs.push({ k: 'clue', x: cx, hy: ob ? (ob.h > 40 ? 70 : 58) : (Math.random() < .5 ? 14 : 46), ci }); });
    gatesAt.forEach((gxp, i) => objs.push({ k: 'gate', x: gxp, gate: cs.gates[i % cs.gates.length], gi: i % cs.gates.length }));
  } else {
    const pool = shuffle(CASES.flatMap(c => c.quick.map(q => ({ q, c })))).slice(0, 8);
    gatesAt.forEach((gxp, i) => {
      const { q } = pool[i]; const wrongs = shuffle(CASES.flatMap(k => k.quick.map(x => x[1])).filter(a => a !== q[1])).slice(0, 2);
      objs.push({ k: 'gate', x: gxp, gate: { quiz: 1, q: q[0], ko: q[2], ans: q[1], wrong: wrongs, py: '' } });
    });
  }
  [.3, .68].forEach(f => { const bx = f * L + 40; if (!near(bx)) objs.push({ k: 'bike', x: bx, hy: 30 }); });
  objs.push({ k: 'goal', x: L + 40 });
  return objs.sort((a, b) => a.x - b.x);
}
function startRun(cs, boss = false) {
  go('run'); Sound.bgm('chat');
  const key = boss ? 'hq' : cs.theme;
  skyC = null; drawScene(key, 0); THEME.key = key; THEME.roll = ART.roller(key); THEME.tall = ART.tall(THEME.col);
  { const d = THEME.ground.getContext('2d').getImageData(4, THEME.ground.height - 2, 1, 1).data; THEME.soil = `rgb(${d[0] * .72 | 0},${d[1] * .68 | 0},${d[2] * .7 | 0})`; THEME.soilD = `rgb(${d[0] * .55 | 0},${d[1] * .5 | 0},${d[2] * .55 | 0})`; }
  R = { cs, boss, dist: 0, speed: 82, objs: [], y: 0, vy: 0, ground: true, jumps: 0, slide: 0, hearts: 3, inv: 0, bike: 0, got: [], gates: [], fx: [], paused: false, t: 0, done: false, gateNow: null, slowK: 1, hurtT: 0, snow: [], terr: [[0, 0], [1, 0]], pits: [] };
  R.objs = buildLevel(cs, boss);
  R.total = R.objs.find(o => o.k === 'goal').x;
  if (THEME.snow) for (let i = 0; i < 40; i++) R.snow.push([Math.random() * 400, Math.random() * H, .5 + Math.random()]);
  runPad(); setTop();
}
function runPad() {
  pad.innerHTML = `<div class="hudrun"><span id="hearts"></span><span id="clues"></span><span id="bikeT"></span></div>
    <div class="prog"><i id="progI"></i></div>
    <div class="ctrl"><button class="cbtn jump" id="bJ">⤒<small>점프 (두 번 = 높이)</small></button><button class="cbtn slide" id="bS">⤓<small>미끄러지기</small></button></div>
    <div class="small center">화면을 눌러도 점프 · 아래로 쓸면 미끄러지기 · 키보드 ↑/스페이스 ↓</div>`;
  const bJ = $('#bJ'), bS = $('#bS');
  bJ.addEventListener('pointerdown', e => { e.preventDefault(); Sound.init(); doJump(); });
  bS.addEventListener('pointerdown', e => { e.preventDefault(); doSlide(true); }); bS.addEventListener('pointerup', () => doSlide(false)); bS.addEventListener('pointerleave', () => doSlide(false));
  updRunHud();
}
function updRunHud() {
  if (!R) return; const h = $('#hearts'); if (!h) return;
  h.innerHTML = '❤'.repeat(Math.max(0, R.hearts)) + '<span class="off">' + '❤'.repeat(3 - Math.max(0, R.hearts)) + '</span>';
  $('#clues').textContent = R.boss ? `❓ ${R.gates.filter(g => g.ok).length}/8` : `🔍 단서 ${R.got.length}/10`;
  $('#bikeT').textContent = R.bike > 0 ? `🚲 ${Math.ceil(R.bike)}초` : '';
  $('#progI').style.width = Math.min(100, R.dist / R.total * 100) + '%';
}
const footX = () => R.dist + PLAYER_X + 11;
function doJump() {
  if (!R || R.paused || R.done) return;
  if (R.ground) { R.vy = JUMP; R.ground = false; R.jumps = 1; R.slide = 0; Sound.sfx('blip'); }
  else if (R.jumps === 1) { R.vy = JUMP2; R.jumps = 2; Sound.sfx('pop'); puff(PLAYER_X + 8, GY - R.y, '#ffffff'); }
}
function doSlide(on) { if (!R || R.paused) return; if (on && R.ground) { R.slide = .6; Sound.sfx('wind'); } else if (on && !R.ground) R.vy = -320; }
let swipe = null;
function runPointer(e, k) {
  if (k === 'down') { swipe = { y: e.clientY, t: performance.now(), done: false }; return; }
  if (k === 'move' && swipe && !swipe.done && e.clientY - swipe.y > 30) { swipe.done = true; doSlide(true); return; }
  if (k === 'up' && swipe) { if (!swipe.done) doJump(); swipe = null; }
}
function runKey(e, down) {
  if (['ArrowUp', ' ', 'w', 'W'].includes(e.key)) { e.preventDefault(); if (down && !e.repeat) doJump(); }
  if (['ArrowDown', 's', 'S'].includes(e.key)) { e.preventDefault(); doSlide(down); }
}
function puff(x, y, col) { for (let i = 0; i < 6; i++) R.fx.push({ x, y, vx: (Math.random() - .5) * 60, vy: -Math.random() * 50, life: .5, col }); }
function pauseRun() {
  if (!R || R.done) return; R.paused = true;
  const c = card(`<h2>⏸ 잠깐 멈춤</h2><div class="row"><button class="big go">▶ 계속 달리기</button></div><div class="row"><button class="btn rs">처음부터 다시</button><button class="btn mp">지도로 나가기</button></div>`);
  c.querySelector('.go').onclick = () => { c.close(); R.paused = false; };
  c.querySelector('.rs').onclick = () => { c.close(); startRun(R.cs, R.boss); };
  c.querySelector('.mp').onclick = () => { c.close(); R = null; mapScreen(); };
}
function hurt() {
  if (R.inv > 0) return false;
  R.hearts--; R.inv = 1.3; R.hurtT = .5; Sound.sfx('bad'); puff(PLAYER_X + 10, GY - R.y - 15, '#ff8a7a'); updRunHud();
  if (R.hearts <= 0) { failRun(); return true; } return false;
}
function updateRun(dt) {
  if (!R || R.paused || R.done || uiRoot.querySelector('.card,.box')) return;
  R.t += dt;
  const gateAhead = R.objs.find(o => o.k === 'gate' && !o.passed && o.x - R.dist > -10 && o.x - R.dist < 185);
  R.slowK += ((gateAhead ? .45 : 1) - R.slowK) * Math.min(1, dt * 4);
  if (gateAhead !== R.gateNow) { R.gateNow = gateAhead; showGate(gateAhead); if (gateAhead && !save.tutGate) return gateTutorial(); }
  const fx0 = footX(), slope = (gh(fx0 + 6) - gh(fx0 - 6)) / 12;
  const sp = (R.speed + Math.min(28, R.t * .9)) * (R.bike > 0 ? 1.7 : 1) * R.slowK * (R.ground ? Math.max(.75, Math.min(1.25, 1 - slope * .9)) : 1);
  R.dist += sp * dt;
  // 몸 + 땅 (오르막·내리막·구멍)
  const fx = footX(), pit = pitAt(fx), G = pit ? -999 : gh(fx);
  if (R.ground) {
    if (pit) { R.ground = false; R.vy = 0; }
    else if (G >= R.y || R.y - G < 7) R.y = G; else { R.ground = false; R.vy = 0; }
  }
  if (!R.ground) {
    R.vy -= GRAV * dt; R.y += R.vy * dt;
    if (!pit && R.y <= G && R.vy <= 0) { R.y = G; R.vy = 0; R.ground = true; R.jumps = 0; puff(PLAYER_X + 8, GY - G, '#d8c8b8'); }
    if (pit && R.y < gh(pit.x) - 20) {          // 구멍에 빠짐 → 하트 -1, 판자를 깔고 튀어 오름
      pit.filled = true; R.vy = 300; R.jumps = 2; toast('앗! 구멍은 점프로 넘어요');
      if (hurt()) return;
    }
  }
  if (R.slide > 0) R.slide -= dt;
  if (R.inv > 0) R.inv -= dt; if (R.hurtT > 0) R.hurtT -= dt;
  if (R.bike > 0) { R.bike -= dt; if (R.bike <= 0) { toast('🚲 자전거를 세워 두었어요'); } }
  const ph = R.slide > 0 ? PH_SLIDE : PH, px0 = PLAYER_X + 4, px1 = PLAYER_X + 18;
  for (const o of R.objs) {
    const sx = o.x - R.dist; if (sx > W + 60) break; if (sx < -60 || o.gone) continue;
    if (o.k === 'obs') {
      if (o.roll && sx < W + 10) o.x -= 48 * dt;
      if (o.bird && sx < W + 10) o.x -= 34 * dt;
      const ox0 = sx + 2, ox1 = sx + o.w;
      if (ox1 < px0 || ox0 > px1) continue;
      const base = gh(o.x + o.w / 2), rel = R.y - base;
      let hit;
      if (o.high) hit = rel + ph > 18;
      else if (o.bird) { const by = birdY(o); hit = rel < by + o.h - 1 && rel + ph > by + 1; }
      else hit = rel < o.h - 4;
      if (hit) {
        if (R.bike > 0) { o.gone = true; puff(sx + o.w / 2, GY - base - o.h / 2, '#ffe08a'); Sound.sfx('stamp'); continue; }
        if (hurt()) return;
      }
    } else if (o.k === 'clue') {
      const base = gh(o.x), mag = R.bike > 0 ? 40 : 0; const cx = sx + 7, cy = GY - base - o.hy + 7, py = GY - R.y - ph / 2;
      if (mag && Math.abs(cx - (PLAYER_X + 11)) < mag + 20) { o.x -= (cx - (PLAYER_X + 11)) * dt * 6; o.hy -= (py - cy) * dt * 6; }
      if (cx > px0 - 6 && cx < px1 + 6 && Math.abs(cy - py) < ph / 2 + 10) { o.gone = true; collectClue(o); }
    } else if (o.k === 'bike') {
      const by = GY - gh(o.x) - o.hy;
      if (sx + 20 > px0 && sx < px1 && GY - R.y - ph < by + 14 && GY - R.y > by) { o.gone = true; R.bike = 6; Sound.sfx('good'); bikeCard(); }
    } else if (o.k === 'gate') {
      if (!o.passed && sx + 15 < PLAYER_X + 11) passGate(o);
    } else if (o.k === 'goal' && sx < PLAYER_X) { R.done = true; return finishRun(); }
  }
  R.fx.forEach(f => { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 140 * dt; f.life -= dt; }); R.fx = R.fx.filter(f => f.life > 0);
  if (Math.floor(R.t * 4) !== R._h) { R._h = Math.floor(R.t * 4); updRunHud(); }
}
const birdY = o => 12 + 12 * (1 + Math.sin(R.t * 2.6 + o.ph));
function collectClue(o) {
  const c = R.cs.clues[o.ci]; R.got.push(o.ci); delete save.weakClue[R.cs.no + ':' + o.ci]; persist();
  Sound.sfx('sel'); speak(c[0]); puff(PLAYER_X + 12, GY - R.y - 20, '#ffe08a');
  const chip = el(`<div class="cluechip">🔍 <b>${esc(c[0])}</b>${set.py ? ` <span>${esc(c[1])}</span>` : ''}${set.ko ? ` · ${esc(c[2])}` : ''}${c[3] ? ` <i>HSK${c[3]}</i>` : ''}</div>`);
  ov.appendChild(chip); setTimeout(() => chip.remove(), 1600);
  updRunHud();
}
function bikeCard() {
  const chip = el(`<div class="cluechip bike">🚲 <b>共享单车</b>${set.py ? ' <span>gòngxiǎng dānchē</span>' : ''}${set.ko ? ' · 공유 자전거! 6초 동안 씽씽' : ''}</div>`);
  ov.appendChild(chip); setTimeout(() => chip.remove(), 2200); speak('共享单车');
}
/* 관문: 문 세 개 (아래 = 그냥 달리기 / 가운데 = 점프 / 위 = 두 번 점프). 맞는 문만 열리고, 틀린 문은 잠겨서 튕겨 나와요. */
const LANE_H = [20, 60, 98], LANE_NAME = ['⬇ 달리기', '⤒ 점프', '⤒⤒ 2단 점프'];
async function gateTutorial() {
  save.tutGate = 1; persist();
  const c = card(`<h2>🚪 덩어리 관문이에요!</h2>
    <div class="t">빈칸 <b>＿</b> 에 들어갈 말이 적힌 <b>문</b>으로 지나가요.</div>
    <div class="small" style="margin:1em 0">⬇ <b>아래 문</b> = 그냥 달리기<br>⤒ <b>가운데 문</b> = 점프 1번<br>⤒⤒ <b>위 문</b> = 점프 2번</div>
    <div class="t">❌ 틀린 문은 <b>잠겨 있어서</b> 튕겨 나와요. 맞는 문을 찾을 때까지 다시 도전!</div>
    <div class="row"><button class="big go">알겠어요!</button></div>`);
  await wait(c);
}
function showGate(o) {
  ov.querySelectorAll('.glab').forEach(x => x.remove()); pad.querySelectorAll('.gban').forEach(x => x.remove());
  if (!o) return;
  const g = o.gate;
  if (!o.opts) { o.opts = shuffle([g.ans].concat(g.wrong.slice(0, 2))); o.locked = []; }
  const ban = el(`<div class="gban">${g.quiz ? `<div class="gq">${zhBlock(g.q, '', g.ko)}</div><div class="gh">알맞은 대답이 적힌 문으로 지나가요!</div>` : `<div class="gk">🚪 ${esc(g.ko)}</div><div class="gs">${esc(g.stem)}</div><div class="gh">빈칸에 들어갈 말이 적힌 문으로 지나가요!</div>`}</div>`);
  const pr = pad.querySelector('.prog'); if (pr) pr.after(ban); else pad.appendChild(ban);
  speak(g.quiz ? g.q : g.stem.replace(/＿+/, '什么'));
  o.labs = o.opts.map((t, i) => { const d = el(`<div class="glab${o.locked.includes(i) ? ' x' : ''}"><span class="ln">${LANE_NAME[i]}</span>${esc(t)}</div>`); ov.appendChild(d); return d; });
}
function passGate(o) {
  const rel = R.y - gh(o.x) + 15, lvl = rel < 41 ? 0 : rel < 80 ? 1 : 2;
  const pickT = o.opts[lvl], ok = pickT === o.gate.ans, g = o.gate;
  const full = g.quiz ? g.ans : g.stem.replace(/＿+/, g.ans);
  if (ok) {
    o.passed = true;
    R.gates.push({ g, ok: !o.failed, first: true });
    Sound.sfx('good'); puff(PLAYER_X + 12, GY - R.y - 20, '#7fd6a8'); speak(full);
    if (!g.quiz && !o.failed) delete save.weakGate[R.cs.no + ':' + o.gi];
    flash(`⭕ ${full}`, g.py, 'ok'); persist();
    setTimeout(() => { if (R && R.gateNow === o) { R.gateNow = null; showGate(null); } }, 250);
    return;
  }
  // 잠긴 문 → 튕겨 나옴
  o.failed = true; if (!o.locked.includes(lvl)) o.locked.push(lvl);
  if (!g.quiz) save.weakGate[R.cs.no + ':' + o.gi] = 1; persist();
  Sound.sfx('bad'); R.dist -= 70; R.vy = 140; R.ground = false; R.jumps = 2; R.hurtT = .45; R.slowK = .3;
  puff(PLAYER_X + 18, GY - R.y - 15, '#ff8a7a');
  flash(`🔒 「${pickT}」 문은 잠겨 있어요! 다른 문으로`, '', 'no');
  if (o.labs[lvl]) o.labs[lvl].classList.add('x');
  if (o.locked.length >= 2) { const ai = o.opts.indexOf(g.ans); if (o.labs[ai]) o.labs[ai].classList.add('hint'); }
}
function flash(t, py, cls) { const f = el(`<div class="gflash ${cls}">${esc(t)}${py && set.py ? `<small>${esc(py)}</small>` : ''}</div>`); ov.appendChild(f); setTimeout(() => f.remove(), 1500); }
async function failRun() {
  R.done = true; Sound.sfx('bad');
  const c = card(`<h2>😵 앗, 넘어졌어요!</h2><div class="small">괜찮아요! 다시 달리면 돼요. 모은 단서 ${R.got.length}개는 기억해 둘게요.</div><div class="row"><button class="big go">🔁 다시 달리기</button></div><div class="row"><button class="btn mp">지도로</button></div>`);
  c.querySelector('.mp').onclick = () => { c.close(); mapScreen(); };
  await wait(c); startRun(R.cs, R.boss);
}
function drawGround() {
  const gc = THEME.ground, gH = gc.height;
  for (let x = 0; x < W; x++) {
    const wx = R.dist + x, h = Math.round(gh(wx)), p = R.pits.find(q => wx >= q.x && wx < q.x + q.w);
    if (p && !p.filled) { const e = wx - p.x < 2 || p.x + p.w - wx <= 2; ctx.fillStyle = e ? THEME.soilD : '#140c18'; ctx.fillRect(x, GY - h + (e ? 0 : 3), 1, H); if (!e) { ctx.fillStyle = '#2a1d2e'; ctx.fillRect(x, GY - h, 1, 3); } continue; }
    const sx = ((Math.floor(wx) % ART.LW) + ART.LW) % ART.LW;
    ctx.drawImage(gc, sx, 0, 1, gH, x, GY - h, 1, gH);
    if (h > 0) { ctx.fillStyle = THEME.soil; ctx.fillRect(x, GY - h + gH, 1, h); if ((Math.floor(wx) + h) % 7 === 0) { ctx.fillStyle = THEME.soilD; ctx.fillRect(x, GY - h + gH + 3, 1, 2); } }
    if (p && p.filled) { ctx.fillStyle = (Math.floor(wx) % 6 === 0) ? '#6a4028' : '#a8743e'; ctx.fillRect(x, GY - h, 1, 3); }
    // 비탈 가장자리 그림자
    const d = gh(wx + 1) - gh(wx - 1); if (Math.abs(d) > .1) { ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x, GY - h + 2, 1, gH - 2); }
  }
}
function drawRun(t) {
  if (!skyC) { const [c, g] = PX.mk(W, H); THEME.sky(g); skyC = c; }
  ctx.drawImage(skyC, 0, 0);
  THEME.layers.forEach((L, i) => { const off = Math.floor(R.dist * L.s) % ART.LW; for (let x = -off; x < W; x += ART.LW) ctx.drawImage(L.c, x, 0); });
  if (THEME.name === '重庆') { const tx = ((t / 1000 * 60 - R.dist * .2) % 900 + 900) % 900 - 200; PX.R(ctx, tx, 104, 58, 9, '#2a1d24'); PX.R(ctx, tx + 1, 105, 56, 7, '#e2504c'); for (let i = 0; i < 6; i++) PX.R(ctx, tx + 4 + i * 9, 106, 6, 3, '#fff6dc'); PX.R(ctx, tx + 1, 111, 56, 1, '#a8332f'); }
  drawGround();
  for (const o of R.objs) {
    const sx = Math.round(o.x - R.dist); if (sx > W + 60) break; if (sx < -60 || o.gone) continue;
    if (o.k === 'obs') {
      const base = Math.round(gh(o.x + o.w / 2));
      if (o.roll) ctx.drawImage(o.ob.fr[((Math.floor(o.x / 4) % 4) + 4) % 4], sx, GY - base - 17);
      else if (o.bird) ctx.drawImage(ART.BIRD[Math.floor(t / 140) % 2], sx, Math.round(GY - base - birdY(o) - o.h - 1));
      else ctx.drawImage(o.ob.c, sx, o.high ? GY - base - 18 - o.ob.c.height : GY - base - o.ob.c.height + 1);
    }
    else if (o.k === 'clue') { const y = GY - gh(o.x) - o.hy, b = Math.round(Math.sin(t / 180 + o.x) * 1.5); ctx.drawImage(ART.ITEM.clue, sx, Math.round(y) + b); if ((t / 120 | 0) % 6 === 0) PX.P(ctx, sx + 2, y + b, '#fff'); }
    else if (o.k === 'bike') { const y = Math.round(GY - gh(o.x) - o.hy); ctx.drawImage(ART.ITEM.bike, sx, y + Math.round(Math.sin(t / 200) * 1.5)); PX.R(ctx, sx + 6, y - 6, 10, 5, '#2a1d24'); PX.R(ctx, sx + 7, y - 5, 8, 3, '#f2b631'); }
    else if (o.k === 'gate') {
      const base = Math.round(gh(o.x)), top = GY - base - 119;
      ctx.drawImage(ART.gate(THEME.col), sx, top);
      (o.locked || []).forEach(i => ctx.drawImage(ART.BARS, sx + 5, [top + 81, top + 43, top + 5][i] + (i ? -2 : 0)));
      if (o.labs) o.labs.forEach((d, i) => { d.style.left = gx(sx + 15) + 'px'; d.style.top = gx(GY - base - LANE_H[i]) + 'px'; });
    } else if (o.k === 'goal') { const b = Math.round(gh(o.x)); PX.R(ctx, sx, GY - b - 60, 3, 60, '#3b2a35'); PX.R(ctx, sx + 3, GY - b - 60, 20, 12, '#e2504c'); PX.R(ctx, sx + 5, GY - b - 58, 16, 8, '#fff'); PX.text(ctx, '终点', sx + 5, GY - b - 59, 7, '#e2504c'); }
  }
  const blink = R.inv > 0 && Math.floor(t / 80) % 2;
  if (!blink) {
    let im;
    if (R.bike > 0) im = PX.rider('minhao', Math.floor(t / 70) % 4);
    else if (R.hurtT > 0) im = PX.person('minhao', 'hurt');
    else if (R.slide > 0) im = PX.person('minhao', 'slide');
    else if (!R.ground) im = PX.person('minhao', R.vy > 0 ? 'jump' : 'fall');
    else im = PX.person('minhao', 'run', Math.floor(R.dist / 7) % 6);
    ctx.drawImage(im, PLAYER_X - (R.bike > 0 ? 4 : 0), Math.round(GY - R.y - PX.SH + 1));
    if (R.bike > 0) for (let i = 0; i < 3; i++) PX.R(ctx, PLAYER_X - 10 - i * 6 - (t / 30 % 6), GY - R.y - 10 - i * 4, 5, 1, '#ffffffaa');
  }
  if (!R.ground) { const G = gh(footX()); PX.ellipse(ctx, PLAYER_X + 12, GY - G + 2, Math.max(3, 8 - (R.y - G) / 12), 1, 'rgba(0,0,0,.18)'); }
  R.fx.forEach(f => PX.R(ctx, f.x, f.y, 2, 2, f.col));
  if (R.snow.length) R.snow.forEach(s => { s[0] -= (20 + s[2] * 20) * .016 + (R.bike > 0 ? 3 : 1); s[1] += s[2] * .6; if (s[1] > H) s[1] = 0; if (s[0] < 0) s[0] += W + 40; PX.R(ctx, s[0], s[1], s[2] > 1 ? 2 : 1, s[2] > 1 ? 2 : 1, '#ffffff'); });
}

/* ───────── 🪜 결승 탑: 덩어리 사다리 ───────── */
let LD = null;
function finishRun() {
  showGate(null); Sound.sfx('page');
  if (R.boss) return meetingEnd();
  startLadder(R.cs, R);
}
function startLadder(cs, run) {
  go('ladder'); Sound.bgm('chat');
  LD = { cs, run, step: 0, y: 0, ty: 0, anim: 0, tuk: 0, miss: 0, cheer: 0 };
  ladderPad(true);
  LD.scene = ART.towerScene(cs.theme, W, viewCX());
}
/* 사다리: 조각을 순서대로 눌러서 문장 만들기 */
function ladderPad(first) {
  const st = LD.cs.ladder[LD.step], n = st.t.length;
  let tiles = shuffle(st.t.map((t, i) => ({ t, i })));
  for (let k = 0; k < 6 && n > 1 && tiles.every((x, j) => x.t === st.t[j]); k++) tiles = shuffle(tiles);
  LD.pos = 0; LD.stepMiss = 0; LD.limit = 1.6 + n * .9; LD.done = false;
  pad.innerHTML = `<div class="panel"><div class="ptitle">🪜 덩어리 사다리 ${LD.step + 1} / 6 <span class="small">순서대로 눌러요</span></div>
    <div class="lko">"${esc(st.ko)}"</div>
    <div class="slots">${st.t.map(() => '<span class="slot">　</span>').join('')}</div>
    <div class="timer"><i id="tmr"></i></div>
    <div class="tiles">${tiles.map(x => `<button class="tile" data-t="${esc(x.t)}">${esc(x.t)}</button>`).join('')}</div></div>`;
  LD.t0 = performance.now(); LD.waiting = !!first;
  pad.querySelectorAll('.tile').forEach(b => b.onclick = () => tapTile(b));
  if (first) say([{ who: 'minhao', t: '결승 탑이다! 조각을 순서대로 눌러서 문장을 만들면 한 층씩 올라가. 꼭대기에서 사건의 진실을 외치는 거야!' }]).then(() => { LD.t0 = performance.now(); LD.waiting = false; });
}
async function tapTile(b) {
  if (LD.done || b.classList.contains('used')) return;
  const st = LD.cs.ladder[LD.step], need = st.t[LD.pos];
  if (b.dataset.t === need) {
    b.classList.add('used'); Sound.sfx('sel');
    const sl = pad.querySelectorAll('.slot')[LD.pos]; sl.textContent = need; sl.classList.add('on');
    pad.querySelectorAll('.tile.hint').forEach(x => x.classList.remove('hint'));
    LD.pos++;
    if (LD.pos < st.t.length) return;
    LD.done = true;
    const sec = (performance.now() - LD.t0) / 1000, ans = st.t.join('');
    Sound.sfx('good'); speak(ans);
    if (LD.stepMiss === 0 && sec < LD.limit) { LD.tuk++; floatPad('툭! ⚡'); }
    LD.ty = LD.step + 1; LD.anim = 1;
    await sleep(1100);
    LD.step++;
    if (LD.step >= 6) return ladderTop();
    ladderPad();
  } else {
    b.classList.remove('bad'); void b.offsetWidth; b.classList.add('bad'); Sound.sfx('bad'); LD.miss++; LD.stepMiss++;
    if (LD.stepMiss >= 2) { const h = [...pad.querySelectorAll('.tile:not(.used)')].find(x => x.dataset.t === need); if (h) h.classList.add('hint'); }
  }
}
function floatPad(t) { const f = el(`<div class="pfloat">${esc(t)}</div>`); pad.appendChild(f); setTimeout(() => f.remove(), 900); }
function updateLadder(dt) {
  if (!LD) return;
  if (LD.anim > 0) { LD.y += (LD.ty - LD.y) * Math.min(1, dt * 5); if (Math.abs(LD.ty - LD.y) < .02) { LD.y = LD.ty; LD.anim = 0; } }
  if (!LD.done && !LD.waiting) { const sec = (performance.now() - LD.t0) / 1000; const tm = $('#tmr'); if (tm) { tm.style.width = Math.max(0, 100 - sec / LD.limit * 100) + '%'; tm.className = 'fast'; } }
}
function drawLadder(t) {
  if (!LD.scene) return;
  ctx.drawImage(LD.scene, 0, 0);
  const tx = viewCX() - 34;
  const fy = GY - LD.y * 23;
  const climbing = LD.anim > 0;
  const im = LD.cheer ? PX.person('minhao', 'cheer', Math.floor(t / 300) % 2) : climbing ? PX.person('minhao', 'climb', Math.floor(t / 120) % 2) : PX.person('minhao', 'stand');
  ctx.drawImage(im, tx - 30 + (LD.cheer ? 34 : 0), Math.round(fy - PX.SH + 1 - (LD.cheer ? 2 : 0)));
  // 사다리
  for (let y = GY; y > GY - 6 * 23 - 4; y -= 4) PX.R(ctx, tx - 22, y, 10, 1, '#c99252');
  PX.R(ctx, tx - 23, GY - 142, 1, 142, '#8a5a30'); PX.R(ctx, tx - 12, GY - 142, 1, 142, '#8a5a30');
  if (LD.cheer) for (let i = 0; i < 12; i++) { const a = t / 300 + i; PX.R(ctx, W / 2 + Math.cos(a) * (20 + i * 3), 40 + Math.sin(a * 1.3) * 20 + i * 2, 2, 2, ['#e2504c', '#ffd36e', '#7fd6a8', '#7fb2ec'][i % 4]); }
}
async function ladderTop() {
  LD.cheer = 1; Sound.bgm('win');
  const last = LD.cs.ladder[5].t.join('');
  pad.innerHTML = `<div class="panel center"><div class="ptitle">🏆 꼭대기에서 사건의 진실을 외쳐요!</div>${zhBlock(last, '', LD.cs.ladder[5].ko)}<button class="big go">🔊 다 같이 외치기</button></div>`;
  speak(last);
  await new Promise(res => pad.querySelector('.go').onclick = () => { speak(last); res(); });
  await sleep(600);
  caseSolved();
}

/* ───────── 사건 해결 · 과제 확인증 ───────── */
async function caseSolved() {
  const cs = LD.cs, run = LD.run;
  const f = cs.friend;
  go('solved'); setTop();
  await say([{ zh: STORY.solved[cs.no], look: f.look }], { who: [`${f.name} (${f.ko})`, f.look] });
  const gatesFirst = run.gates.filter(g => g.first);
  const gateOk = gatesFirst.filter(g => g.ok).length;
  let stars = 1; if (run.hearts >= 2) stars++; if (gateOk >= gatesFirst.length - 1 && LD.tuk >= 3) stars++;
  const prev = save.cleared[cs.no] || 0; save.cleared[cs.no] = Math.max(prev, stars);
  const missed = cs.clues.map((c, i) => i).filter(i => !run.got.includes(i));
  missed.forEach(i => save.weakClue[cs.no + ':' + i] = 1);
  const now = new Date(); const date = `${now.getMonth() + 1}월 ${now.getDate()}일 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  save.history.push({ no: cs.no, stars, date, clues: run.got.length, gates: `${gateOk}/${gatesFirst.length}`, tuk: LD.tuk }); persist();
  Sound.sfx('stamp');
  // 1) 교재 미션
  const m = card(`<h2>🎤 사건 해결 미션 · ${esc(cs.mission.title)}</h2><div class="small">교재 ${cs.no}과 5쪽 미션이에요. 빈칸에 내 말을 넣어 소리 내어 3번 말해 보세요. (녹음은 저장되지 않아요)</div>
    <div class="mission" data-say="${esc(cs.mission.text.replace(/＿+/g, ''))}">${esc(cs.mission.text)} 🔊</div>
    <div class="dots"><button class="btn dot">1</button><button class="btn dot">2</button><button class="btn dot">3</button></div>
    <div class="row"><button class="big go" disabled>다음 ▶</button></div>`);
  let said = 0; m.querySelectorAll('.dot').forEach(d => d.onclick = () => { if (d.classList.contains('on')) return; d.classList.add('on'); Sound.sfx('sel'); if (++said >= 3) m.querySelector('.go').disabled = false; });
  await wait(m);
  // 2) 과제 확인증
  const wc = cs.clues.filter((c, i) => save.weakClue[cs.no + ':' + i]), wg = cs.gates.filter((g, i) => save.weakGate[cs.no + ':' + i]);
  const c = card(`<div class="cert"><div class="ctop">진담중국어 · 교재 1권 과제 확인증</div>
    <h2>CASE ${String(cs.no).padStart(2, '0')} ${esc(cs.city)} 해결!</h2>
    <div class="stars">${'★'.repeat(stars)}<span>${'☆'.repeat(3 - stars)}</span></div>
    <div class="crow"><span>탐정</span><b>${esc(save.name)}</b></div><div class="crow"><span>날짜</span><b>${esc(date)}</b></div>
    <div class="crow"><span>단서</span><b>${run.got.length} / 10</b></div><div class="crow"><span>덩어리 관문 (한 번에)</span><b>${gateOk} / ${gatesFirst.length}</b></div>
    <div class="crow"><span>사다리 툭! (실수 없이 빠르게)</span><b>${LD.tuk} / 6</b></div><div class="crow"><span>남은 하트</span><b>${'❤'.repeat(run.hearts)}</b></div>
    ${wc.length || wg.length ? `<div class="weak">🃏 오답 카드 (다음 판에 먼저 나와요): ${wc.map(x => `<span data-say="${esc(x[0])}">${esc(x[0])}</span>`).join(' ')} ${wg.map(g => `<span data-say="${esc(g.stem.replace(/＿+/, g.ans))}">${esc(g.stem.replace(/＿+/, g.ans))}</span>`).join(' ')}</div>` : '<div class="good">👏 오답 카드 없음!</div>'}
    <div class="small">이 화면을 캡처해서 선생님께 보내 주세요. 별 3개가 안 나오면 다시 도전해도 좋아요!</div></div>
    <div class="row"><button class="big go">🗺 지도로</button><button class="btn again">🔁 다시 도전</button></div>`, 'certcard');
  c.querySelector('.again').onclick = () => { c.close(); startRun(cs); };
  await wait(c);
  if (cs.no === 4 && !save.meeting) { await say([{ who: 'teacher', t: '{name} 탐정, 사무소로 와! 1~4과 중간 수사 회의를 열 거야.' }]); }
  else if (CASES.find(x => x.no === cs.no + 1)) await say([{ who: 'teacher', t: `잘했어! 다음 편지는 ${CASES.find(x => x.no === cs.no + 1).city}에서 왔어. 다음 수업이 끝나면 열어 보자.` }]);
  mapScreen();
}

/* ───────── 🗂 중간 수사 회의 ───────── */
async function meeting() {
  if (!CASES.every(c => save.cleared[c.no])) return toast('4과까지 해결하면 열려요');
  go('office'); Sound.bgm('map');
  await say(STORY.meeting1);
  startRun({ no: 0, theme: 'hq', clues: [], gates: [] }, true);
}
async function meetingEnd() {
  const ok = R.gates.filter(g => g.first && g.ok).length, tot = R.gates.filter(g => g.first).length;
  const stars = ok >= tot - 1 && R.hearts >= 2 ? 3 : ok >= tot / 2 ? 2 : 1;
  save.meeting = Math.max(save.meeting, stars); persist();
  go('office'); Sound.bgm('win');
  const c = card(`<div class="cert"><div class="ctop">진담중국어 · 교재 1권 과제 확인증</div><h2>🗂 중간 수사 회의 (1~4과) 통과!</h2>
    <div class="stars">${'★'.repeat(stars)}<span>${'☆'.repeat(3 - stars)}</span></div>
    <div class="crow"><span>탐정</span><b>${esc(save.name)}</b></div><div class="crow"><span>1초 즉시반응 (한 번에)</span><b>${ok} / ${tot}</b></div>
    <div class="small">교재 4과 6쪽 '중간 수사 회의 준비'와 함께 확인해요.</div></div><div class="row"><button class="big go">계속 ▶</button></div>`, 'certcard');
  await wait(c);
  await say(STORY.meeting1End);
  mapScreen();
}

/* ───────── 메뉴 ───────── */
function openMenu() {
  if (R && screen === 'run') R.paused = true;
  const wc = []; CASES.forEach(cs => cs.clues.forEach((c, i) => { if (save.weakClue[cs.no + ':' + i]) wc.push(c); }));
  const wg = []; CASES.forEach(cs => cs.gates.forEach((g, i) => { if (save.weakGate[cs.no + ':' + i]) wg.push(g.stem.replace(/＿+/, g.ans)); }));
  const c = card(`<h2>☰ 탐정 수첩</h2>
    <h3>🃏 오답 카드 ${wc.length + wg.length}장</h3><div class="weak">${wc.map(x => `<span data-say="${esc(x[0])}">${esc(x[0])} <small>${esc(x[1])} ${esc(x[2])}</small></span>`).join('')}${wg.map(x => `<span data-say="${esc(x)}">${esc(x)}</span>`).join('') || (wc.length ? '' : '<div class="small">없어요 👍</div>')}</div>
    <h3>📋 과제 기록</h3><div class="small">${save.history.slice(-8).reverse().map(h => `${h.date} · ${h.no}과 ${'★'.repeat(h.stars)} · 단서 ${h.clues}/10 · 관문 ${h.gates}`).join('<br>') || '아직 없어요'}</div>
    <h3>⚙️ 설정</h3>
    <div class="setrow">병음 보기 <button class="btn" data-k="py">${set.py ? '켜짐' : '꺼짐'}</button></div>
    <div class="setrow">뜻 보기 <button class="btn" data-k="ko">${set.ko ? '켜짐' : '꺼짐'}</button></div>
    <div class="setrow">읽기 빠르기 <button class="btn" data-k="rate">${set.rate < .8 ? '느리게' : set.rate > .9 ? '빠르게' : '보통'}</button></div>
    <div class="setrow">효과음 <button class="btn" data-k="sfx">${set.sfx ? '켜짐' : '꺼짐'}</button></div>
    <div class="setrow">배경음악 <button class="btn" data-k="bgm">${set.bgm ? '켜짐' : '꺼짐'}</button></div>
    <div class="setrow">선생님용: 모든 사건 열기 <button class="btn" data-k="unlock">${save.unlockAll ? '열림' : '코드 입력'}</button></div>
    <div class="setrow">처음부터 다시 <button class="btn" data-k="reset">초기화</button></div>
    <div class="small">${APP_VERSION} · © 2026 진담중국어(전진아). 무단 복사·배포·수정·판매 금지.<br>문의: <a href="https://pf.kakao.com/_jZYxmxj/chat" target="_blank" rel="noopener">카카오톡 채널</a></div>
    <div class="row"><button class="big go">닫기</button></div>`);
  let arm = 0;
  c.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
    const k = b.dataset.k;
    if (k === 'reset') { if (Date.now() - arm < 3000) { store.clear(); location.reload(); } arm = Date.now(); return toast('한 번 더 누르면 모든 기록이 지워져요'); }
    if (k === 'unlock') { if (save.unlockAll) { save.unlockAll = false; } else { const code = prompt('선생님 코드'); if (code !== '1799') return toast('코드가 달라요'); save.unlockAll = true; } persist(); c.close(); return openMenu(); }
    if (k === 'rate') { set.rate = set.rate < .8 ? .85 : set.rate < .9 ? 1 : .7; TTS.setRate(set.rate); speak('你好'); }
    else if (k === 'sfx') { set.sfx = !set.sfx; Sound.setSfx(set.sfx); }
    else if (k === 'bgm') { set.bgm = !set.bgm; Sound.setBgm(set.bgm); }
    else set[k] = !set[k];
    persistSet(); c.close(); openMenu();
  });
  c.querySelector('.go').onclick = () => { c.close(); if (R && screen === 'run') R.paused = false; if (screen === 'map') mapPad(); };
}

/* ───────── 매 프레임 ───────── */
let last = performance.now();
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (screen === 'title') { titleT += dt; if (!THEME || THEME.name !== '重庆') { THEME = ART.THEMES.cq(); skyC = null; } drawTitle(now, titleT * 60); }
  else if (screen === 'map') drawMap(now);
  else if (screen === 'office') drawOffice(now);
  else if (screen === 'intro' || screen === 'arrive' || screen === 'solved') drawScene(cur.theme, now, screen === 'intro' ? [] : arriveCast(now));
  else if (screen === 'run' && R) { updateRun(dt); if (R) drawRun(now); }
  else if (screen === 'ladder' && LD) { updateLadder(dt); drawLadder(now); }
  requestAnimationFrame(loop);
}
function drawTitle(t, dist) {
  if (!skyC) { const [c, g] = PX.mk(W, H); THEME.sky(g); skyC = c; }
  ctx.drawImage(skyC, 0, 0);
  THEME.layers.forEach(L => { const off = Math.floor(dist * L.s) % ART.LW; for (let x = -off; x < W; x += ART.LW) ctx.drawImage(L.c, x, 0); });
  const goff = Math.floor(dist) % ART.LW; for (let x = -goff; x < W; x += ART.LW) ctx.drawImage(THEME.ground, x, GY);
  const tx = ((t / 1000 * 60 - dist * .2) % 900 + 900) % 900 - 200; PX.R(ctx, tx, 104, 58, 9, '#2a1d24'); PX.R(ctx, tx + 1, 105, 56, 7, '#e2504c'); for (let i = 0; i < 6; i++) PX.R(ctx, tx + 4 + i * 9, 106, 6, 3, '#fff6dc');
  ctx.drawImage(PX.person('minhao', 'run', Math.floor(dist / 7) % 6), 60, GY - PX.SH + 1);
  ctx.drawImage(PX.rider('xiaomei', Math.floor(t / 70) % 4), 110, GY - PX.SH + 1);
}

/* 카카오톡 등 앱 안 브라우저 안내 */
if (/KAKAOTALK|Instagram|FBAN|FBAV|NAVER\(inapp/i.test(navigator.userAgent || '')) setTimeout(() => toast('소리가 안 나면 크롬·사파리에서 열어 주세요'), 1500);
window.__cr = { get save() { return save; }, get R() { return R; }, get LD() { return LD; }, get screen() { return screen; }, openCase, startRun, startLadder, mapScreen, doJump, doSlide, meeting };
fit(); titleScreen(); requestAnimationFrame(loop);
