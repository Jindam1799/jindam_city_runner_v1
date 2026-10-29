/* 진담 도시 탐정 런 — 게임 본체 (교재 1권 「중국 도시 미스터리 파일」 과제용)
   지도 → 편지(수상한 질문) → 친구 대화 → 달리기(단서 10개 · 덩어리 관문 · 공유 자전거) → 결승 탑 덩어리 사다리 → 사건 해결 · 과제 확인증 */
const APP_VERSION = 'v0.14.0 (2026.10.29)';
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
let LAND = false, fitKey = '';
const QR = 1;            // 내부 해상도 배수 (2로 올리면 반 픽셀 스크롤, 대신 무거워짐)
function fit() {
  const app = $('#app'); DPR = window.devicePixelRatio || 1;
  fitKey = app.clientWidth + 'x' + app.clientHeight + '@' + DPR;
  LAND = app.clientWidth > app.clientHeight;
  if (LAND) {
    const cssW = app.clientWidth, cssH = app.clientHeight;
    S = cssH * DPR / H;                         // 화면 높이에 딱 맞춤 (가로 화면)
    W = Math.max(260, Math.ceil(cssW * DPR / S));
  } else {
    const cssW = Math.min(app.clientWidth, 560);
    S = Math.max(1, Math.round(cssW * DPR / 300));
    W = Math.max(220, Math.floor(cssW * DPR / S));
  }
  cv.width = W * QR; cv.height = H * QR; ctx.setTransform(QR, 0, 0, QR, 0, 0); ctx.imageSmoothingEnabled = false;
  const cw = W * S / DPR, ch = H * S / DPR;
  cv.style.width = ov.style.width = cw + 'px'; cv.style.height = ov.style.height = ch + 'px';
  skyC = null;
}
window.addEventListener('resize', () => { fit(); if (LD) LD.scene = ART.towerScene(LD.cs.theme, W, viewCX()); ov._k = null; });
/* 가로 화면에서 오른쪽 패널에 가리지 않는 가운데 */
const viewCX = () => LAND && pad.innerHTML && !/pad-(run|title)/.test(pad.className) ? Math.round(W * .31) : Math.round(W / 2);
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
const PL = () => save.look || 'det1';
const WHO = { teacher: ['진아쌤', 'teacher'], minhao: ['民浩 (무전)', 'minhao'], police: ['赵队长 (자오 반장)', 'police'], club: ['무음단 단원', 'club'] };
let enterHook = null, SPEAK = null, SHK = 0, SHKT = 0;
function shake(a = 4, t = .3) { SHK = Math.max(SHK, a); SHKT = Math.max(SHKT, t); }
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if ((e.key === 'Enter' || e.key === ' ') && enterHook) { e.preventDefault(); enterHook(); return; }
  if (screen === 'run') runKey(e, true);
  if (screen === 'mini') MINI.key(e, true);
});
document.addEventListener('keyup', e => { if (screen === 'run') runKey(e, false); if (screen === 'mini') MINI.key(e, false); });
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
    if (LAND && pad.innerHTML && !/pad-(run|title|mini)/.test(pad.className)) b.classList.add('side');
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
function go(s) { screen = s; ov.innerHTML = ''; ov._k = null; pad.innerHTML = ''; pad.className = s === 'mini' ? 'pad-run pad-mini' : 'pad-' + s; setTop(); }
function setTop() {
  if (screen === 'title') { topEl.innerHTML = ''; return; }
  const stamps = CASES.filter(c => save.cleared[c.no]).length;
  topEl.innerHTML = `<span class="badge">🔍 ${esc(save.name || '탐정')}</span><span class="grow">${screen === 'run' || screen === 'mini' ? '' : `도장 조각 ${stamps}/12`}</span>
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
const LOOKS = ['det1', 'det2', 'det3', 'det4'];
const LOOK_TAG = { det1: '남', det2: '남', det3: '여', det4: '여' };
function lookPicker() { return `<div class="looks">${LOOKS.map(k => `<button class="lk ${PL() === k ? 'on' : ''}" data-l="${k}"><img src="${PX.faceURL(k, 'happy')}"><span>${LOOK_TAG[k]}</span></button>`).join('')}</div>`; }
function bindLookPicker(c) { c.querySelectorAll('.lk').forEach(b => b.onclick = () => { save.look = b.dataset.l; persist(); c.querySelectorAll('.lk').forEach(x => x.classList.toggle('on', x === b)); Sound.sfx('sel'); }); }
async function prologue() {
  go('office'); Sound.bgm('map');
  await say(STORY.prologue);
  const c = card(`<h2>🕵️ 탐정 등록</h2><div class="small">교재 표지의 '탐정 이름'을 적고, 내 탐정 모습을 골라요.</div><input class="name" maxlength="8" placeholder="탐정 이름">
    ${lookPicker()}<div class="row"><button class="big go">등록하기</button></div>`);
  const inp = c.querySelector('input'); setTimeout(() => inp.focus(), 50); bindLookPicker(c);
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
  drawCast(t, save.intro ? [{ look: PL(), x: cx - 40, face: 1 }, { look: 'minhao', x: cx - 16, face: 1 }, { look: 'teacher', x: cx + 14, face: -1 }] : [{ look: 'minhao', x: cx - 22, face: 1 }, { look: 'teacher', x: cx + 14, face: -1 }]);
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
  if (screen === 'run') runPointer(e, 'down'); if (screen === 'mini') MINI.pointer(e, 'down');
});
cv.addEventListener('pointermove', e => {
  if (screen === 'map' && mapView.drag) { const d = mapView.drag, k = DPR / S; mapView.x = Math.max(0, Math.min(ART.MAP.W - W, d.vx - (e.clientX - d.x) * k)); mapView.y = Math.max(0, Math.min(ART.MAP.H - H, d.vy - (e.clientY - d.y) * k)); d.moved++; }
  if (screen === 'run') runPointer(e, 'move'); if (screen === 'mini') MINI.pointer(e, 'move');
});
cv.addEventListener('pointerup', e => {
  if (screen === 'map' && mapView.drag) {
    const d = mapView.drag; mapView.drag = null;
    if (d.moved < 4) { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W + mapView.x, y = (e.clientY - r.top) / r.height * H + mapView.y, m = ART.mapCanvas();
      const c = CITY_MAP.find(c => { const [cx, cy] = m.proj(c.lon, c.lat); return Math.hypot(cx - x, cy - y) < 12; });
      if (c) { const has = CASES.find(k => k.no === c.no); if (!has) return toast(`${c.zh}(${c.ko}) 사건은 준비 중이에요`); if (!unlocked(c.no)) return toast(`먼저 ${c.no - 1}과 사건을 해결해요`); openCase(c.no); } }
  }
  if (screen === 'run') runPointer(e, 'up'); if (screen === 'mini') MINI.pointer(e, 'up');
});

/* ───────── 사건 편지 → 출발 ───────── */
async function openCase(no) {
  cur = CASES.find(c => c.no === no);
  go('intro'); Sound.sfx('page');
  const c = card(`<div class="letter"><div class="stampTop">TOP SECRET · CASE ${String(no).padStart(2, '0')}</div>
    <div class="city">${esc(cur.city)} <small>${esc(cur.py)} · ${esc(cur.ko)}</small></div>
    ${zhBlock(cur.title.zh, cur.title.py, '', true)}<button class="mini" data-say="${esc(cur.title.zh)}">🔊</button>
    <div class="q">❓ ${esc(cur.title.ko)}</div>
    ${STORY.cases[no] ? `<div class="symptom">✉ ${esc(cur.friend.name)}의 편지 · ${esc(STORY.cases[no].symptom)}</div><div class="stolen">🕳 도둑맞은 말: <b>${esc(STORY.cases[no].stolen)}</b></div>` : ''}
    <div class="note">📁 사건 파일 · ${esc(cur.note)}</div>
    <div class="small">📚 교재 1권 ${no}과 과제 · 단서 추격 → 탑에서 외치기 → 검문소</div></div>
    <div class="row"><button class="big go">🚄 ${esc(cur.city)}로 출발!</button></div>`, 'lettercard');
  speak(cur.title.zh);
  await wait(c);
  await say([{ who: 'teacher', t: (STORY.cases[no] || {}).depart || '' }]);
  // 도착 장면 + 친구 대화 (교재 미니 대화)
  go('arrive'); Sound.bgm('talk'); arriveT = performance.now();
  const f = cur.friend;
  await sleep(Math.max(900, (viewCX() + 20) * 14 + 200));
  for (const [zh, py, ko, who] of cur.intro) await say([{ who: f.name, look: f.look, zh: [zh.replace(/民浩/g, save.name || '侦探'), py.replace(/Mínhào/g, save.name || 'zhēntàn'), ko.replace(/민호/g, save.name || '탐정')] }], who === 'me' ? { who: [`${save.name || '탐정'} (나)`, PL()] } : { who: [`${f.name} (${f.ko})`, f.look] });
  const sc = STORY.cases[no];
  if (sc) await say([{ zh: sc.tip, look: f.look }], { who: [`${f.name} (${f.ko})`, f.look] });
  await say([{ who: 'minhao', t: STORY.scene.run }]);
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
  if (screen === 'solved') return [{ look: PL(), x: cx - 24, face: 1, pose: 'cheer', f: Math.floor(t / 300) % 2 }, { look: f, x: cx + 8, face: -1, pose: 'cheer', f: Math.floor(t / 300 + 1) % 2 }];
  return [arrived ? { look: PL(), x: mx, face: 1 } : { look: PL(), x: mx, face: 1, pose: 'run', f: Math.floor(t / 90) % 6 },
    arrived ? { look: f, x: cx + 8, face: -1 } : { look: f, x: cx + 8, face: -1, pose: 'wave', f: Math.floor(t / 250) % 2 }];
}

/* ───────── 🏃 달리기 ───────── */
let THEME = null, R = null;
const PLAYER_X = 46, GRAV = 720, JUMP = 275, JUMP2 = 245, PH = 30, PH_SLIDE = 13;
/* 땅 높이: 평지 · 오르막 · 내리막 (꺾은선). zones = 미니게임 자리 (평지로 둬요) */
function makeTerrain(L, zones) {
  const pts = [[-200, 0], [320, 0]]; let x = 320, h = 0;
  const LV = { cq: [0, 14, 28, 42], cd: [0, 14], km: [0, 14, 28], heb: [0, 14, 28], hq: [0, 14] }[THEME && THEME.key] || [0, 14, 28, 42];
  const flatMin = 160 + Math.random() * 120, flatVar = 160 + Math.random() * 220;
  while (x < L + 400) {
    const nh = pick(LV.filter(v => v !== h && Math.abs(v - h) <= 28));
    const len = Math.abs(nh - h) * 3.2;
    if (zones.some(([a, b]) => b > x - 40 && a < x + len + 40) || x + len > L - 40) { x += 50; pts.push([x, h]); continue; }
    x += len; h = nh; pts.push([x, h]);
    x += flatMin + Math.random() * flatVar; pts.push([x, h]);
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
/* 발밑 바닥: 땅 또는 발판(아래에서는 통과, 위에서 내려오면 올라서요) */
function surf(fx, y = R.y) {
  let g = gh(fx), plat = null;
  for (const p of R.plats) { if (p.x > fx) break; if (fx < p.x || fx > p.x + p.w) continue; const top = p.base + p.h; if (top <= y + 7 && top > g) { g = top; plat = p; } }
  return { g, plat };
}
const TUNC = {};
function tunnelCanvas(w) {      // 낮은 빨랫줄·천막 (꾹 미끄러지기)
  const key = (THEME && THEME.key) + w; if (TUNC[key]) return TUNC[key];
  const [c, g] = PX.mk(w + 4, 66), cols = ['#e2504c', '#ffd36e', '#7fb2ec', '#7fd6a8', '#ff9ab3', '#fff6dc'], r = PX.rng(w * 7);
  PX.R(g, 0, 0, 3, 66, '#5a4a3a'); PX.R(g, w + 1, 0, 3, 66, '#5a4a3a'); PX.R(g, 0, 0, w + 4, 2, '#3b2a35');
  PX.R(g, 2, 30, w, 1, '#3b2a35');
  for (let x = 4; x < w - 6; x += 9 + ((r() * 4) | 0)) { const cw = 7 + ((r() * 3) | 0), ch = 10 + ((r() * 6) | 0), col = cols[(r() * cols.length) | 0]; PX.R(g, x, 31, cw, ch, col); PX.R(g, x, 31, cw, 2, '#ffffff55'); PX.R(g, x + 2, 30, 1, 2, '#2a1d24'); if (r() < .4) PX.R(g, x + 1, 31 + ch, cw - 2, 15 - ch + 31 > 46 ? 0 : Math.min(4, 46 - 31 - ch), col); }
  PX.R(g, 2, 44, w, 2, '#00000022');
  return TUNC[key] = PX.outline(c);
}
/* 발판 그림: 공사장 비계 (판자 + 기둥) */
const PLATC = {};
function platCanvas(w, h) {
  const key = (THEME && THEME.key) + w + '_' + h; if (PLATC[key]) return PLATC[key];
  const [c, g] = PX.mk(w + 2, h + 4), col = (THEME && THEME.col) || '#e2504c';
  const poles = w > 110 ? [3, (w / 2) | 0, w - 5] : [3, w - 5];
  poles.forEach(x => { PX.R(g, x, 6, 3, h - 2, '#5a4a5c'); PX.R(g, x, 6, 1, h - 2, '#8a7a8c'); });
  if (h > 30) for (let i = 0; i < poles.length - 1; i++) { PX.line(g, poles[i] + 2, 8, poles[i + 1], h - 2, '#6a5a6c', 1); }
  PX.R(g, 0, 0, w + 2, 8, '#2a1d24');
  for (let x = 1; x < w + 1; x += 2) { PX.R(g, x, 1, 2, 6, (x >> 1) % 5 ? '#b8804e' : '#8a5a30'); }
  PX.R(g, 1, 1, w, 1, '#f0c080'); PX.R(g, 1, 6, w, 1, '#6a4020');
  for (let x = 4; x < w - 6; x += 12) { PX.R(g, x, 3, 6, 2, (x / 12 | 0) % 2 ? col : '#ffd36e'); }
  return PLATC[key] = c;
}
const MINI_KINDS = ['flash', 'dodge', 'whack', 'radio', 'cards', 'balloon', 'spot'];   // + 📦 택배(덩어리 빈칸)는 판마다 꼭 나와요
/* 길 조각(세그먼트) 모음: 판마다 섞어서 이어 붙여요. 위 길(발판)·아래 길(장애물)을 골라 갈 수 있는 조각도 있어요 */
const SEGS = {
  hurdle: 3, duck: 2.2, pit: 1.4, roll: 1, bird: 1, tall: .8, tunnel: .9, wide: .7, triple: .6, jumpslide: .8, birds2: .5, rollpair: .4,
  stairs: 1.3, bridge: 1.4, skyhop: 1, highroad: .9, stones: .9, canopy: .9
};
const PLAT_SEGS = ['stairs', 'bridge', 'skyhop', 'highroad', 'stones', 'canopy'];
function buildLevel(cs, boss) {
  const L = boss ? 4500 : 4200, objs = [];
  R.plats = []; R.pits = [];
  // 1) 미니게임 자리 먼저 (판마다 위치를 살짝 흔들어요)
  const evN = boss ? 2 : 4;
  const evX = Array.from({ length: evN }, (_, i) => Math.round(L * (i + 1) / (evN + 1) + (Math.random() * 160 - 80)));
  const zones = evX.map(x => [x - 100, x + 100]);
  R.terr = makeTerrain(L, zones);
  const inZone = (a, b) => zones.some(([z0, z1]) => b > z0 && a < z1);
  const lows = THEME.low, highs = THEME.high;
  const addLow = (x, on = 0) => { const ob = pick(lows); objs.push({ k: 'obs', x, ob, high: false, on, w: ob.c.width - 4, h: ob.c.height - 2 }); };
  const addHigh = x => { const ob = pick(highs); objs.push({ k: 'obs', x, ob, high: true, w: ob.c.width - 4, h: ob.c.height - 2 }); };
  const addPit = (x, w, wide) => { R.pits.push({ x, w, wide }); objs.push({ k: 'pit', x, w, wide }); };
  const tunnel = (x, w, cap) => objs.push({ k: 'obs', x, tunnel: 1, high: true, w, h: 46, tc: tunnelCanvas(w), cap });
  const roll = x => objs.push({ k: 'obs', x, roll: 1, ob: THEME.roll, w: 16, h: 16 });
  const bird = (x, ph) => objs.push({ k: 'obs', x, bird: 1, ph, w: 14, h: 9 });
  const plat = (x, w, h) => { const p = { k: 'plat', x, w, h, base: gh(x), c: platCanvas(w, h) }; objs.push(p); R.plats.push(p); return p; };
  const spot = (x, hy) => objs.push({ k: 'clue2', x, hy });
  const rw = (a, b) => a + ((Math.random() * (b - a + 1)) | 0);
  // 각 조각: [길이, 평지 필요?, 놓기]
  const make = name => {
    switch (name) {
      case 'hurdle': return [30, 1, x => addLow(x)];
      case 'duck': return [30, 1, x => addHigh(x)];
      case 'pit': { const w = rw(30, 40); return [w, 1, x => addPit(x, w)]; }
      case 'roll': return [20, 0, x => roll(x)];
      case 'bird': return [20, 0, x => bird(x, Math.random() * 6)];
      case 'tall': return [24, 1, x => { objs.push({ k: 'obs', x, ob: THEME.tall, w: 18, h: 56, tall: 1 }); spot(x + 2, 84); }];
      case 'tunnel': { const w = rw(72, 112); return [w, 1, x => { tunnel(x, w); spot(x + w / 2 - 7, 2); }]; }
      case 'wide': { const w = rw(80, 90); return [w, 1, x => { addPit(x, w, 1); spot(x + w / 2 - 7, 78); }]; }
      case 'triple': return [140, 1, x => { addLow(x); addLow(x + 52); addLow(x + 104); }];
      case 'jumpslide': return [110, 1, x => { if (Math.random() < .5) { addLow(x); addHigh(x + 78); } else { addHigh(x); addLow(x + 82); } }];
      case 'birds2': return [75, 0, x => { bird(x, 0); bird(x + 55, 3); }];
      case 'rollpair': return [90, 0, x => { roll(x); roll(x + 70); }];
      // ── 위·아래 두 갈래 길 ──
      case 'stairs': return [200, 1, x => { plat(x, 46, 26); plat(x + 64, 46, 50); plat(x + 128, 64, 74); spot(x + 150, 86); addLow(x + 150); }];
      case 'bridge': { const w = rw(180, 230); return [w + 30, 1, x => { plat(x, w, 44); spot(x + w * .35, 56); spot(x + w * .7, 56); addPit(x + 40, 30); if (Math.random() < .5) roll(x + w * .6); else addLow(x + w * .62); spot(x + w * .45, 14); }]; }
      case 'skyhop': return [190, 1, x => { plat(x, 40, 34); plat(x + 75, 40, 60); plat(x + 150, 40, 34); spot(x + 88, 72); roll(x + 60); addLow(x + 130); }];
      case 'highroad': return [230, 1, x => { plat(x, 44, 40); plat(x + 70, 160, 78); spot(x + 120, 90); spot(x + 190, 90); addLow(x + 150, 78); tunnel(x + 90, 100, 66); spot(x + 132, 2); }];
      case 'stones': { const w = rw(120, 140); return [w, 1, x => { addPit(x, w, 1); plat(x + 22, 26, 22); plat(x + w - 50, 26, 30); spot(x + w / 2 - 7, 60); }]; }
      case 'canopy': return [200, 1, x => { plat(x, 180, 52); spot(x + 60, 64); spot(x + 130, 64); bird(x + 70, 0); bird(x + 125, 3); }];
    }
  };
  // 2) 판마다 다른 맛: 조각 비율을 랜덤으로
  const wts = {}; Object.keys(SEGS).forEach(k => wts[k] = SEGS[k] * (0.3 + Math.random() * 1.6));
  const wpick = (ban, easy) => { const ks = Object.keys(wts).filter(k => k !== ban && (!easy || !['triple', 'jumpslide', 'birds2', 'rollpair', 'highroad', 'stones', 'wide', 'tall'].includes(k))); let t = 0; ks.forEach(k => t += wts[k]); let r = Math.random() * t; for (const k of ks) { r -= wts[k]; if (r <= 0) return k; } return 'hurdle'; };
  const must = boss ? [] : shuffle(['tunnel', 'wide', pick(PLAT_SEGS), pick(PLAT_SEGS.filter(s => s !== 'stairs'))]);
  const gapBase = 95 + Math.random() * 45, gapVar = 60 + Math.random() * 70;
  let x = 170 + Math.random() * 120, last = null, n = 0;
  while (x < L - 120) {
    let name = n === 0 ? wpick(null, true) : (must.length && (Math.random() < .3 || x > L * .65)) ? must[0] : wpick(last);
    let [len, flat, put] = make(name);
    if (inZone(x - 30, x + len + 30)) { x = zones.find(([a, b]) => x + len + 30 > a && x - 30 < b)[1] + 40; continue; }
    if (flat && !flatAt(x - 10, len + 20)) { if (name === must[0]) { x += 40; continue; } name = pick(['roll', 'bird']); [len, flat, put] = make(name); }
    put(x); if (name === must[0]) must.shift(); last = name; n++;
    x += len + gapBase + Math.random() * gapVar + (PLAT_SEGS.includes(name) ? 40 : 0);
  }
  R.plats.sort((a, b) => a.x - b.x);
  // 3) 미니게임 표지판
  const kinds = boss ? ['parcel', 'parcel'] : shuffle(['parcel', ...shuffle(MINI_KINDS).slice(0, evN - 1)]);
  evX.forEach((ex, i) => objs.push({ k: 'event', x: ex, mg: kinds[i] }));
  if (boss) R.quizPool = shuffle(CASES.flatMap(c => c.quick.map(q => ({ q, c })))).slice(0, 8).map(({ q }) => ({ g: { quiz: 1, q: q[0], ko: q[2], ans: q[1], wrong: shuffle(CASES.flatMap(k => k.quick.map(x => x[1])).filter(a => a !== q[1])).slice(0, 2), py: '' } }));
  // 4) 빈 자리 찾기 (장애물·구멍·발판·이벤트에서 떨어진 곳) → 자전거 · 단서
  const busy = (a, b) => objs.some(o => o.k !== 'clue' && o.k !== 'clue2' && o.x - 36 < b && o.x + (o.w || 20) + 36 > a);
  const free = []; for (let fx = 260; fx < L - 80; fx += 16) if (!busy(fx - 6, fx + 20) && flatAt(fx - 10, 34)) free.push(fx);
  const takeFree = (near) => { if (!free.length) return null; let bi = 0; free.forEach((f, i) => { if (Math.abs(f - near) < Math.abs(free[bi] - near)) bi = i; }); const v = free[bi]; for (let i = free.length - 1; i >= 0; i--) if (Math.abs(free[i] - v) < 70) free.splice(i, 1); return v; };
  [.3, .68].forEach(f => { const bx = takeFree(f * L); if (bx != null) objs.push({ k: 'bike', x: bx, hy: 30 }); });
  if (!boss) {
    const order = shuffle(cs.clues.map((c, i) => i)).sort((a, b) => (save.weakClue[cs.no + ':' + b] ? 1 : 0) - (save.weakClue[cs.no + ':' + a] ? 1 : 0));
    const spots = objs.filter(o => o.k === 'clue2'), pickS = [];
    // 특별 자리(발판 위·터널 속·구멍 위)는 고르게 퍼지도록 최대 5개
    shuffle(spots).forEach(sp => { if (pickS.length < 5 && pickS.every(q => Math.abs(q.x - sp.x) > 120)) pickS.push(sp); });
    pickS.forEach(sp => { const ci = order.pop(); if (ci != null) objs.push({ k: 'clue', x: sp.x, hy: sp.hy, ci, special: 1 }); });
    const rest = order.length;
    order.forEach((ci, k) => { const want = 300 + (k + .5) * (L - 400) / rest; const cx = takeFree(want); if (cx == null) return; objs.push({ k: 'clue', x: cx, hy: pick([14, 14, 46, 46, 70]), ci }); });
  }
  for (let j = objs.length - 1; j >= 0; j--) if (objs[j].k === 'clue2') objs.splice(j, 1);
  objs.push({ k: 'goal', x: L + 40 });
  return objs.sort((a, b) => a.x - b.x);
}
function startRun(cs, boss = false) {
  go('run');
  const key = boss ? 'hq' : cs.theme; Sound.bgm(key);
  skyC = null; drawScene(key, 0); THEME.key = key; THEME.roll = ART.roller(key); THEME.tall = ART.tall(THEME.col);
  { const base = (Math.random() * 9999) | 0; THEME.vars = [0, 1, 2].map(k => { ART.setSeed(base + k * 131); const t = ART.THEMES[key](); return t.layers; }); ART.setSeed(0); THEME.vars[0] = THEME.layers; }
  { const d = THEME.ground.getContext('2d').getImageData(4, THEME.ground.height - 2, 1, 1).data; THEME.soil = `rgb(${d[0] * .72 | 0},${d[1] * .68 | 0},${d[2] * .7 | 0})`; THEME.soilD = `rgb(${d[0] * .55 | 0},${d[1] * .5 | 0},${d[2] * .55 | 0})`; }
  R = { cs, boss, dist: 0, speed: 82, objs: [], y: 0, vy: 0, ground: true, jumps: 0, slide: 0, hearts: 3, inv: 0, bike: 0, got: [], gates: [], fx: [], paused: false, t: 0, done: false, hurtT: 0, coy: 0, jbuf: 0, squash: 0, onPlat: null, plats: [], snow: [], terr: [[0, 0], [1, 0]], pits: [] };
  R.objs = buildLevel(cs, boss);
  R.total = R.objs.find(o => o.k === 'goal').x;
  buildGround();
  if (THEME.snow) for (let i = 0; i < 40; i++) R.snow.push([Math.random() * 400, Math.random() * H, .5 + Math.random()]);
  runPad(); setTop();
}
function runPad() {
  pad.innerHTML = `<div class="rtop"><div class="hudrun"><span id="hearts"></span><span id="clues"></span><span id="bikeT"></span></div>
    <div class="prog"><i id="progI"></i></div><div id="gq"></div><div id="msg"></div></div>
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
  if (R.ground || R.coy > 0) { R.vy = JUMP; R.ground = false; R.coy = 0; R.jumps = 1; R.slide = 0; R.onPlat = null; Sound.sfx('jump'); }
  else if (R.jumps === 0) { R.vy = JUMP2; R.jumps = 2; Sound.sfx('jump2'); }
  else if (R.jumps >= 2) R.jbuf = .14;
  else if (R.jumps === 1) { R.vy = JUMP2; R.jumps = 2; Sound.sfx('jump2'); puff(PLAYER_X + 8, GY - R.y, '#ffffff'); }
}
function doSlide(on) { if (!R || R.paused) return; R.slideHold = !!on; if (on && R.ground) { if (R.slide <= 0) Sound.sfx('slide'); R.slide = Math.max(R.slide, .45); } else if (on && !R.ground) R.vy = -320; }
let swipe = null;
function runPointer(e, k) {
  if (k === 'down') { swipe = { y: e.clientY, t: performance.now(), done: false }; return; }
  if (k === 'move' && swipe && !swipe.done && e.clientY - swipe.y > 30) { swipe.done = true; doSlide(true); setTimeout(() => doSlide(false), 550); return; }
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
  R.hearts--; R.inv = 1.3; R.hurtT = .5; shake(5, .3); Sound.sfx('hurt'); puff(PLAYER_X + 10, GY - R.y - 15, '#ff8a7a'); updRunHud();
  if (R.hearts <= 0) { failRun(); return true; } return false;
}
function updateRun(dt) {
  if (!R || R.paused || R.done || uiRoot.querySelector('.card,.box')) return;
  R.t += dt;
  const fx0 = footX(), slope = R.onPlat ? 0 : (gh(fx0 + 6) - gh(fx0 - 6)) / 12;
  const sp = (R.speed + Math.min(28, R.t * .9)) * (R.bike > 0 ? 1.7 : 1) * (R.ground ? Math.max(.75, Math.min(1.25, 1 - slope * .9)) : 1);
  R.dist += sp * dt;
  // 몸 + 땅 (오르막·내리막·구멍·발판)
  const fx = footX(), S = surf(fx), pit = S.plat ? null : pitAt(fx), G = pit ? -999 : S.g;
  if (R.coy > 0) R.coy -= dt; if (R.jbuf > 0) R.jbuf -= dt;
  if (R.ground) {
    if (pit) { R.ground = false; R.vy = 0; R.coy = .09; }
    else if (G >= R.y || R.y - G < 7) { R.y = G; R.onPlat = S.plat; } else { R.ground = false; R.vy = 0; R.coy = .09; R.onPlat = null; }
  }
  if (!R.ground) {
    R.vy -= GRAV * dt; R.y += R.vy * dt;
    if (!pit && R.y <= G && R.vy <= 0) {
      if (R.vy < -120) { Sound.sfx('land'); R.squash = .12; }
      R.y = G; R.vy = 0; R.ground = true; R.jumps = 0; R.onPlat = S.plat; puff(PLAYER_X + 8, GY - G, '#d8c8b8');
      if (R.jbuf > 0) { R.jbuf = 0; doJump(); }        // 착지 직전에 누른 점프도 살려 줘요
    }
    if (pit && R.y < gh(pit.x) - 20) {          // 구멍에 빠짐 → 하트 -1, 판자를 깔고 튀어 오름
      pit.filled = true; if (R.groundG) paintGround(pit.x - 4, pit.x + pit.w + 4); R.vy = 300; R.jumps = 2; Sound.sfx('pit'); toast('앗! 구멍은 점프로 넘어요');
      if (hurt()) return;
    }
  }
  if (R.squash > 0) R.squash -= dt;
  if (R.slideHold && R.ground) R.slide = Math.max(R.slide, .12);
  if (R.slide > 0) R.slide -= dt;
  if (R.inv > 0) R.inv -= dt; if (R.hurtT > 0) R.hurtT -= dt;
  if (R.bike > 0) { R.bike -= dt; if (R.bike <= 0) { toast('🚲 자전거를 세워 두었어요'); } }
  const ph = R.slide > 0 ? PH_SLIDE : PH, px0 = PLAYER_X + 4, px1 = PLAYER_X + 18;
  R.hint = R.hint || {};
  for (const o of R.objs) { const dx = o.x - R.dist - PLAYER_X; if (dx > 170) break; if (dx < 60) continue;
    const k = o.k === 'plat' ? 'plat' : o.tunnel ? 'tunnel' : (o.k === 'pit' && o.wide) ? 'wide' : o.tall ? 'tall' : null;
    if (k && !R.hint[k]) { R.hint[k] = 1; msg({ plat: '⤒ 위 발판으로 올라가면 단서가 있어요! 아래 길로 가도 돼요', tunnel: '⤓ 낮은 빨랫줄! 미끄러지기 버튼을 <b>꾹</b> 누르고 지나가요', wide: '⤒⤒ 넓은 구멍! 점프를 <b>두 번</b> 눌러요', tall: '⤒⤒ 높은 상자! 공중에서 한 번 더 점프!' }[k], 'bike', 2200); } }
  for (const o of R.objs) {
    const sx = o.x - R.dist; if (sx > W + 60) break; if (sx + (o.w || 0) < -60 || o.gone) continue;
    if (o.k === 'obs') {
      if (o.roll && sx < W + 10) o.x -= 48 * dt;
      if (o.bird && sx < W + 10) o.x -= 34 * dt;
      const ox0 = sx + 2, ox1 = sx + o.w;
      if (ox1 < px0 || ox0 > px1) continue;
      const base = gh(o.x + o.w / 2) + (o.on || 0), rel = R.y - base;
      let hit;
      if (o.high) hit = rel + ph > 18 && (o.cap == null || rel < o.cap);
      else if (o.bird) { const by = birdY(o); hit = rel < by + o.h - 1 && rel + ph > by + 1; }
      else hit = rel < o.h - 4;
      if (hit) {
        if (R.bike > 0) { o.gone = true; puff(sx + o.w / 2, GY - base - o.h / 2, '#ffe08a'); Sound.sfx('smash'); continue; }
        if (hurt()) return;
      }
    } else if (o.k === 'clue') {
      const base = gh(o.x), mag = R.bike > 0 ? 40 : 0; const cx = sx + 7, cy = GY - base - o.hy + 7, py = GY - R.y - ph / 2;
      if (mag && Math.abs(cx - (PLAYER_X + 11)) < mag + 20) { o.x -= (cx - (PLAYER_X + 11)) * dt * 6; o.hy -= (py - cy) * dt * 6; }
      if (cx > px0 - 6 && cx < px1 + 6 && Math.abs(cy - py) < ph / 2 + 10) { o.gone = true; collectClue(o); }
    } else if (o.k === 'bike') {
      const by = GY - gh(o.x) - o.hy;
      if (sx + 20 > px0 && sx < px1 && GY - R.y - ph < by + 14 && GY - R.y > by) { o.gone = true; R.bike = 6; Sound.sfx('bike'); bikeCard(); }
    } else if (o.k === 'event' && !o.done && sx < PLAYER_X) { o.done = true; say([{ who: 'minhao', t: STORY.scene[o.mg] }]).then(() => MINI.start(o.mg, R.cs, R)); return;
    } else if (o.k === 'goal' && sx < PLAYER_X) { R.done = true; return finishRun(); }
  }
  R.fx.forEach(f => { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 140 * dt; f.life -= dt; }); R.fx = R.fx.filter(f => f.life > 0);
  if (Math.floor(R.t * 4) !== R._h) { R._h = Math.floor(R.t * 4); updRunHud(); }
}
const birdY = o => 12 + 12 * (1 + Math.sin(R.t * 2.6 + o.ph));
function collectClue(o) {
  const c = R.cs.clues[o.ci]; R.got.push(o.ci); delete save.weakClue[R.cs.no + ':' + o.ci]; persist();
  Sound.sfx('clue'); speak(c[0]); puff(PLAYER_X + 12, GY - R.y - 20, '#ffe08a');
  msg(`🔍 <b>${esc(c[0])}</b>${set.py ? ` <span>${esc(c[1])}</span>` : ''}${set.ko ? ` · ${esc(c[2])}` : ''}${c[3] ? ` <i>HSK${c[3]}</i>` : ''}`, 'clue', 1700);
  updRunHud();
}
function bikeCard() {
  msg(`🚲 <b>共享单车</b>${set.py ? ' <span>gòngxiǎng dānchē</span>' : ''}${set.ko ? ' · 공유 자전거! 6초 동안 씽씽' : ''}`, 'bike', 2200); speak('共享单车');
}
/* 메시지: 게임 화면을 가리지 않는 자리 (세로 = 화면 아래 칸, 가로 = 맨 위 띠) */
let msgT = 0;
function msg(html, cls = '', ms = 1600) {
  const m = $('#msg'); if (!m) return;
  m.className = 'on ' + cls; m.innerHTML = html; clearTimeout(msgT);
  msgT = setTimeout(() => { m.className = ''; m.innerHTML = ''; }, ms);
}
function flash(t, py, cls) { msg(`${esc(t)}${py && set.py ? ` <span>${esc(py)}</span>` : ''}`, cls, 1800); }
async function failRun() {
  R.done = true; Sound.sfx('hurt'); Sound.bgm('fail');
  const c = card(`<h2>😵 앗, 넘어졌어요!</h2><div class="small">괜찮아요! 다시 달리면 돼요. 모은 단서 ${R.got.length}개는 기억해 둘게요.</div><div class="row"><button class="big go">🔁 다시 달리기</button></div><div class="row"><button class="btn mp">지도로</button></div>`);
  c.querySelector('.mp').onclick = () => { c.close(); mapScreen(); };
  await wait(c); startRun(R.cs, R.boss);
}
/* 땅은 판이 시작할 때 한 번만 길게 그려 두고, 매 프레임에는 보이는 부분만 복사해요 (모바일 성능) */
const G_TOP = GY - 52, G_X0 = -120, G_CH = 1024;
function paintGround(x0, x1) {
  const gc = THEME.ground, gH = gc.height;
  x0 = Math.max(G_X0, Math.floor(x0)); x1 = Math.min(R.gEnd, Math.ceil(x1));
  for (let wx = x0; wx < x1; wx++) {
    const lx = wx - G_X0, ci = (lx / G_CH) | 0, g = R.gChunks[ci][1], x = lx - ci * G_CH;
    g.clearRect(x, 0, 1, H - G_TOP);
    const h = Math.round(gh(wx)), p = R.pits.find(q => wx >= q.x && wx < q.x + q.w), y = GY - h - G_TOP;
    if (p && !p.filled) { const e = wx - p.x < 2 || p.x + p.w - wx <= 2; g.fillStyle = e ? THEME.soilD : '#140c18'; g.fillRect(x, y + (e ? 0 : 3), 1, H); if (!e) { g.fillStyle = '#2a1d2e'; g.fillRect(x, y, 1, 3); } continue; }
    const sx = ((wx % ART.LW) + ART.LW) % ART.LW;
    g.drawImage(gc, sx, 0, 1, gH, x, y, 1, gH);
    if (h > 0) { g.fillStyle = THEME.soil; g.fillRect(x, y + gH, 1, h); if ((wx + h) % 7 === 0) { g.fillStyle = THEME.soilD; g.fillRect(x, y + gH + 3, 1, 2); } }
    if (p && p.filled) { g.fillStyle = (wx % 6 === 0) ? '#6a4028' : '#a8743e'; g.fillRect(x, y, 1, 3); }
    const d = gh(wx + 1) - gh(wx - 1); if (Math.abs(d) > .1) { g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(x, y + 2, 1, gH - 2); }
  }
}
function buildGround() {
  R.gEnd = Math.ceil(R.total + 700); const n = Math.ceil((R.gEnd - G_X0) / G_CH);
  R.gChunks = Array.from({ length: n }, () => PX.mk(G_CH, H - G_TOP));
  paintGround(G_X0, R.gEnd); R.groundG = true;
}
function drawGround() {
  if (!R.gChunks) buildGround();
  const lx = Math.round(R.dist) - G_X0, ci = Math.max(0, (lx / G_CH) | 0), off = lx - ci * G_CH;
  for (let k = 0, dx = -off; dx < W && ci + k < R.gChunks.length; k++, dx += G_CH) ctx.drawImage(R.gChunks[ci + k][0], dx, G_TOP);
}
function drawRun(t) {
  if (!skyC) { const [c, g] = PX.mk(W, H); THEME.sky(g); skyC = c; }
  ctx.drawImage(skyC, 0, 0);
  const realDist = R.dist, camI = Math.floor(realDist), camF = Math.round((realDist - camI) * QR) / QR;
  R.dist = camI; ctx.save(); ctx.translate(-camF, 0);
  THEME.layers.forEach((L, i) => { const sc = R.dist * L.s, off = Math.floor(sc) % ART.LW, base = Math.floor(sc / ART.LW); let k = 0; for (let x = -off; x < W; x += ART.LW, k++) { const v = THEME.vars ? THEME.vars[(((base + k) * 7 + i) % 3 + 3) % 3][i] : L; ctx.drawImage((v || L).c, x, 0); } });
  if (THEME.name === '重庆') { const tx = ((t / 1000 * 60 - R.dist * .2) % 900 + 900) % 900 - 200; PX.R(ctx, tx, 104, 58, 9, '#2a1d24'); PX.R(ctx, tx + 1, 105, 56, 7, '#e2504c'); for (let i = 0; i < 6; i++) PX.R(ctx, tx + 4 + i * 9, 106, 6, 3, '#fff6dc'); PX.R(ctx, tx + 1, 111, 56, 1, '#a8332f'); }
  drawGround();
  for (const o of R.objs) {
    const sx = Math.round(o.x - R.dist); if (sx > W + 60) break; if (sx + (o.w || 0) < -60 || o.gone) continue;
    if (o.k === 'plat') { ctx.drawImage(o.c, sx, Math.round(GY - o.base - o.h)); continue; }
    if (o.k === 'obs') {
      const base = Math.round(gh(o.x + o.w / 2) + (o.on || 0));
      if (o.roll) ctx.drawImage(o.ob.fr[((Math.floor(o.x / 4) % 4) + 4) % 4], sx, GY - base - 17);
      else if (o.bird) ctx.drawImage(PX.flip(ART.BIRD[Math.floor(t / 140) % 2]), sx, Math.round(GY - base - birdY(o) - o.h - 1));
      else if (o.tunnel) ctx.drawImage(o.tc, sx, GY - base - 18 - 46 + 1 - 2);
      else ctx.drawImage(o.ob.c, sx, o.high ? GY - base - 18 - o.ob.c.height : GY - base - o.ob.c.height + 1);
    }
    else if (o.k === 'pit' && o.wide) { const b = Math.round(gh(o.x)); PX.R(ctx, sx - 12, GY - b - 26, 2, 26, '#3b2a35'); PX.R(ctx, sx - 20, GY - b - 34, 18, 10, '#2a1d24'); PX.R(ctx, sx - 19, GY - b - 33, 16, 8, '#ffd36e'); PX.text(ctx, '⤒⤒', sx - 18, GY - b - 35, 7, '#c0392b'); }
    else if (o.k === 'clue') { const y = GY - gh(o.x) - o.hy, b = Math.round(Math.sin(t / 180 + o.x) * 1.5); ctx.drawImage(ART.ITEM.clue, sx, Math.round(y) + b); if ((t / 120 | 0) % 6 === 0) PX.P(ctx, sx + 2, y + b, '#fff'); }
    else if (o.k === 'bike') { const y = Math.round(GY - gh(o.x) - o.hy); ctx.drawImage(ART.ITEM.bike, sx, y + Math.round(Math.sin(t / 200) * 1.5)); PX.R(ctx, sx + 6, y - 6, 10, 5, '#2a1d24'); PX.R(ctx, sx + 7, y - 5, 8, 3, '#f2b631'); }
    else if (o.k === 'event' && !o.done) { const b = Math.round(gh(o.x)), y = GY - b; PX.R(ctx, sx + 7, y - 30, 2, 30, '#3b2a35'); for (let k = 0; k < 9; k++) PX.R(ctx, sx + 8 - k, y - 44 + k * 1.5, k * 2 + 1, 2, '#2a1d24'); for (let k = 1; k < 8; k++) PX.R(ctx, sx + 8 - k + 1, y - 42 + k * 1.5, k * 2 - 1, 2, '#ffd36e'); PX.text(ctx, '!', sx + 6, y - 40, 8, '#c0392b'); const lb = { dodge: ['落物', '#c0392b'], flash: ['停电', '#3a3048'], subway: ['地铁', '#4f8fdc'], whack: ['小偷', '#2a2436'], radio: ['广播', '#9b59b6'], safe: ['密码', '#5a6a8a'], cards: ['暗号', '#3f8250'], balloon: ['气球', '#ff8a3d'], connect: ['搭配', '#4f8fdc'], maze: ['迷宫', '#2a3048'], slide: ['拼图', '#9b59b6'], spot: ['找不同', '#3f8250'], parcel: ['快递', '#d0702a'] }[o.mg] || ['!', '#c0392b']; PX.R(ctx, sx - 4, y - 28, 24, 9, lb[1]); PX.text(ctx, lb[0], sx - 3, y - 29, 8, '#fff6dc'); } else if (o.k === 'goal') { const b = Math.round(gh(o.x)); PX.R(ctx, sx, GY - b - 60, 3, 60, '#3b2a35'); PX.R(ctx, sx + 3, GY - b - 60, 20, 12, '#e2504c'); PX.R(ctx, sx + 5, GY - b - 58, 16, 8, '#fff'); PX.text(ctx, '终点', sx + 5, GY - b - 59, 7, '#e2504c'); }
  }
  if (!R.boss && R.t < 4) { const gxp = Math.round(PLAYER_X + 70 + R.t * 70), gb = gh(R.dist + gxp + 11); ctx.drawImage(PX.person('club', 'run', Math.floor(t / 80) % 6), gxp, Math.round(GY - gb - PX.SH + 1)); if (R.t < 2.4) { PX.R(ctx, gxp - 4, GY - gb - 56, 34, 17, '#1d1424'); PX.R(ctx, gxp - 3, GY - gb - 55, 32, 15, '#fff'); PX.R(ctx, gxp + 8, GY - gb - 39, 3, 3, '#1d1424'); PX.text(ctx, '嘘…', gxp, GY - gb - 57, 13, '#5a4a6c', "'Noto Sans SC', sans-serif", 900); } }
  ctx.restore(); R.dist = realDist;
  const blink = R.inv > 0 && Math.floor(t / 80) % 2;
  if (!blink) {
    let im;
    if (R.bike > 0) im = PX.rider(PL(), Math.floor(t / 70) % 4);
    else if (R.hurtT > 0) im = PX.person(PL(), 'hurt');
    else if (R.slide > 0) im = PX.person(PL(), 'slide');
    else if (!R.ground) im = PX.person(PL(), R.vy > 0 ? 'jump' : 'fall');
    else im = PX.person(PL(), 'run', Math.floor(R.dist / 7) % 6);
    const py = Math.round(GY - R.y - PX.SH + 1);
    if (R.squash > 0 && R.bike <= 0) ctx.drawImage(im, PLAYER_X - 1, py + 3, im.width + 2, im.height - 3);   // 착지 찌그러짐
    else ctx.drawImage(im, PLAYER_X - (R.bike > 0 ? 4 : 0), py);
    if (R.bike > 0) for (let i = 0; i < 3; i++) PX.R(ctx, PLAYER_X - 10 - i * 6 - (t / 30 % 6), GY - R.y - 10 - i * 4, 5, 1, '#ffffffaa');
  }
  if (!R.ground) { const G = Math.max(0, surf(footX()).g); PX.ellipse(ctx, PLAYER_X + 12, GY - G + 2, Math.max(3, 8 - (R.y - G) / 12), 1, 'rgba(0,0,0,.18)'); }
  R.fx.forEach(f => PX.R(ctx, f.x, f.y, 2, 2, f.col));
  if (R.snow.length) R.snow.forEach(s => { s[0] -= (20 + s[2] * 20) * .016 + (R.bike > 0 ? 3 : 1); s[1] += s[2] * .6; if (s[1] > H) s[1] = 0; if (s[0] < 0) s[0] += W + 40; PX.R(ctx, s[0], s[1], s[2] > 1 ? 2 : 1, s[2] > 1 ? 2 : 1, '#ffffff'); });
}

