/* 도트 그림 도우미 + 캐릭터 (이미지 파일 없이 코드로 그림)
   - 모든 그림은 1게임픽셀 = 1캔버스픽셀로 그리고, 화면에는 정수배로 키워서 선명하게 보여요.
   - 캐릭터는 관절(허벅지·정강이·팔)을 움직여 프레임을 만들고, 마지막에 테두리를 둘러요. */
const PX = (() => {
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
  const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const P = (g, x, y, c) => R(g, x, y, 1, 1, c);
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
  function disc(g, cx, cy, r, c) { for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y + r * .6)); R(g, cx - w, cy + y, w * 2 + 1, 1, c); } }
  function ellipse(g, cx, cy, rx, ry, c) { for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + .01)))); R(g, cx - w, cy + y, w * 2 + 1, 1, c); } }
  function line(g, x0, y0, x1, y1, c, wdt = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    const o = Math.floor((wdt - 1) / 2);
    while (true) { R(g, x0 - o, y0 - o, wdt, wdt, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  /* 두 색 섞기(바둑판 점묘) */
  function dither(g, x, y, w, h, c1, c2, k = .5) {
    R(g, x, y, w, h, c1); g.fillStyle = c2;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const b = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]][(y + j) & 3][(x + i) & 3] / 16;
      if (b < k) g.fillRect(x + i, y + j, 1, 1);
    }
  }
  /* 세로 그라데이션(띠 + 점묘 경계) */
  function vgrad(g, x, y, w, h, cols) {
    const n = cols.length - 1, band = h / n;
    for (let i = 0; i < n; i++) {
      const y0 = Math.round(y + i * band), y1 = Math.round(y + (i + 1) * band);
      R(g, x, y0, w, y1 - y0, cols[i]);
      const t = Math.max(2, Math.round((y1 - y0) * .45));
      for (let k = 0; k < 3; k++) dither(g, x, y1 - t + Math.round(k * t / 3), w, Math.ceil(t / 3), cols[i], cols[i + 1], (k + 1) / 4);
    }
  }
  /* 바깥 테두리 두르기 */
  function outline(c, col = '#1d1424', inner = false) {
    const g = c.getContext('2d'), { width: w, height: h } = c;
    const d = g.getImageData(0, 0, w, h), a = d.data, out = new Uint8ClampedArray(a);
    const [r, gg, b] = [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; if (a[i + 3] > 0) continue;
      const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < w && Y < h && a[(Y * w + X) * 4 + 3] > 0; });
      if (n) { out[i] = r; out[i + 1] = gg; out[i + 2] = b; out[i + 3] = 255; }
    }
    d.data.set(out); g.putImageData(d, 0, 0); return c;
  }
  /* 작은 글자 (선명하게) */
  function text(g, s, x, y, size, col, font = "'Noto Sans SC', 'PingFang SC', sans-serif", weight = 700) {
    const [c, t] = mk(Math.ceil(size * s.length * 1.2) + 4, size + 6);
    t.font = `${weight} ${size}px ${font}`; t.fillStyle = '#fff'; t.textBaseline = 'top'; t.fillText(s, 1, 1);
    const d = t.getImageData(0, 0, c.width, c.height), a = d.data;
    const [r, gg, b] = [parseInt(col.slice(1, 3), 16), parseInt(col.slice(3, 5), 16), parseInt(col.slice(5, 7), 16)];
    for (let i = 0; i < a.length; i += 4) { const on = a[i + 3] > 110; a[i] = r; a[i + 1] = gg; a[i + 2] = b; a[i + 3] = on ? 255 : 0; }
    t.putImageData(d, 0, 0); g.drawImage(c, Math.round(x), Math.round(y)); return c.width;
  }

  /* ───── 사람 ───── */
  const LOOK = {
    minhao:   { hair: '#2a2033', hairL: '#4b3d5e', skin: '#f6c7a1', skinD: '#d99a7a', coat: '#d9a441', coatD: '#a8772a', coatL: '#f2cb72', scarf: '#e0453c', scarfD: '#a92f2a', pants: '#3a4677', pantsD: '#272f55', shoe: '#f4f1ea', shoeD: '#e0453c', style: 'spiky' },
    xiaomei:  { hair: '#1f1a26', hairL: '#3d3350', skin: '#f8cfb0', skinD: '#dca184', coat: '#e2504c', coatD: '#a8332f', coatL: '#f58a7a', scarf: '#ffd36e', scarfD: '#d6a43c', pants: '#2f2a3d', pantsD: '#1f1b29', shoe: '#2f2a3d', shoeD: '#e2504c', style: 'pigtail' },
    xiaoyu:   { hair: '#3a2416', hairL: '#5c3c26', skin: '#f8cfb0', skinD: '#dca184', coat: '#5fae6e', coatD: '#3f8250', coatL: '#8fd39a', scarf: '#fff6dc', scarfD: '#d8ccb0', pants: '#3a4677', pantsD: '#272f55', shoe: '#f4f1ea', shoeD: '#5fae6e', style: 'bob' },
    xiaohua:  { hair: '#2a1d22', hairL: '#4a3540', skin: '#f8cfb0', skinD: '#dca184', coat: '#f28bb0', coatD: '#c45f86', coatL: '#ffb8cf', scarf: '#ffe27a', scarfD: '#d6b040', pants: '#6a5aa8', pantsD: '#4a3e7a', shoe: '#fff', shoeD: '#f28bb0', style: 'flower' },
    xiaodong: { hair: '#231c2c', hairL: '#3e3450', skin: '#f8cfb0', skinD: '#dca184', coat: '#4f8fdc', coatD: '#3364a8', coatL: '#8cbcf0', scarf: '#f2f2f2', scarfD: '#c8ccd6', pants: '#2f3550', pantsD: '#1f2438', shoe: '#6b4a32', shoeD: '#4a3222', style: 'hat' },
    uncle:    { hair: '#3a3036', hairL: '#5a4c54', skin: '#f2c09a', skinD: '#d08f6e', coat: '#6b7a8f', coatD: '#4b5868', coatL: '#95a3b5', scarf: '#c9b48a', scarfD: '#a08a60', pants: '#3a3a48', pantsD: '#262632', shoe: '#3b2a22', shoeD: '#241812', style: 'spiky' },
    auntie:   { hair: '#2b1a20', hairL: '#4e3240', skin: '#f6c7a8', skinD: '#d89a80', coat: '#9b59b6', coatD: '#6f3a88', coatL: '#c38fd6', scarf: '#ffd36e', scarfD: '#d6a43c', pants: '#3a2a48', pantsD: '#261a32', shoe: '#3a2a48', shoeD: '#9b59b6', style: 'bob' },
    grandpa:  { hair: '#d8d4dc', hairL: '#ffffff', skin: '#efbf98', skinD: '#c98f6c', coat: '#8a6a4a', coatD: '#654a30', coatL: '#b08e6a', scarf: '#6a8a5a', scarfD: '#4a6a3a', pants: '#4a4048', pantsD: '#332a32', shoe: '#2a2024', shoeD: '#4a3a30', style: 'old' },
    student:  { hair: '#1f1a26', hairL: '#3d3350', skin: '#f8cfb0', skinD: '#dca184', coat: '#3fa7a0', coatD: '#2a7a74', coatL: '#7fd6cc', scarf: '#ffffff', scarfD: '#d0d0d8', pants: '#2f3550', pantsD: '#1f2438', shoe: '#f4f1ea', shoeD: '#3fa7a0', style: 'spiky' },
    club:     { hair: '#1a1420', hairL: '#2e2638', skin: '#e8b892', skinD: '#c48c6c', coat: '#2e2a3a', coatD: '#1c1826', coatL: '#4a4458', scarf: '#c0392b', scarfD: '#8a2a24', pants: '#24202e', pantsD: '#16121e', shoe: '#16121e', shoeD: '#c0392b', style: 'club' },
    teacher:  { hair: '#2b1a14', hairL: '#4e3226', skin: '#f8cfb0', skinD: '#dca184', coat: '#ff9466', coatD: '#d0663e', coatL: '#ffbc94', scarf: '#fff6dc', scarfD: '#d8ccb0', pants: '#5d4a8c', pantsD: '#40326a', shoe: '#40326a', shoeD: '#ff9466', style: 'long' }
  };
  const SW = 26, SH = 37, HIPX = 12, HIPY = 26;
  function limb(g, x, y, a1, a2, l1, l2, c, w) {
    const r = d => d * Math.PI / 180;
    const kx = x + Math.sin(r(a1)) * l1, ky = y + Math.cos(r(a1)) * l1;
    const fx = kx + Math.sin(r(a1 + a2)) * l2, fy = ky + Math.cos(r(a1 + a2)) * l2;
    line(g, x, y, kx, ky, c, w); line(g, kx, ky, fx, fy, c, w);
    return [fx, fy];
  }
  function head(g, L, cx, cy, mood) {
    // 뒷머리
    if (L.style === 'long') R(g, cx - 6, cy - 2, 6, 11, L.hair);
    if (L.style === 'bob') R(g, cx - 6, cy - 2, 5, 8, L.hair);
    if (L.style === 'pigtail') { disc(g, cx - 7, cy + 3, 2, L.hair); R(g, cx - 8, cy + 5, 2, 4, L.hair); }
    // 얼굴 (둥글게)
    [5, 7, 9, 11, 11, 11, 11, 11, 11, 10, 8, 5].forEach((w, i) => R(g, cx - Math.floor(w / 2) + (i > 8 ? 1 : 0), cy - 6 + i, w, 1, L.skin));
    R(g, cx - 5, cy + 3, 1, 2, L.skinD); R(g, cx - 3, cy + 5, 6, 1, L.skinD); P(g, cx + 4, cy + 4, L.skinD);
    // 귀
    R(g, cx - 4, cy + 1, 2, 3, L.skinD); P(g, cx - 3, cy + 2, L.skin);
    // 머리카락
    R(g, cx - 5, cy - 6, 11, 4, L.hair); R(g, cx - 6, cy - 4, 4, 6, L.hair); R(g, cx - 4, cy - 7, 8, 2, L.hair);
    if (L.style === 'spiky') { P(g, cx - 3, cy - 8, L.hair); P(g, cx, cy - 8, L.hair); R(g, cx + 2, cy - 8, 2, 1, L.hair); R(g, cx + 5, cy - 4, 2, 2, L.hair); R(g, cx + 3, cy - 3, 3, 1, L.hair); }
    else { R(g, cx + 3, cy - 3, 3, 2, L.hair); R(g, cx + 5, cy - 4, 1, 3, L.hair); }
    R(g, cx - 3, cy - 6, 4, 1, L.hairL); P(g, cx - 4, cy - 5, L.hairL);
    if (L.style === 'flower') { R(g, cx - 4, cy - 8, 2, 2, '#ff6f91'); R(g, cx, cy - 9, 2, 2, '#ffd36e'); R(g, cx + 3, cy - 8, 2, 2, '#fff'); P(g, cx - 3, cy - 7, '#ffd36e'); }
    if (L.style === 'hat') { [6, 8, 10, 12, 12].forEach((w, i) => R(g, cx - Math.floor(w / 2), cy - 10 + i, w, 1, '#e2504c')); R(g, cx - 6, cy - 5, 13, 2, '#f2f2f2'); R(g, cx - 3, cy - 9, 2, 3, '#ff8a7a'); R(g, cx + 1, cy - 9, 1, 3, '#b83a36'); disc(g, cx, cy - 12, 2, '#f2f2f2'); }
    if (L.style === 'pigtail') { R(g, cx - 2, cy - 7, 2, 1, '#ffd36e'); }
    if (L.style === 'old') { R(g, cx - 4, cy - 7, 8, 1, L.skin); R(g, cx - 2, cy - 6, 6, 1, L.skin); R(g, cx + 2, cy + 3, 4, 1, L.hair); }
    if (L.style === 'club') { R(g, cx - 7, cy - 6, 15, 2, '#16121e'); [8, 10, 10].forEach((w, i) => R(g, cx - 5, cy - 11 + i, w + 2, 1, '#2a2436')); R(g, cx - 5, cy - 8, 12, 1, '#c0392b'); }
    // 눈 (오른쪽을 봄) — mood: ok | happy | hurt | blink | surprise | sad, 'talk'가 붙으면 입을 벌림
    const m = mood || 'ok', eye = /happy/.test(m) ? 'happy' : /hurt/.test(m) ? 'hurt' : /blink/.test(m) ? 'blink' : /surprise/.test(m) ? 'surprise' : /sad/.test(m) ? 'sad' : 'ok';
    if (eye === 'happy') { R(g, cx + 2, cy, 3, 1, '#1d1424'); P(g, cx + 2, cy - 1, '#1d1424'); P(g, cx + 4, cy - 1, '#1d1424'); }
    else if (eye === 'hurt') { P(g, cx + 2, cy - 1, '#1d1424'); P(g, cx + 4, cy + 1, '#1d1424'); P(g, cx + 3, cy, '#1d1424'); P(g, cx + 2, cy + 1, '#1d1424'); P(g, cx + 4, cy - 1, '#1d1424'); }
    else if (eye === 'blink') { R(g, cx + 2, cy + 1, 3, 1, '#1d1424'); R(g, cx + 1, cy - 2, 3, 1, L.hair); }
    else if (eye === 'surprise') { R(g, cx + 2, cy - 2, 3, 4, '#fff'); R(g, cx + 3, cy - 1, 2, 2, '#1d1424'); R(g, cx + 1, cy - 4, 3, 1, L.hair); }
    else if (eye === 'sad') { R(g, cx + 2, cy, 2, 2, '#fff'); R(g, cx + 3, cy, 1, 2, '#1d1424'); P(g, cx + 1, cy - 2, L.hair); P(g, cx + 2, cy - 3, L.hair); P(g, cx + 3, cy - 3, L.hair); }
    else { R(g, cx + 2, cy - 1, 2, 3, '#fff'); R(g, cx + 3, cy - 1, 1, 3, '#1d1424'); P(g, cx + 3, cy - 1, '#fff'); R(g, cx + 1, cy - 2, 3, 1, L.hair); }
    if (L.style === 'club') { R(g, cx + 1, cy - 1, 5, 3, '#16121e'); P(g, cx + 2, cy - 1, '#6a6478'); R(g, cx - 2, cy, 3, 1, '#16121e'); }
    R(g, cx + 1, cy + 3, 2, 1, /happy|surprise/.test(m) ? '#ff7a90' : '#ff9aa8');   // 볼
    if (/talk/.test(m)) { R(g, cx + 3, cy + 3, 3, 2, '#7a2a34'); P(g, cx + 4, cy + 4, '#ff8a8a'); }
    else if (eye === 'surprise') R(g, cx + 4, cy + 3, 2, 2, '#7a2a34');
    else if (eye === 'happy') { R(g, cx + 3, cy + 4, 3, 1, '#c0605a'); P(g, cx + 5, cy + 3, '#c0605a'); }
    else if (eye === 'sad') { R(g, cx + 3, cy + 5, 3, 1, '#c0605a'); P(g, cx + 3, cy + 4, '#c0605a'); }
    else R(g, cx + 4, cy + 4, 2, 1, eye === 'hurt' ? '#1d1424' : '#c0605a');   // 입
  }
  function body(g, L, x, y, h = 9) {
    R(g, x - 4, y, 8, h, L.coat); R(g, x - 4, y, 2, h, L.coatD); R(g, x + 2, y + 1, 1, h - 2, L.coatL);
    R(g, x - 4, y + h - 2, 8, 1, L.coatD); P(g, x + 1, y + 3, L.coatD); P(g, x + 1, y + 5, L.coatD);
  }
  /* 포즈: t = 'run'(f 0~5) | 'jump' | 'fall' | 'slide' | 'stand' | 'hurt' | 'climb'(f 0~1) | 'cheer' */
  const RUN = [[35, -15, -30, -65], [18, -45, -12, -30], [0, -75, 12, -5], [-30, -65, 35, -15], [-12, -30, 18, -45], [12, -5, 0, -75]];
  const cache = {};
  function person(look, pose = 'stand', f = 0, md) {
    f = ((f | 0) % 6 + 6) % 6; const key = look + pose + f + (md || ''); if (cache[key]) return cache[key];
    const L = LOOK[look] || LOOK.minhao;
    const [c, g] = mk(SW, SH);
    let bob = 0, hx = HIPX, hy = HIPY, legs, arms, mood = 'ok';
    if (pose === 'run') { const r = RUN[f % 6]; legs = r; arms = [-r[0] * .9, -70, -r[2] * .9, -70]; bob = [1, 0, -1, 1, 0, -1][f % 6]; }
    else if (pose === 'jump') { legs = [45, -85, -20, -40]; arms = [-150, -20, -120, -30]; bob = -1; }
    else if (pose === 'fall') { legs = [25, -30, -10, -20]; arms = [-120, -40, -100, -40]; }
    else if (pose === 'hurt') { legs = [20, -20, -25, -30]; arms = [-160, 0, -140, 10]; mood = 'hurt'; }
    else if (pose === 'climb') { legs = f ? [30, -80, -5, -10] : [-5, -10, 30, -80]; arms = f ? [-170, 0, -150, 20] : [-150, 20, -170, 0]; }
    else if (pose === 'cheer') { legs = [8, 0, -8, 0]; arms = [-165, -10, -160, 10]; mood = 'happy'; bob = f ? -1 : 0; }
    else if (pose === 'talk') { legs = [5, 0, -5, 0]; arms = f ? [-95, -40, -10, -10] : [-70, -60, -5, -15]; bob = f ? 0 : -1; }
    else if (pose === 'wave') { legs = [5, 0, -5, 0]; arms = f ? [-165, 25, -10, -10] : [-150, -20, -10, -10]; mood = 'happy'; }
    else if (pose === 'think') { legs = [5, 0, -5, 0]; arms = [-120, -110, -10, -10]; }
    else if (pose === 'shrug') { legs = [6, 0, -6, 0]; arms = [-60, -80, -60, -80]; }
    else { legs = [5, 0, -5, 0]; arms = [10, -10, -10, -10]; bob = f ? 1 : 0; }
    if (md) mood = md;
    if (pose === 'slide') {
      // 미끄러지기: 몸을 뒤로 눕히고 다리를 앞으로
      const y0 = SH - 9;
      line(g, 8, y0 + 3, 20, y0 + 5, L.pantsD, 3); line(g, 9, y0 + 2, 21, y0 + 3, L.pants, 3);
      R(g, 20, y0 + 1, 4, 3, L.shoe); R(g, 20, y0 + 3, 4, 1, L.shoeD);
      R(g, 4, y0 - 3, 9, 6, L.coat); R(g, 4, y0 - 3, 9, 2, L.coatL); R(g, 4, y0 + 2, 9, 1, L.coatD);
      R(g, 2, y0 - 6, 5, 3, L.scarf); R(g, 0, y0 - 5, 3, 2, L.scarfD);
      head(g, L, 6, y0 - 10, 'ok');
      line(g, 10, y0 - 1, 15, y0 - 5, L.coat, 2); R(g, 15, y0 - 6, 2, 2, L.skin);
      outline(c); return cache[key] = c;
    }
    hy += bob;
    const [a1, a2, b1, b2] = legs;
    // 뒷다리·뒷팔 (어둡게)
    const fb = limb(g, hx - 1, hy, b1, b2, 5, 5, L.pantsD, 3);
    R(g, fb[0] - 1, fb[1] - 1, 4, 2, L.shoeD); R(g, fb[0], fb[1] - 2, 3, 1, L.shoeD);
    const hb = limb(g, hx, hy - 7, arms[2], arms[3], 4, 4, L.coatD, 2); R(g, hb[0] - 1, hb[1] - 1, 2, 2, L.skinD);
    // 몸
    body(g, L, hx, hy - 9, 10);
    // 목도리 (뒤로 날림)
    R(g, hx - 4, hy - 10, 8, 2, L.scarf); R(g, hx - 4, hy - 9, 8, 1, L.scarfD);
    if (pose === 'run' || pose === 'jump' || pose === 'fall') { const fl = (f % 2) ? 0 : 1; R(g, hx - 8, hy - 9 + fl, 4, 2, L.scarf); R(g, hx - 10, hy - 8 + fl, 2, 1, L.scarfD); }
    else R(g, hx - 3, hy - 9, 2, 4, L.scarf);
    // 앞다리
    const ff = limb(g, hx + 1, hy, a1, a2, 5, 5, L.pants, 3);
    R(g, ff[0] - 1, ff[1] - 1, 4, 2, L.shoe); R(g, ff[0] - 1, ff[1], 4, 1, L.shoeD);
    // 머리
    head(g, L, hx + 1, hy - 16, mood);
    // 앞팔
    limb(g, hx + 1, hy - 7, arms[0], arms[1], 4, 4, L.coatD, 3);
    const hnd = limb(g, hx + 1, hy - 7, arms[0], arms[1], 4, 4, L.coatL, 2);
    R(g, hnd[0] - 1, hnd[1] - 1, 3, 3, L.skin); P(g, hnd[0] - 1, hnd[1] + 1, L.skinD);
    outline(c);
    return cache[key] = c;
  }
  /* 공유 자전거(共享单车)를 탄 모습 — 폭 34, 높이 37, f 0~3 페달 */
  function rider(look, f = 0) {
    const key = 'bike' + look + f; if (cache[key]) return cache[key];
    const L = LOOK[look] || LOOK.minhao;
    const [c, g] = mk(34, SH);
    const gy = SH - 1, wr = 5, bx = 8, fx = 26, wy = gy - wr;
    const wheel = (x) => {
      for (let a = 0; a < 24; a++) { const t = a / 24 * Math.PI * 2; P(g, Math.round(x + Math.cos(t) * wr), Math.round(wy + Math.sin(t) * wr), '#2a2430'); P(g, Math.round(x + Math.cos(t) * (wr - 1)), Math.round(wy + Math.sin(t) * (wr - 1)), '#4a4458'); }
      for (let k = 0; k < 3; k++) { const t = (k / 3 + f / 12) * Math.PI * 2; line(g, x, wy, x + Math.cos(t) * (wr - 1), wy + Math.sin(t) * (wr - 1), '#b8b4c4'); }
      P(g, x, wy, '#f2c14e');
    };
    wheel(bx); wheel(fx);
    // 노란 차체
    const Y = '#f2b631', YD = '#c48a18';
    line(g, bx, wy, 15, wy, YD, 2); line(g, bx, wy, 13, wy - 8, Y, 2); line(g, 13, wy - 8, 23, wy - 8, Y, 2); line(g, 15, wy, 23, wy - 8, Y, 2); line(g, 23, wy - 9, fx, wy, Y, 2);
    R(g, 21, wy - 13, 2, 5, '#2a2430'); R(g, 21, wy - 13, 5, 1, '#2a2430');          // 손잡이
    R(g, 22, wy - 8, 6, 3, '#e8e2d0'); R(g, 23, wy - 7, 4, 1, '#f2b631');             // 앞 바구니
    R(g, 10, wy - 10, 5, 2, '#2a2430');                                               // 안장
    R(g, 4, wy - 7, 6, 2, YD);                                                        // 뒤 흙받기
    // 사람
    const hx = 12, hy = wy - 10;
    const pedal = [[40, -70], [10, -40], [-10, -10], [20, -60]][f % 4];
    const fb = limb(g, hx, hy, pedal[1] + 60, -60, 5, 5, L.pantsD, 3); R(g, fb[0] - 1, fb[1] - 1, 3, 2, L.shoeD);
    body(g, L, hx + 2, hy - 9, 10);
    R(g, hx - 2, hy - 10, 8, 2, L.scarf); R(g, hx - 7, hy - 9 + (f % 2), 5, 2, L.scarf); R(g, hx - 9, hy - 8 + (f % 2), 2, 1, L.scarfD);
    const ff = limb(g, hx + 1, hy, pedal[0], -pedal[0] - 30, 5, 5, L.pants, 3); R(g, ff[0] - 1, ff[1] - 1, 4, 2, L.shoe);
    head(g, L, hx + 4, hy - 16, 'happy');
    line(g, hx + 3, hy - 7, 21, wy - 12, L.coatD, 3); line(g, hx + 3, hy - 7, 21, wy - 12, L.coatL, 2); R(g, 20, wy - 14, 3, 3, L.skin);
    outline(c);
    return cache[key] = c;
  }
  /* 좌우 뒤집기 (마주 보게) */
  const flipC = new WeakMap();
  function flip(c) { if (flipC.has(c)) return flipC.get(c); const [d, g] = mk(c.width, c.height); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); flipC.set(c, d); return d; }
  /* 얼굴 그림 (대화창용, 3배) */
  const faceCache = {};
  function faceURL(look, mood = 'ok') {
    const k = look + mood; if (faceCache[k]) return faceCache[k];
    const L = LOOK[look] || LOOK.minhao;
    const [c, g] = mk(20, 20);
    R(g, 0, 0, 20, 20, '#ffe9c8'); dither(g, 0, 12, 20, 8, '#ffe9c8', '#ffd9a8', .4);
    body(g, L, 10, 15, 6); R(g, 6, 14, 8, 2, L.scarf);
    head(g, L, 10, 8, mood);
    const [c2, g2] = mk(60, 60); g2.drawImage(c, 0, 0, 60, 60);
    return faceCache[k] = c2.toDataURL();
  }
  return { mk, R, P, rng, disc, ellipse, line, dither, vgrad, outline, text, person, rider, faceURL, flip, LOOK, SW, SH };
})();
