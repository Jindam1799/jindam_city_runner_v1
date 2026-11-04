/* ───────── 🌦 도시 날씨 (pixelfx 실시간) ─────────
   도시마다 날씨 이펙트를 1초에 10번 작은 화면(320×180)에 그려 두고, 매 프레임 그 그림을 복사해요.
   느린 휴대폰에서 그리는 데 오래 걸리면 저절로 꺼지고, 예전의 간단한 눈으로 돌아가요.
   이펙트 원본: pixelfx (MIT) — THIRD_PARTY_NOTICES.md */
import { createFrame, clearFrame, createFx, composite } from '../third_party/pixelfx/src/core/index.js';

const FW = 320, FH = 180, OX = 160, OY = 170, CROP = 158, STEP = 1 / 10;
/* 낮 화면에 맞게 밝은 팔레트로 바꿨어요 */
const CITY = {
  cq: { id: 'fog', o: { palette: ['#8f8a98', '#a29daa', '#b3afba', '#c4c0ca', '#d3d0d8', '#e1dee5', '#eeecf1', '#ffffff'], seed: 5 }, alpha: .8, par: .12 },   // 雾都 重庆
  cd: { id: 'falling-leaves', o: { palette: ['#1e4a24', '#2e6a30', '#3f8a3c', '#62aa4c', '#9ccc6a', '#d8f0b0'], reds: ['#2a5020', '#3c7028', '#5a9032', '#84b244', '#b8d670', '#e8f4c0'], golds: ['#3a4a14', '#5a6a1c', '#7e8c26', '#a6b03a', '#d0d470', '#f0f2c0'], seed: 8 }, alpha: .6, par: .35 },   // 成都 대나무잎
  km: { id: 'cherry-blossoms', o: { seed: 12 }, alpha: .85, par: .35 },   // 春城 昆明
  heb: { id: 'snow', o: { palette: ['#7d8db0', '#93a3c4', '#a8b8d6', '#bccbe4', '#d0dcf0', '#e0eaf8', '#f0f6ff', '#ffffff'], seed: 6 }, alpha: 1, par: .3 },   // 冰城 哈尔滨
};
const mods = {};
let cur = null, fx = null, frame = null, img = null, cv = null, g = null, acc = 0, dead = false, slow = 0, n = 0;

async function set(theme) {
  if (dead) return false;
  const c = CITY[theme];
  if (!c) { cur = null; fx = null; return false; }
  if (cur === theme && fx) return true;
  cur = theme; fx = null;
  try {
    mods[c.id] = mods[c.id] || await import(`../third_party/pixelfx/src/fx/weather/${c.id}.js`);
    if (cur !== theme) return false;
    if (!frame) {
      frame = createFrame(FW, FH); img = new ImageData(FW, FH);
      cv = document.createElement('canvas'); cv.width = FW; cv.height = CROP; g = cv.getContext('2d');
    }
    fx = createFx(mods[c.id], { ...c.o, x: OX, y: OY });
    fx.update(3);               // 처음부터 화면에 골고루 떠 있게
    acc = STEP; n = 0; slow = 0;
    return true;
  } catch (e) { console.warn('[WX]', e); dead = true; return false; }
}
function render() {
  const t0 = performance.now();
  clearFrame(frame); fx.draw(frame, 'back'); fx.draw(frame, 'front');
  composite(frame, img.data, null);
  g.putImageData(img, 0, 0);
  const ms = performance.now() - t0; n++;
  if (n > 5) slow = slow * .8 + ms * .2;
  if (n > 20 && slow > 14) { dead = true; fx = null; console.warn('[WX] 느려서 날씨를 껐어요', slow.toFixed(1) + 'ms'); }
}
/* scroll = 카메라가 움직인 거리 (가까운 쪽일수록 빨리 지나가요) */
function draw(ctx, dt, W, scroll = 0, dy = 6, k = 1) {
  if (!fx || dead) return false;
  fx.update(dt); acc += dt;
  if (acc >= STEP) { acc %= STEP; render(); if (!fx) return false; }
  const c = CITY[cur], off = (((scroll * c.par) % FW) + FW) % FW;
  ctx.save(); ctx.globalAlpha = c.alpha * k;
  for (let x = -off; x < W; x += FW) ctx.drawImage(cv, Math.round(x), dy);
  ctx.restore();
  return true;
}
window.WX = { set, draw, get on() { return !!fx && !dead; }, kill() { dead = true; fx = null; }, CITY };