/* ───────── 🪜 결승 탑: 덩어리 사다리 ───────── */
let LD = null;
function finishRun() {
  Sound.sfx('page');
  if (R.boss) return meetingEnd();
  startLadder(R.cs, R);
}
function startLadder(cs, run) {
  go('ladder'); Sound.bgm('ladder');
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
  if (first) say([{ who: 'minhao', t: STORY.scene.ladder + ' 조각을 순서대로 눌러 문장을 만들면 한 층씩 올라가!' }]).then(() => { LD.t0 = performance.now(); LD.waiting = false; });
}
async function tapTile(b) {
  if (LD.done || b.classList.contains('used')) return;
  const st = LD.cs.ladder[LD.step], need = st.t[LD.pos];
  if (b.dataset.t === need) {
    b.classList.add('used'); Sound.sfx('tile');
    const sl = pad.querySelectorAll('.slot')[LD.pos]; sl.textContent = need; sl.classList.add('on');
    pad.querySelectorAll('.tile.hint').forEach(x => x.classList.remove('hint'));
    LD.pos++;
    if (LD.pos < st.t.length) return;
    LD.done = true;
    const sec = (performance.now() - LD.t0) / 1000, ans = st.t.join('');
    Sound.sfx('climb'); speak(ans);
    if (LD.stepMiss === 0 && sec < LD.limit) { LD.tuk++; floatPad('툭! ⚡'); Sound.sfx('tuk'); }
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
  const im = LD.cheer ? PX.person(PL(), 'cheer', Math.floor(t / 300) % 2) : climbing ? PX.person(PL(), 'climb', Math.floor(t / 120) % 2) : PX.person(PL(), 'stand');
  ctx.drawImage(im, tx - 30 + (LD.cheer ? 34 : 0), Math.round(fy - PX.SH + 1 - (LD.cheer ? 2 : 0)));
  // 사다리
  for (let y = GY; y > GY - 6 * 23 - 4; y -= 4) PX.R(ctx, tx - 22, y, 10, 1, '#c99252');
  PX.R(ctx, tx - 23, GY - 142, 1, 142, '#8a5a30'); PX.R(ctx, tx - 12, GY - 142, 1, 142, '#8a5a30');
  if (LD.cheer) for (let i = 0; i < 12; i++) { const a = t / 300 + i; PX.R(ctx, W / 2 + Math.cos(a) * (20 + i * 3), 40 + Math.sin(a * 1.3) * 20 + i * 2, 2, 2, ['#e2504c', '#ffd36e', '#7fd6a8', '#7fb2ec'][i % 4]); }
}
async function ladderTop() {
  LD.cheer = 1; Sound.bgm('win'); Sound.sfx('cheer');
  const last = LD.cs.ladder[5].t.join('');
  pad.innerHTML = `<div class="panel center"><div class="ptitle">🏆 꼭대기에서 사건의 진실을 외쳐요!</div>${zhBlock(last, '', LD.cs.ladder[5].ko)}<button class="big go">🔊 다 같이 외치기</button></div>`;
  speak(last);
  await new Promise(res => pad.querySelector('.go').onclick = () => { speak(last); res(); });
  await sleep(600);
  const sc = STORY.cases[LD.cs.no], f = LD.cs.friend;
  if (sc) await say([{ t: '✨ ' + sc.back, look: f.look }], { who: [`${f.name} (${f.ko})`, f.look] });
  if (SPEC[LD.cs.no]) { await say([{ who: 'minhao', t: STORY.scene.escaped }]); startCheck(LD.cs); } else caseSolved();
}

/* ───────── 🛂 검문소: 통행증 검사 (페이퍼즈 플리즈 느낌) ───────── */
let CK = null;
const vz = x => (x || '').split('|')[0], vk = x => (x || '').split('|')[1] || '';
async function startCheck(cs, retry) {
  go('check'); Sound.bgm('check');
  const prev = CK && CK.cs === cs ? CK : null;
  const S = makeShift(cs.no);
  CK = { cs, S, data: { people: S.ppl }, i: -1, ok: 0, warn: prev ? prev.warn : 0, tries: prev && retry ? prev.tries + 1 : 1, badge: 3, walk: 0, out: 0, outDir: 1, bg: null, t0: 0, clock: 0, asked: 0 };
  { const th = ART.THEMES[cs.theme](), [c, g] = PX.mk(W, H); th.sky(g); g.drawImage(th.layers[0].c, 0, 0); if (th.layers[1]) g.drawImage(th.layers[1].c, 0, 0); CK.bg = c; }
  if (!retry) {
    await say(STORY.check.intro.map(l => ({ ...l })));
    await say([{ who: 'police', t: '오늘은 8명이야. 서류는 두 장: 🪪 통행증과 🎫 차표. 그리고 ❓ 질문 버튼으로 직접 중국어로 물어봐. 대답이 서류랑 다르면 거짓말이야!' },
      { who: 'police', t: '★ 특별 질문도 있어. 무음단은 훔친 말을 못 하니까, 그 말이 나오는 질문을 하면 "那个……" 하고 얼버무릴 거야.' }]);
  } else await say([{ who: 'police', t: '다시 해 보자, 탐정! 이번엔 사람들이 새로 줄을 섰어. 서류 두 장과 대답을 하나하나 비교해 봐.' }]);
  CK.t0 = performance.now();
  nextSuspect();
}
const badgeHTML = () => `<span class="badges">${'🛡'.repeat(CK.badge)}<i>${'🛡'.repeat(3 - CK.badge)}</i></span>`;
const fmtClock = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function personSay(p, zh, ko, mood) {
  const tl = pad.querySelector('.talk');
  if (tl) { tl.dataset.say = zh; tl.innerHTML = `💬 <span class="zh">${esc(zh)}</span> 🔊${set.ko ? `<small>${esc(ko)}</small>` : ''}`; tl.classList.remove('flash'); void tl.offsetWidth; tl.classList.add('flash'); }
  speak(zh);
  SPEAK = { look: CK.lk, mood: mood || (/[！!]/.test(zh) ? 'happy' : 'ok'), emo: /那个/.test(zh) ? '?' : /[！!]/.test(zh) ? '!' : '', t0: performance.now(), dur: 900 + zh.length * 110 };
}
function nextSuspect() {
  CK.i++;
  if (CK.i >= CK.S.ppl.length) return checkEnd();
  const S = CK.S, sp = S.sp, p = S.ppl[CK.i];
  CK.lk = shiftLook(CK.cs.no, CK.i, p); CK.walk = performance.now(); CK.out = 0; CK.done = false; CK.asked = 0;
  [0, 180, 360].forEach(d => setTimeout(() => Sound.sfx('step'), d));
  const docRows = [[sp.main.key, sp.main.label, p.doc[sp.main.key]]].concat(Object.entries(sp.fields).map(([k, f]) => [k, f.label, p.doc[k]]))
    .map(([k, lab, v]) => `<div class="drow"><span>${esc(k)}<small>${esc(lab)}</small></span><b>${esc(vz(v))}${set.ko ? `<small>${esc(vk(v))}</small>` : ''}</b></div>`).join('');
  const tk = p.ticket;
  pad.innerHTML = `<div class="panel ck ck2">
    <div class="ptitle">🛂 ${CK.i + 1} / ${S.ppl.length} <span class="clock" id="ckClock">⏱ 0:00</span> ${badgeHTML()}</div>
    <details class="rulebook" ${CK.i === 0 ? 'open' : ''}><summary class="rh">📒 오늘의 규칙 (5)</summary>${S.rules.map(r => `<div class="rule" data-say="${esc(r[0])}">• <span class="zh">${esc(r[0])}</span>${set.ko ? `<small>${esc(r[2])}</small>` : ''}</div>`).join('')}</details>
    <div class="docs2">
      <div class="pass"><div class="ph">🪪 通行证</div><div class="drow"><span>姓名<small>이름</small></span><b>${esc(p.n)}</b></div>${docRows}<div class="stampmark"></div></div>
      <div class="pass tk"><div class="ph">🎫 车票</div><div class="drow"><span>姓名<small>이름</small></span><b>${esc(p.n)}</b></div><div class="drow"><span>到<small>목적지</small></span><b>${esc(vz(tk.到))}${set.ko ? `<small>${esc(vk(tk.到))}</small>` : ''}</b></div><div class="drow"><span>日期<small>날짜</small></span><b>${esc(vz(tk.日期))}${set.ko ? `<small>${esc(vk(tk.日期))}</small>` : ''}</b></div><div class="today">오늘: ${TODAY.zh} (${TODAY.ko})</div></div>
    </div>
    <div class="clues3"><div class="cl"><i>👀 생김새</i><b>${esc(vz(p.wear))}</b>${set.ko ? `<small>${esc(vk(p.wear))}</small>` : ''}</div><button class="cl bagb"><i>🎒 가방 검사</i><b>열어 보기</b></button></div>
    <div class="talk" data-say="">💬 …</div>
    <div class="qbtns">${sp.qs.map((q, k) => `<button class="qb" data-q="${k}">❓ <span class="zh">${esc(q.q[0])}</span>${set.ko ? `<small>${esc(q.q[2])}</small>` : ''}</button>`).join('')}<button class="qb sp" data-q="sp">★ <span class="zh">${esc(sp.special.q[0])}</span>${set.ko ? `<small>${esc(sp.special.q[2])}</small>` : ''}</button></div>
    <div class="stamps"><button class="stamp ok" data-v="1">✅ 通过<small>통과</small></button><button class="stamp no" data-v="0">🚨 可疑<small>수상해요</small></button></div>
    <div class="verdict"></div></div>`;
  pad.querySelectorAll('[data-say]').forEach(d => d.onclick = () => d.dataset.say && speak(d.dataset.say));
  pad.querySelector('.talk').onclick = e => { const t = e.currentTarget.dataset.say; if (t) speak(t); };
  pad.querySelectorAll('.stamp').forEach(b => b.onclick = () => judge(+b.dataset.v));
  pad.querySelectorAll('.qb').forEach(b => b.onclick = () => ask(b.dataset.q, b));
  const bb = pad.querySelector('.bagb'); bb.onclick = () => { Sound.sfx('paper'); bb.classList.add('open'); bb.innerHTML = `<i>🎒 가방 안</i>${p.bag.map(x => `<b data-say="${esc(vz(x))}">${esc(vz(x))}${set.ko ? `<small>${esc(vk(x))}</small>` : ''}</b>`).join('')}`; bb.querySelectorAll('[data-say]').forEach(d => d.onclick = e => { e.stopPropagation(); speak(d.dataset.say); }); bb.onclick = null; };
  pad.scrollTop = 0;
  setTimeout(() => { if (CK && !CK.done && CK.S.ppl[CK.i] === p) { Sound.sfx('paper'); personSay(p, pick(['你好！这是我的通行证和车票。', '你好！给你。', '您好！请看。']), '안녕하세요! 여기 서류요.'); } }, 750);
}
function ask(k, b) {
  if (!CK || CK.done) return;
  const sp = CK.S.sp, p = CK.S.ppl[CK.i];
  Sound.sfx('tile'); b.classList.add('used'); CK.asked++;
  if (k === 'sp') { const ans = p.role === 'boss' ? sp.special.bad : sp.special.good; personSay(p, ans[0], ans[1], p.role === 'boss' ? 'surprise' : 'happy'); return; }
  const q = sp.qs[+k], v = p.answers[q.f], [zh, ko] = q.a(vz(v), vk(v));
  personSay(p, zh, ko, p.role === 'liar' && q.f === p.lieField ? 'surprise' : undefined);
}
async function judge(v) {
  if (CK.done) return; CK.done = true;
  const S = CK.S, p = S.ppl[CK.i], right = (v === 1) === !!p.ok, last = CK.i === S.ppl.length - 1, why = whyOf(p, S);
  const sm = pad.querySelector('.stampmark'); sm.className = 'stampmark on ' + (v ? 'ok' : 'no'); sm.textContent = v ? '通过' : '可疑';
  pad.querySelectorAll('.stamp,.qb').forEach(b => b.disabled = true);
  Sound.sfx('stamp');
  const vd = pad.querySelector('.verdict');
  await sleep(250);
  if (right) {
    CK.ok++; Sound.sfx(p.role === 'boss' ? 'caught' : 'good'); vd.className = 'verdict good';
    vd.innerHTML = p.role === 'boss' ? `🚨 잡았다! ${esc(why)}` : p.role === 'gang' ? `🚔 졸개 체포! ${esc(why)}` : `⭕ 정확해요! ${esc(why)}`;
    if (p.role === 'gang') Sound.sfx('whistle');
    if (p.role === 'boss') SPEAK = { look: CK.lk, mood: 'surprise', emo: '!', t0: performance.now(), dur: 900 };
  } else {
    CK.warn++; CK.badge--; Sound.sfx('warn'); vd.className = 'verdict bad';
    const ttl = pad.querySelector('.ptitle .badges'); if (ttl) ttl.outerHTML = badgeHTML();
    if (p.ok) { const w = STORY.check.wrongInnocent; speak(w[0]); SPEAK = { look: CK.lk, mood: 'sad', emo: '!', t0: performance.now(), dur: 1800 }; vd.innerHTML = `<b>🛡 -1</b> 무고한 사람을 잡았어요! "<span class="zh">${esc(w[0])}</span>" (${esc(w[2])})<br>해설: ${esc(why)}`; }
    else { vd.innerHTML = `<b>🛡 -1</b> ${esc(STORY.check.wrongPassed)}<br>해설: ${esc(why)}${CK.asked === 0 ? '<br>💡 다음엔 ❓ 질문으로 먼저 물어봐요!' : ''}`; SPEAK = { look: CK.lk, mood: 'happy', emo: '♪', t0: performance.now(), dur: 1200 }; }
  }
  vd.insertAdjacentHTML('beforeend', `<div class="row"><button class="big go">${CK.badge <= 0 ? '😵 …' : last ? '결과 보기 ▶' : '다음 사람 ▶'}</button></div>`);
  vd.scrollIntoView({ block: 'nearest' });
  await new Promise(res => { const bt = vd.querySelector('.go'); bt.onclick = res; enterHook = res; });
  enterHook = null; CK.out = performance.now(); CK.outDir = v ? -1 : 1; SPEAK = null;
  if (CK.badge <= 0) {
    await sleep(400); Sound.sfx('train'); Sound.bgm('fail');
    const c = card(`<h2>🚆 단원이 도망쳤어요!</h2><div class="t">${esc(STORY.check.fail)}</div><div class="small">이번엔 새 여행객들이 줄을 서요. 규칙 → 서류 두 장 → 질문 순서로 천천히!</div><div class="row"><button class="big go">🔁 검문 다시 하기</button></div>`);
    await wait(c); return startCheck(CK.cs, true);
  }
  await sleep(450);
  nextSuspect();
}
async function checkEnd() {
  pad.innerHTML = ''; CK.i = CK.S.ppl.length; CK.clock = (performance.now() - CK.t0) / 1000;
  const sc = STORY.cases[CK.cs.no], n = CK.S.ppl.length;
  await say([{ who: 'minhao', t: CK.ok >= n - 1 ? `완벽해! ${CK.ok}/${n} 정확, 걸린 시간 ${fmtClock(CK.clock)}! 변장한 무음단 단원을 찾아냈어!` : `검문 ${CK.ok}/${n}… 배지는 ${CK.badge}개 남았지만, 赵队长 덕분에 단원을 붙잡았어!` },
    { who: 'club', zh: STORY.check.caught },
    { who: 'police', t: '단원 주머니에서 쪽지가 나왔어. 또 그 표시야… "嘘".' }]);
  if (sc && sc.note) {
    Sound.sfx('paper');
    const c = card(`<div class="xnote"><div class="xh">🗒 무음단 쪽지 <span>嘘</span></div>${zhBlock(sc.note[0], sc.note[1], sc.note[2], true)}<button class="mini" data-say="${esc(sc.note[0])}">🔊</button></div><div class="row"><button class="big go">쪽지를 수첩에 넣기</button></div>`);
    speak(sc.note[0]); await wait(c);
  }
  caseSolved();
}
function drawCheck(t) {
  if (!CK || !CK.bg) return;
  if (CK.t0 && CK.i < CK.S.ppl.length && (t | 0) % 500 < 20) { const c = document.getElementById('ckClock'); if (c) c.textContent = '⏱ ' + fmtClock((t - CK.t0) / 1000); }
  const cx = viewCX(), wx0 = cx - 78, wx1 = cx + 78;
  PX.R(ctx, 0, 0, W, H, '#4a3a52');
  for (let y = 0; y < 150; y += 10) for (let x = (y / 10 % 2) * 10; x < W; x += 20) PX.R(ctx, x, y, 10, 10, '#52425a');
  // 창문 너머 도시
  ctx.save(); ctx.beginPath(); ctx.rect(wx0, 26, wx1 - wx0, 124); ctx.clip(); ctx.drawImage(CK.bg, Math.round(cx - W / 2), -20); ctx.restore();
  // 사람
  // 줄 선 사람들 (창문 너머, 작게)
  if (CK.S) { const left = CK.S.ppl.length - CK.i - 1; for (let k = 0; k < Math.min(5, left); k++) { const qx = cx + 40 + k * 14, im = PX.person(CK.S.ppl[CK.i + 1 + k].base, 'stand', 0, (t + k * 700) % 3000 < 120 ? 'blink' : undefined); ctx.save(); ctx.beginPath(); ctx.rect(wx0, 26, wx1 - wx0, 124); ctx.clip(); ctx.globalAlpha = .75; ctx.drawImage(PX.flip(im), qx, 150 - 40 - (k % 2)); ctx.restore(); } }
  const p = CK.data.people[CK.i];
  if (p) {
    const el2 = t - CK.walk, outT = CK.out ? t - CK.out : 0;
    let x = cx - 26 + Math.max(0, 1 - el2 / 700) * 120 + (CK.out ? CK.outDir * outT / 3 : 0);
    const moving = el2 < 700 || CK.out;
    let im = moving ? PX.person(CK.lk, 'run', Math.floor(t / 90) % 6) : null;
    if (!moving) { const sp = SPEAK && SPEAK.look === CK.lk ? SPEAK : null, e = sp ? t - sp.t0 : 9e9; const f = Math.floor(t / 150) % 2;
      im = sp && e < sp.dur ? PX.person(CK.lk, 'talk', f, (f ? 'talk' : '') + sp.mood) : PX.person(CK.lk, 'stand', 0, (t % 3200) < 120 ? 'blink' : (sp ? sp.mood : undefined)); }
    if (moving && (el2 < 700 || CK.outDir < 0)) im = PX.flip(im);
    if (!moving) im = PX.flip(im);
    ctx.drawImage(im, Math.round(x), 150 - 58, im.width * 2, im.height * 2);
    if (SPEAK && SPEAK.look === CK.lk && SPEAK.emo && t - SPEAK.t0 < 1500) { const bx = Math.round(x + 10), by = 72; PX.R(ctx, bx, by, 13, 12, '#1d1424'); PX.R(ctx, bx + 1, by + 1, 11, 10, '#fff'); PX.text(ctx, SPEAK.emo, bx + 4, by + 1, 9, SPEAK.emo === '!' ? '#e2504c' : '#4f7fdc'); }
  }
  // 창틀 · 간판
  PX.R(ctx, wx0 - 6, 20, wx1 - wx0 + 12, 6, '#2a1d24'); PX.R(ctx, wx0 - 6, 20, 6, 132, '#2a1d24'); PX.R(ctx, wx1, 20, 6, 132, '#2a1d24');
  PX.R(ctx, wx0, 26, 3, 124, '#ffffff22');
  PX.R(ctx, cx - 30, 4, 60, 15, '#c0392b'); PX.R(ctx, cx - 29, 5, 58, 1, '#f2c14e'); PX.text(ctx, '检查站', cx - 20, 4, 11, '#ffe9a8');
  // 책상
  PX.R(ctx, 0, 150, W, 50, '#7a4a30'); PX.R(ctx, 0, 150, W, 3, '#a8744e'); PX.R(ctx, 0, 153, W, 1, '#5a3420');
  for (let x = 0; x < W; x += 24) PX.R(ctx, x, 160, 1, 40, '#6a4028');
  PX.R(ctx, cx - 50, 162, 34, 24, '#fff6dc'); PX.R(ctx, cx - 50, 162, 34, 3, '#e2504c'); for (let k = 0; k < 4; k++) PX.R(ctx, cx - 46, 168 + k * 4, 22 - (k % 2) * 6, 1, '#b0a090');
  PX.R(ctx, cx + 18, 166, 20, 10, '#2a1d24'); PX.R(ctx, cx + 19, 167, 18, 8, '#c0392b');
  PX.R(ctx, cx + 44, 160, 8, 12, '#8a5a30'); PX.R(ctx, cx + 42, 172, 12, 4, '#2a1d24');
  // 赵队长 (창구 오른쪽)
  { const pf = SPEAK && SPEAK.look === 'police' ? Math.floor(t / 150) % 2 : 0, px = Math.min(W - 26, wx1 + 12);
    ctx.drawImage(PX.flip(PX.person('police', pf ? 'talk' : 'stand', pf, pf ? 'talk' : ((t % 3600) < 120 ? 'blink' : undefined))), px, 150 - PX.SH + 11); }
  // 民浩 (책상 옆)
  const mf = 0;
  ctx.drawImage(PX.person(PL(), mf ? 'talk' : 'stand', mf, mf ? 'talk' : undefined), Math.max(4, wx0 - 40), 150 - PX.SH + 1 + 10);
}

/* ───────── 사건 해결 · 과제 확인증 ───────── */
async function caseSolved() {
  const cs = LD.cs, run = LD.run;
  const f = cs.friend;
  go('solved'); setTop();
  await say([{ zh: STORY.solved[cs.no], look: f.look }], { who: [`${f.name} (${f.ko})`, f.look] });
  const gatesFirst = run.gates.filter(g => g.first);
  const gateOk = gatesFirst.filter(g => g.ok).length;
  const ck = CK && CK.cs === cs ? CK : { ok: 8, warn: 0 };
  const ckN = CK && CK.S && CK.cs === cs ? CK.S.ppl.length : 8;
  let stars = 1; if (run.hearts >= 2) stars++; if (gateOk >= gatesFirst.length - 1 && LD.tuk >= 3 && ck.ok >= ckN - 1) stars++;
  const prev = save.cleared[cs.no] || 0; save.cleared[cs.no] = Math.max(prev, stars);
  const missed = cs.clues.map((c, i) => i).filter(i => !run.got.includes(i));
  missed.forEach(i => save.weakClue[cs.no + ':' + i] = 1);
  const now = new Date(); const date = `${now.getMonth() + 1}월 ${now.getDate()}일 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  save.history.push({ no: cs.no, stars, date, clues: run.got.length, gates: `${gateOk}/${gatesFirst.length}`, tuk: LD.tuk, check: ck.ok }); persist();
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
    <div class="crow"><span>단서</span><b>${run.got.length} / 10</b></div><div class="crow"><span>📦 덩어리 택배 (한 번에)</span><b>${gateOk} / ${gatesFirst.length}</b></div>
    <div class="crow"><span>사다리 툭! (실수 없이 빠르게)</span><b>${LD.tuk} / 6</b></div><div class="crow"><span>🛂 검문소 정확</span><b>${ck.ok} / ${ckN} · 🛡 ${ck.badge == null ? 3 : ck.badge} · 시도 ${ck.tries || 1}</b></div><div class="crow"><span>남은 하트</span><b>${'❤'.repeat(run.hearts)}</b></div>
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
    <h3>📋 과제 기록</h3><div class="small">${save.history.slice(-8).reverse().map(h => `${h.date} · ${h.no}과 ${'★'.repeat(h.stars)} · 단서 ${h.clues}/10 · 택배 ${h.gates}`).join('<br>') || '아직 없어요'}</div>
    <h3>⚙️ 설정</h3>
    <div class="setrow">병음 보기 <button class="btn" data-k="py">${set.py ? '켜짐' : '꺼짐'}</button></div>
    <div class="setrow">뜻 보기 <button class="btn" data-k="ko">${set.ko ? '켜짐' : '꺼짐'}</button></div>
    <div class="setrow">읽기 빠르기 <button class="btn" data-k="rate">${set.rate < .8 ? '느리게' : set.rate > .9 ? '빠르게' : '보통'}</button></div>
    <div class="setrow">효과음 <button class="btn" data-k="sfx">${set.sfx ? '켜짐' : '꺼짐'}</button></div>
    <div class="setrow">배경음악 <button class="btn" data-k="bgm">${set.bgm ? '켜짐' : '꺼짐'}</button></div>
    <div class="setrow">선생님용: 모든 사건 열기 <button class="btn" data-k="unlock">${save.unlockAll ? '열림' : '코드 입력'}</button></div>
    <div class="setrow">내 탐정 모습 <span>${lookPicker()}</span></div>
    <div class="setrow">처음부터 다시 <button class="btn" data-k="reset">초기화</button></div>
    <div class="small">${APP_VERSION} · © 2026 진담중국어(전진아). 무단 복사·배포·수정·판매 금지.<br>문의: <a href="https://pf.kakao.com/_jZYxmxj/chat" target="_blank" rel="noopener">카카오톡 채널</a></div>
    <div class="row"><button class="big go">닫기</button></div>`);
  let arm = 0; bindLookPicker(c);
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
  try {
  const shk = SHKT > 0; if (shk) { SHKT -= .016; ctx.save(); ctx.translate(Math.round((Math.random() - .5) * SHK), Math.round((Math.random() - .5) * SHK)); if (SHKT <= 0) SHK = 0; }
  if (now - (loop._fk || 0) > 600) { loop._fk = now; const a = document.getElementById('app'); if (a.clientWidth + 'x' + a.clientHeight + '@' + (window.devicePixelRatio || 1) !== fitKey) { fit(); if (LD) LD.scene = ART.towerScene(LD.cs.theme, W, viewCX()); ov._k = null; } }
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (screen === 'title') { titleT += dt; if (!THEME || THEME.name !== '重庆') { THEME = ART.THEMES.cq(); skyC = null; } drawTitle(now, titleT * 60); }
  else if (screen === 'map') drawMap(now);
  else if (screen === 'office') drawOffice(now);
  else if (screen === 'intro' || screen === 'arrive' || screen === 'solved') drawScene(cur.theme, now, screen === 'intro' ? [] : arriveCast(now));
  else if (screen === 'run' && R) { updateRun(dt); if (R) drawRun(now); }
  else if (screen === 'mini') { MINI.update(dt); MINI.draw(now); }
  else if (screen === 'ladder' && LD) { updateLadder(dt); drawLadder(now); }
  else if (screen === 'check') drawCheck(now);
  if (shk) ctx.restore();
  } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}
