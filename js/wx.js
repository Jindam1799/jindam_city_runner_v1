/* ───────── 🌦 도시 날씨 (pixelfx) ─────────
   휴대폰 버벅임 방지: 날씨를 달리면서 그리지 않고, 편지·도착 장면(글을 읽는 동안)에
   한 바퀴(10~12초) 분량을 1초 8장씩 미리 그려 그림 한 장(아틀라스)에 모아 둬요.
   달릴 때는 그 그림을 넘기기만 해서 거의 힘이 들지 않아요.
   다 그리기 전에 달리기가 시작되면 그 판에는 날씨 없이(哈尔滨은 예전 간단한 눈) 달려요.
   이펙트 원본: pixelfx (MIT) — THIRD_PARTY_NOTICES.md */
import { createFrame, clearFrame, createFx, composite } from '../third_party/pixelfx/src/core/index.js';

const FW = 320, FH = 180, OX = 160, OY = 170, CROP = 158, FPS = 8, COLS = 8;
/* 낮 화면에 맞게 밝은 팔레트로 바꿨어요 */
const CITY = {
  cq: { id: 'fog', o: { palette: ['#8f8a98', '#a29daa', '#b3afba', '#c4c0ca', '#d3d0d8', '#e1dee5', '#eeecf1', '#ffffff'], seed: 5 }, alpha: .8, par: .12 },   // 雾都 重庆
  cd: { id: 'falling-leaves', o: { palette: ['#1e4a24', '#2e6a30', '#3f8a3c', '#62aa4c', '#9ccc6a', '#d8f0b0'], reds: ['#2a5020', '#3c7028', '#5a9032', '#84b244', '#b8d670', '#e8f4c0'], golds: ['#3a4a14', '#5a6a1c', '#7e8c26', '#a6b03a', '#d0d470', '#f0f2c0'], seed: 8 }, alpha: .6, par: .35 },   // 成都 대나무잎
  km: { id: 'cherry-blossoms', o: { seed: 12 }, alpha: .85, par: .35 },   // 春城 昆明
  heb: { id: 'snow', o: { palette: ['#7d8db0', '#93a3c4', '#a8b8d6', '#bccbe4', '#d0dcf0', '#e0eaf8', '#f0f6ff', '#ffffff'], seed: 6 }, alpha: 1, par: .3 },   // 冰城 哈尔滨
};
const mods = {};
let B = null, dead = false, frame = null, img = null, tmp = null, tg = null, clock = 0;

/* 도시 고르기: 같은 도시면 그대로, 다른 도시면 새로 굽기 시작 (메모리 아끼려고 한 도시만 보관) */
function set(theme) {
  if (dead) return false;
  const c = CITY[theme];
  if (!c) { B = null; return false; }
  if (B && B.theme === theme) return true;
  B = { theme, c, fx: null, n: 0, done: 0, atlas: null, g: null, loading: true };
  const b = B;
  (mods[c.id] ? Promise.resolve(mods[c.id]) : import(`../third_party/pixelfx/src/fx/weather/${c.id}.js`)).then(m => {
    mods[c.id] = m; if (B !== b) return;
    b.fx = createFx(m, { ...c.o, x: OX, y: OY });
    b.n = Math.round((m.meta.duration || 10) * FPS);
    const rows = Math.ceil(b.n / COLS);
    b.atlas = document.createElement('canvas'); b.atlas.width = FW * COLS; b.atlas.height = CROP * rows;
    b.g = b.atlas.getContext('2d'); b.loading = false;
    if (!frame) { frame = createFrame(FW, FH); img = new ImageData(FW, FH); tmp = document.createElement('canvas'); tmp.width = FW; tmp.height = FH; tg = tmp.getContext('2d'); }
  }).catch(e => { console.warn('[WX]', e); dead = true; });
  return true;
}
/* 미리 굽기: 주어진 시간(ms) 안에서 몇 장씩 */
function bake(ms) {
  if (!B || B.loading || B.done >= B.n || dead) return;
  const t0 = performance.now();
  do {
    const i = B.done, s = performance.now();
    clearFrame(frame);
    // 순수 이펙트라 시간만 정하면 그 순간 그림이 나와요
    B.fx.update(i / FPS - B.fx.t);
    B.fx.draw(frame, 'back'); B.fx.draw(frame, 'front');
    composite(frame, img.data, null);
    tg.putImageData(img, 0, 0);
    B.g.drawImage(tmp, 0, 0, FW, CROP, (i % COLS) * FW, ((i / COLS) | 0) * CROP, FW, CROP);
    B.done++;
    const ms1 = performance.now() - s;          // 처음 몇 장은 준비(표 만들기) 때문에 느려서 빼고 봐요
    if (B.done > 4) { B.slow = (B.slow || ms1) * .7 + ms1 * .3; if (B.slow > 150) { dead = true; B = null; console.warn('[WX] 너무 느려서 날씨를 껐어요'); return; } }
  } while (B.done < B.n && performance.now() - t0 < ms);
}
/* 그리기: 다 구워졌을 때만. scroll = 카메라가 움직인 거리 (가까운 쪽일수록 빨리 지나가요) */
function draw(ctx, dt, W, scroll = 0, dy = 6, k = 1) {
  clock += dt;
  if (!B || dead || B.done < B.n || !B.n) return false;
  const c = B.c, i = Math.floor(clock * FPS) % B.n, sx = (i % COLS) * FW, sy = ((i / COLS) | 0) * CROP;
  const off = (((scroll * c.par) % FW) + FW) % FW;
  ctx.save(); ctx.globalAlpha = c.alpha * k;
  for (let x = -off; x < W; x += FW) ctx.drawImage(B.atlas, sx, sy, FW, CROP, Math.round(x), dy, FW, CROP);
  ctx.restore();
  return true;
}
window.WX = {
  set, bake, draw, CITY,
  get on() { return !!B && !dead && B.done >= B.n && B.n > 0; },
  get progress() { return B && B.n ? B.done / B.n : 0; },
  kill() { dead = true; B = null; },
};