function drawTitle(t, dist) {
  if (!skyC) { const [c, g] = PX.mk(W, H); THEME.sky(g); skyC = c; }
  ctx.drawImage(skyC, 0, 0);
  THEME.layers.forEach(L => { const off = Math.floor(dist * L.s) % ART.LW; for (let x = -off; x < W; x += ART.LW) ctx.drawImage(L.c, x, 0); });
  const goff = Math.floor(dist) % ART.LW; for (let x = -goff; x < W; x += ART.LW) ctx.drawImage(THEME.ground, x, GY);
  const tx = ((t / 1000 * 60 - dist * .2) % 900 + 900) % 900 - 200; PX.R(ctx, tx, 104, 58, 9, '#2a1d24'); PX.R(ctx, tx + 1, 105, 56, 7, '#e2504c'); for (let i = 0; i < 6; i++) PX.R(ctx, tx + 4 + i * 9, 106, 6, 3, '#fff6dc');
  ctx.drawImage(PX.person(save.intro ? PL() : 'det1', 'run', Math.floor(dist / 7) % 6), 60, GY - PX.SH + 1);
  ctx.drawImage(PX.person('minhao', 'run', Math.floor(dist / 7 + 3) % 6), 30, GY - PX.SH + 1);
  ctx.drawImage(PX.rider('xiaomei', Math.floor(t / 70) % 4), 110, GY - PX.SH + 1);
}

/* 카카오톡 등 앱 안 브라우저 안내 */
if (/KAKAOTALK|Instagram|FBAN|FBAV|NAVER\(inapp/i.test(navigator.userAgent || '')) setTimeout(() => toast('소리가 안 나면 크롬·사파리에서 열어 주세요'), 1500);
window.__cr = { get save() { return save; }, get R() { return R; }, get LD() { return LD; }, get screen() { return screen; }, openCase, startRun, startLadder, startCheck, get CK() { return CK; }, mapScreen, doJump, doSlide, meeting };
/* 중국어 글꼴 미리 받기: 구글 글꼴은 글자가 처음 나올 때 조각을 내려받아서, 그 순간 화면이 멈칫해요.
   게임에 나오는 모든 한자를 타이틀 화면에서 미리 한 번 그려 두면 플레이 중에는 멈추지 않아요. */
function warmFonts() {
  try {
    const src = JSON.stringify([CASES, typeof CHECK !== 'undefined' ? CHECK : {}, STORY]) + '一二三四五六七八出发终点地铁线路图找不同拼图迷宫搭配气球密码广播小偷暗号停电落物检查站通过可疑嘘话';
    const chars = [...new Set(src.match(/[\u3000-\u9fff\uff00-\uffef]/g) || [])].join('');
    const box = document.createElement('div');
    box.setAttribute('aria-hidden', 'true');
    box.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
    box.innerHTML = `<span style="font-family:var(--zh);font-weight:700">${chars}</span><span style="font-family:var(--zh);font-weight:500">${chars}</span>`;
    document.body.appendChild(box);
    if (document.fonts && document.fonts.load) { document.fonts.load("700 20px 'Noto Sans SC'", chars).catch(() => {}); document.fonts.load("500 20px 'Noto Sans SC'", chars).catch(() => {}); }
  } catch (e) {}
}
fit(); titleScreen(); requestAnimationFrame(loop); setTimeout(warmFonts, 300);
