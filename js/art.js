/* 도시 배경(여러 겹) · 장애물 · 아이템 · 관문 · 결승 탑 · 중국 노선 지도 */
const ART = (() => {
  const { mk, R, P, rng, disc, ellipse, line, dither, vgrad, outline, text } = PX;
  const H = 200, GY = 172, LW = 512;           // 화면 높이, 땅 높이, 배경 한 장 폭(반복)

  /* ── 공통 부품 ── */
  function ridge(g, base, amp, col, seed, rough = 1, w = LW) {
    const r = rng(seed); const pts = []; let y = 0, v = 0;
    for (let x = 0; x <= w; x++) { if (x % 6 === 0) v = (r() - .5) * 2.4 * rough; y += v; y *= .96; pts.push(base - amp * (.5 + .5 * Math.sin((x / w) * Math.PI * 2 * 2 + seed)) - y * 3); }
    // 양 끝 이어지게
    for (let x = 0; x < 40; x++) { const t = x / 40; pts[w - 40 + x] = pts[w - 40 + x] * (1 - t) + pts[0] * t; }
    pts.forEach((py, x) => R(g, x, Math.round(py), 1, H - Math.round(py), col));
    return pts;
  }
  function cloud(g, x, y, s, c1, c2) {
    ellipse(g, x, y, 8 * s, 3 * s, c2); ellipse(g, x - 5 * s, y - 2 * s, 5 * s, 3 * s, c1); ellipse(g, x + 3 * s, y - 3 * s, 6 * s, 4 * s, c1); ellipse(g, x, y - 1 * s, 8 * s, 2 * s, c1);
  }
  function windows(g, x, y, w, h, gap, wc, lc, r, lit = .2) {
    for (let j = y + 3; j < y + h - 3; j += gap) for (let i = x + 2; i < x + w - 3; i += 4) { const on = r() < lit; R(g, i, j, 2, 2, on ? lc : wc); if (on) P(g, i, j, '#fff6d0'); }
  }
  function tower(g, x, base, w, h, c, r, o = {}) {
    R(g, x, base - h, w, h, c.wall); R(g, x + w - 3, base - h, 3, h, c.side); R(g, x, base - h, w, 1, c.top || c.side);
    windows(g, x, base - h, w - 3, h, o.gap || 5, c.win, c.lit, r, o.lit);
    if (o.tank && r() < .6) { R(g, x + 3, base - h - 5, 6, 5, c.side); R(g, x + 4, base - h - 6, 4, 1, c.wall); }
    if (o.ac) for (let j = base - h + 6; j < base - 6; j += 10) if (r() < .5) R(g, x + w - 2, j, 3, 2, '#b8b8c0');
    if (o.laundry && r() < .5) { const ly = base - h + 10 + ((r() * (h - 20)) | 0); line(g, x - 6, ly, x, ly, '#666'); ['#ff8a7a', '#7fb2ec', '#fff'].forEach((cc, k) => R(g, x - 5 + k * 2, ly + 1, 1, 3, cc)); }
  }
  function lantern(g, x, y, c = '#e2504c') { R(g, x, y - 3, 1, 3, '#3b2a35'); R(g, x - 2, y, 5, 6, c); R(g, x - 3, y + 1, 7, 4, c); R(g, x - 2, y + 2, 5, 1, '#f2c14e'); R(g, x - 1, y + 6, 3, 2, '#f2c14e'); P(g, x - 1, y + 1, '#ff9a8a'); }
  function sign(g, x, y, w, h, bg, fg, s, size = 8) { R(g, x - 1, y - 1, w + 2, h + 2, '#2a1d24'); R(g, x, y, w, h, bg); text(g, s, x + 2, y + (h - size) / 2 - 1, size, fg); }
  function pine(g, x, base, h, c, cs) {
    for (let i = 0; i < h; i += 3) { const w = Math.round((h - i) * .45); R(g, x - w, base - i - 3, w * 2 + 1, 3, c); if (cs) R(g, x - w, base - i - 3, w * 2 + 1, 1, cs); }
    R(g, x - 1, base - 2, 3, 3, '#5a3a28');
  }
  function bamboo(g, x, base, h, c, cd, r) {
    R(g, x, base - h, 2, h, c); R(g, x + 1, base - h, 1, h, cd);
    for (let y = base - h + 6; y < base; y += 7 + ((r() * 3) | 0)) { R(g, x - 1, y, 4, 1, cd); if (r() < .5) { line(g, x + 2, y, x + 7, y - 3, '#5fa35a'); line(g, x + 2, y + 1, x + 8, y - 1, '#4f9450'); } else { line(g, x, y, x - 5, y - 3, '#5fa35a'); } }
  }
  function flowerPatch(g, x, y, w, r) {
    const cols = ['#ff5d7a', '#ff9ab3', '#ffd34d', '#ffffff', '#b78cff', '#ff8a3d'];
    for (let i = 0; i < w; i += 2) { const h = 2 + ((r() * 4) | 0); R(g, x + i, y - h, 1, h, '#4f9450'); const cc = cols[(r() * cols.length) | 0]; R(g, x + i - 1, y - h - 2, 3, 2, cc); P(g, x + i, y - h - 2, '#fff8'); }
  }
  function cobble(g, w, cols, seam, top, r, tile = 12) {
    R(g, 0, 0, w, H - GY, cols[0]);
    for (let y = 0; y < H - GY; y += 7) for (let x = (y / 7) % 2 * (tile / 2); x < w; x += tile) { R(g, x, y, tile - 1, 6, cols[(r() * cols.length) | 0]); R(g, x, y + 5, tile - 1, 1, seam); R(g, x + tile - 1, y, 1, 6, seam); P(g, x + 1, y + 1, top); }
    R(g, 0, 0, w, 2, top); R(g, 0, 2, w, 1, seam);
  }

  /* ── 도시별 배경 ── */
  const THEMES = {};
  function layerCanvas(fn, seed) { const [c, g] = mk(LW, H); fn(g, rng(seed)); return c; }

  THEMES.cq = () => ({
    name: '重庆', sky: g => { PX.vgrad(g, 0, 0, 999, GY, ['#f6e7cf', '#f2d6b6', '#e6bea3', '#cfa59b']); disc(g, 210, 46, 12, '#fff2d8'); disc(g, 210, 46, 9, '#ffe9c4'); },
    layers: [
      { s: .06, c: layerCanvas((g, r) => { ridge(g, 120, 26, '#c6bfd3', 3, 1.3); ridge(g, 132, 18, '#b2aac6', 7, 1.6); dither(g, 0, 118, LW, 20, '#00000000', '#efe6ea', .25); }, 1) },
      { s: .2, c: layerCanvas((g, r) => {
        const hill = ridge(g, 158, 22, '#8d93ad', 11, .8);
        for (let x = 0; x < LW; x += 9 + ((r() * 8) | 0)) {
          const w = 8 + ((r() * 8) | 0), base = Math.round(hill[Math.min(LW, x + 4)]) + 4, h = 26 + ((r() * 48) | 0);
          tower(g, x, base, w, h, { wall: ['#cfc8cc', '#bfb8c8', '#d8cfc2'][(r() * 3) | 0], side: '#9a93a8', win: '#a7a3b6', lit: '#ffd98a' }, r, { tank: 1, ac: 1, laundry: 1, lit: .12 });
          if (r() < .18) sign(g, x + 1, base - h + 8, 7, 22, '#e2504c', '#fff4d6', '', 6);
        }
        // 경전철 선로와 리쯔바 건물
        R(g, 0, 112, LW, 3, '#5a5470'); R(g, 0, 115, LW, 1, '#3e3a50');
        for (let x = 6; x < LW; x += 28) { R(g, x, 116, 3, 50, '#7b7590'); R(g, x + 2, 116, 1, 50, '#5a5470'); }
        const bx = 300; tower(g, bx, 168, 34, 92, { wall: '#e9e2d6', side: '#b9b0a4', win: '#9fb6c0', lit: '#ffe08a' }, r, { gap: 6, lit: .25 });
        R(g, bx - 1, 108, 36, 10, '#2a2438'); R(g, bx, 109, 34, 8, '#5a5470');
        R(g, bx + 4, 62, 26, 7, '#2a1d24'); text(g, '李子坝站', bx + 6, 62, 6, '#ffffff');
      }, 2) },
      { s: .45, c: layerCanvas((g, r) => {
        for (let x = 0; x < LW; x += 40 + ((r() * 30) | 0)) {
          const h = 34 + ((r() * 20) | 0), w = 30 + ((r() * 16) | 0);
          R(g, x, GY - h, w, h, '#7a5a4a'); R(g, x, GY - h, w, 3, '#5a3e34'); R(g, x + w - 3, GY - h, 3, h, '#5e4438');
          R(g, x + 3, GY - 18, w - 9, 16, '#3b2a35'); R(g, x + 4, GY - 17, w - 11, 14, r() < .5 ? '#ffcf7a' : '#f7a85a');
          const s = ['火锅', '小面', '重庆', '麻辣'][(r() * 4) | 0]; sign(g, x + 3, GY - h + 5, 22, 10, '#c0392b', '#ffe9a8', s, 8);
          for (let k = 0; k < 3; k++) lantern(g, x + 6 + k * 9, GY - h - 2);
        }
        for (let x = 0; x < LW; x += 3) P(g, x, 98 + Math.round(Math.sin(x / 40) * 4), '#3b2a35');
      }, 3) }
    ],
    ground: (() => { const [c, g] = mk(LW, H - GY); cobble(g, LW, ['#b9a596', '#ae9a8c', '#c4b2a2'], '#857164', '#d9c8b8', rng(4)); for (let x = 0; x < LW; x += 48) { R(g, x, 9, 48, 1, '#857164'); R(g, x, 10, 48, 2, '#cbb8a8'); } return c; })(),
    low: [obst('hotpot'), obst('cone')], high: [obst('signboard')], col: '#e2504c'
  });
  THEMES.cd = () => ({
    name: '成都', sky: g => { PX.vgrad(g, 0, 0, 999, GY, ['#fff1d2', '#fbe0b2', '#f3cb94', '#e8b985']); cloud(g, 60, 34, 2, '#fff8ea', '#f7e2c0'); cloud(g, 190, 22, 1.5, '#fff8ea', '#f7e2c0'); },
    layers: [
      { s: .06, c: layerCanvas((g, r) => { ridge(g, 128, 20, '#b9cfa2', 5, 1); ridge(g, 140, 14, '#a3c08f', 9, 1.2); }, 5) },
      { s: .2, c: layerCanvas((g, r) => {
        for (let x = 0; x < LW; x += 3) bamboo(g, x + ((r() * 3) | 0), 168, 50 + ((r() * 40) | 0), '#7fb86a', '#5f9a54', r);
        for (let x = 20; x < LW; x += 110) {
          const w = 64, b = 168;
          R(g, x, b - 30, w, 30, '#f3eee2'); R(g, x, b - 30, w, 2, '#d8d0bc');
          for (let k = 0; k < 4; k++) R(g, x + 6 + k * 16, b - 28, 3, 28, '#b03a2e');
          R(g, x + 14, b - 22, 10, 10, '#7a4a32'); R(g, x + 40, b - 22, 10, 10, '#7a4a32');
          // 처마가 들린 회색 기와지붕
          for (let i = 0; i < 12; i++) R(g, x - 8 + i, b - 44 + i, w + 16 - i * 2, 1, i < 2 ? '#3d3f4a' : '#5d6070');
          R(g, x - 11, b - 46, 4, 2, '#3d3f4a'); R(g, x + w + 7, b - 46, 4, 2, '#3d3f4a');
          for (let i = x - 4; i < x + w + 4; i += 3) R(g, i, b - 42, 1, 9, '#4a4d5a');
          sign(g, x + 18, b - 40, 28, 9, '#2a1d24', '#f2c14e', '茶馆', 7);
          lantern(g, x + 2, b - 32); lantern(g, x + w - 2, b - 32);
        }
      }, 6) },
      { s: .45, c: layerCanvas((g, r) => {
        for (let x = 0; x < LW; x += 46 + ((r() * 30) | 0)) {
          if (r() < .45) { // 대나무 의자와 찻상
            R(g, x, GY - 10, 14, 2, '#d9b65a'); R(g, x + 1, GY - 8, 2, 8, '#c49a3e'); R(g, x + 11, GY - 8, 2, 8, '#c49a3e'); R(g, x + 3, GY - 18, 2, 8, '#d9b65a'); R(g, x + 3, GY - 19, 9, 2, '#e5c677');
            R(g, x + 20, GY - 12, 16, 2, '#8a5a3a'); R(g, x + 26, GY - 10, 3, 10, '#7a4a2e'); R(g, x + 22, GY - 16, 5, 4, '#f4f4f4'); R(g, x + 22, GY - 17, 5, 1, '#5fae6e'); R(g, x + 29, GY - 15, 4, 3, '#fff');
          } else { // 판다
            const px = x + 6, py = GY - 2;
            ellipse(g, px, py - 7, 7, 6, '#f6f6f2'); ellipse(g, px - 1, py - 4, 6, 3, '#24222a');
            disc(g, px + 3, py - 15, 5, '#f6f6f2'); disc(g, px - 1, py - 19, 2, '#24222a'); disc(g, px + 7, py - 19, 2, '#24222a');
            R(g, px + 1, py - 16, 2, 2, '#24222a'); R(g, px + 5, py - 16, 2, 2, '#24222a'); P(g, px + 4, py - 13, '#24222a');
            R(g, px + 6, py - 10, 3, 4, '#24222a'); line(g, px + 8, py - 9, px + 14, py - 20, '#7fb86a', 2);
          }
        }
        for (let x = 0; x < LW; x += 97) bamboo(g, x, GY, 120, '#6aa85a', '#4f8a48', r);
      }, 7) }
    ],
    ground: (() => { const [c, g] = mk(LW, H - GY); cobble(g, LW, ['#a9ab9e', '#9ea093', '#b3b5a8'], '#7d7f73', '#c9cbbf', rng(8), 16); for (let x = 3; x < LW; x += 23) { R(g, x, 0, 1, 2, '#6fa85a'); R(g, x + 2, 0, 1, 1, '#6fa85a'); } return c; })(),
    low: [obst('chair'), obst('teatable')], high: [obst('birdcage')], col: '#5fae6e'
  });
  THEMES.km = () => ({
    name: '昆明', sky: g => { PX.vgrad(g, 0, 0, 999, GY, ['#6fbaf0', '#8fcbf4', '#b6defa', '#dff2fd']); cloud(g, 40, 30, 2, '#ffffff', '#dcefff'); cloud(g, 150, 44, 1.6, '#ffffff', '#dcefff'); cloud(g, 240, 24, 1.2, '#ffffff', '#dcefff'); },
    layers: [
      { s: .06, c: layerCanvas((g, r) => { ridge(g, 118, 26, '#86b6a4', 12, 1.2); ridge(g, 132, 12, '#6e9f8c', 15, 1.4); R(g, 0, 136, LW, 12, '#8ccbe9'); for (let x = 0; x < LW; x += 7) R(g, x, 138 + (x % 3), 3, 1, '#c4e8f8');
        for (let k = 0; k < 9; k++) { const x = (r() * LW) | 0, y = 90 + ((r() * 30) | 0); R(g, x, y, 3, 1, '#fff'); P(g, x - 1, y - 1, '#fff'); P(g, x + 3, y - 1, '#fff'); P(g, x + 1, y + 1, '#e2504c'); } }, 12) },
      { s: .2, c: layerCanvas((g, r) => {
        for (let x = 0; x < LW; x += 40 + ((r() * 20) | 0)) { const h = 30 + ((r() * 20) | 0); tower(g, x, 166, 30, h, { wall: ['#fbe3e8', '#fff2c8', '#e6f4e0'][(r() * 3) | 0], side: '#d8c0c4', win: '#b8d8e8', lit: '#ffe08a' }, r, { lit: .1 }); }
        flowerPatch(g, 0, 168, LW, r);
      }, 13) },
      { s: .45, c: layerCanvas((g, r) => {
        const stripes = [['#e2504c', '#fff'], ['#ff9ab3', '#fff'], ['#58a65c', '#fff'], ['#ffb84d', '#fff']];
        for (let x = 0; x < LW; x += 64) {
          const [a, b] = stripes[(r() * 4) | 0];
          for (let i = 0; i < 6; i++) R(g, x + i * 8, GY - 40, 8, 8, i % 2 ? b : a);
          for (let i = 0; i < 6; i++) R(g, x + i * 8 + 1, GY - 32, 6, 2, i % 2 ? '#ddd' : a);
          R(g, x + 1, GY - 32, 2, 32, '#7a5a42'); R(g, x + 45, GY - 32, 2, 32, '#7a5a42');
          R(g, x + 4, GY - 14, 40, 14, '#a8743e'); R(g, x + 4, GY - 14, 40, 2, '#c99252');
          for (let k = 0; k < 4; k++) { R(g, x + 7 + k * 10, GY - 20, 7, 7, '#9aa4b0'); R(g, x + 7 + k * 10, GY - 20, 7, 1, '#c8d0da'); flowerPatch(g, x + 8 + k * 10, GY - 19, 6, r); }
          sign(g, x + 10, GY - 50, 28, 9, '#fff6dc', '#c0392b', '鲜花饼', 7);
        }
      }, 14) }
    ],
    ground: (() => { const [c, g] = mk(LW, H - GY); cobble(g, LW, ['#c0705a', '#b4644f', '#ca7a63'], '#8a4a3a', '#e09a80', rng(15), 10); const r = rng(16); for (let i = 0; i < 90; i++) R(g, (r() * LW) | 0, 3 + ((r() * 20) | 0), 2, 1, ['#ff9ab3', '#fff', '#ffd34d'][(r() * 3) | 0]); return c; })(),
    low: [obst('bucket'), obst('flowercart')], high: [obst('basket')], col: '#ff9ab3'
  });
  THEMES.heb = () => ({
    name: '哈尔滨', snow: true, sky: g => { PX.vgrad(g, 0, 0, 999, GY, ['#101a3c', '#1d2c5c', '#2f437c', '#4f62a0']); const r = rng(20); for (let i = 0; i < 60; i++) P(g, (r() * 320) | 0, (r() * 90) | 0, r() < .3 ? '#fff' : '#9fb0e0'); disc(g, 250, 32, 9, '#fdf6d8'); disc(g, 254, 29, 8, '#1d2c5c'); },
    layers: [
      { s: .06, c: layerCanvas((g, r) => {
        for (let x = 0; x < LW; x += 14) { const h = 20 + ((r() * 26) | 0); R(g, x, 140 - h, 12, h + 30, '#2a3560'); windows(g, x, 140 - h, 12, h, 5, '#36426e', '#ffcf7a', r, .3); }
        // 성 소피아 성당
        const cx = 200; R(g, cx - 20, 92, 40, 60, '#8a4a3e'); R(g, cx - 20, 92, 40, 2, '#a8604f'); for (let i = 0; i < 3; i++) R(g, cx - 14 + i * 12, 104, 4, 12, '#3b2430');
        R(g, cx - 4, 70, 8, 22, '#8a4a3e'); ellipse(g, cx, 66, 11, 9, '#3f8f6a'); ellipse(g, cx - 2, 63, 5, 4, '#62b48a'); R(g, cx, 50, 1, 8, '#f2c14e'); R(g, cx - 2, 52, 5, 1, '#f2c14e');
        ellipse(g, cx - 18, 90, 5, 4, '#3f8f6a'); ellipse(g, cx + 18, 90, 5, 4, '#3f8f6a');
      }, 21) },
      { s: .2, c: layerCanvas((g, r) => {
        const ice = [['#7fe0ff', '#c8f4ff', '#3fb4e0'], ['#ff9ad8', '#ffd6f0', '#d860a8'], ['#ffe27a', '#fff4c4', '#d8a830'], ['#9affc8', '#d8ffe8', '#48c890']];
        for (let x = 0; x < LW; x += 50 + ((r() * 26) | 0)) {
          const [c1, c2, c3] = ice[(r() * 4) | 0], w = 26 + ((r() * 14) | 0), h = 40 + ((r() * 40) | 0), b = 168;
          R(g, x, b - h, w, h, c1); for (let j = b - h; j < b; j += 5) for (let i = x + ((j / 5) % 2) * 3; i < x + w; i += 6) R(g, i, j, 5, 4, (i + j) % 3 ? c1 : c2), R(g, i + 5, j, 1, 4, c3);
          R(g, x + w / 2 - 4, b - h - 14, 8, 14, c1); R(g, x + w / 2 - 6, b - h - 16, 12, 3, c2); R(g, x + w / 2 - 1, b - h - 22, 2, 6, c2);
          for (let k = 0; k < 3; k++) { R(g, x + 4 + k * 8, b - h + 8, 4, 7, '#1d2c5c'); R(g, x + 5 + k * 8, b - h + 9, 2, 3, c2); }
          dither(g, x - 4, b - h - 6, w + 8, h + 6, '#00000000', c2, .06);
        }
      }, 22) },
      { s: .45, c: layerCanvas((g, r) => {
        for (let x = 0; x < LW; x += 30 + ((r() * 30) | 0)) { if (r() < .7) { pine(g, x, GY, 30 + ((r() * 16) | 0), '#2f5a54', '#e8f2ff'); } else { R(g, x, GY - 40, 2, 40, '#3b3550'); R(g, x - 3, GY - 42, 8, 3, '#f0f4ff'); disc(g, x + 1, GY - 38, 3, '#ffe9a8'); } }
        for (let x = 60; x < LW; x += 170) { R(g, x, GY - 22, 26, 22, '#e2504c'); R(g, x, GY - 22, 26, 3, '#fff'); R(g, x + 2, GY - 16, 22, 10, '#c8f0ff'); sign(g, x + 2, GY - 34, 22, 9, '#fff', '#e2504c', '冰棍', 7); for (let k = 0; k < 4; k++) { R(g, x + 4 + k * 5, GY - 15, 3, 6, ['#fff', '#ffd6a8', '#ff9ad8', '#c8f0ff'][k]); R(g, x + 5 + k * 5, GY - 9, 1, 2, '#c99252'); } }
      }, 23) }
    ],
    ground: (() => { const [c, g] = mk(LW, H - GY); R(g, 0, 0, LW, H, '#e8f0fb'); dither(g, 0, 6, LW, 22, '#e8f0fb', '#c8d6ee', .3); R(g, 0, 0, LW, 2, '#ffffff'); const r = rng(24); for (let i = 0; i < 8; i++) { const x = (r() * LW) | 0; R(g, x, 3, 30, 3, '#bfe8ff'); R(g, x + 3, 3, 10, 1, '#fff'); } return c; })(),
    low: [obst('snowman'), obst('iceblock')], high: [obst('icicle')], col: '#7fe0ff'
  });
  THEMES.hq = () => {
    const t = THEMES.heb(); t.name = '수사 본부'; t.snow = false;
    t.sky = g => { PX.vgrad(g, 0, 0, 999, GY, ['#2a1d3c', '#4a2f5c', '#7a4a6c', '#b86a6c']); };
    t.layers[0] = { s: .06, c: layerCanvas((g, r) => { for (let x = 0; x < LW; x += 12) { const h = 30 + ((r() * 50) | 0); R(g, x, 150 - h, 11, h + 30, '#3a2a4c'); windows(g, x, 150 - h, 11, h, 5, '#4a3a5c', '#ffcf7a', r, .35); } }, 31) };
    t.low = [obst('box'), obst('cone')]; t.high = [obst('banner')]; t.col = '#ffd36e';
    return t;
  };

  /* ── 장애물 (낮은 것 = 점프, 높은 것 = 미끄러지기) ── */
  function obst(kind) {
    let c, g;
    const S = (w, h) => { [c, g] = mk(w, h); };
    if (kind === 'hotpot') { S(22, 20); R(g, 2, 10, 18, 8, '#c0392b'); R(g, 2, 10, 18, 2, '#e2504c'); R(g, 0, 12, 2, 3, '#7a2a24'); R(g, 20, 12, 2, 3, '#7a2a24'); R(g, 4, 9, 14, 2, '#e8532a'); for (let i = 0; i < 4; i++) P(g, 5 + i * 4, 8, '#ff9a5a'); R(g, 6, 18, 10, 2, '#5a5470'); for (let i = 0; i < 3; i++) line(g, 6 + i * 5, 6, 7 + i * 5, 1, '#ffffff99'); R(g, 9, 9, 2, 1, '#ffe08a'); }
    if (kind === 'cone') { S(12, 16); for (let i = 0; i < 14; i++) R(g, 6 - Math.ceil(i / 3), 1 + i, Math.ceil(i / 3) * 2 + 1, 1, '#ff8a3d'); R(g, 3, 5, 7, 2, '#fff'); R(g, 2, 10, 9, 2, '#fff'); R(g, 0, 14, 12, 2, '#5a5470'); }
    if (kind === 'chair') { S(16, 18); R(g, 1, 9, 14, 2, '#e5c677'); R(g, 1, 11, 2, 7, '#c49a3e'); R(g, 13, 11, 2, 7, '#c49a3e'); R(g, 2, 0, 2, 10, '#d9b65a'); R(g, 12, 0, 2, 10, '#d9b65a'); R(g, 2, 2, 12, 2, '#e5c677'); R(g, 2, 6, 12, 1, '#c49a3e'); }
    if (kind === 'teatable') { S(20, 16); R(g, 0, 6, 20, 3, '#8a5a3a'); R(g, 0, 6, 20, 1, '#a8744e'); R(g, 8, 9, 4, 7, '#6a4028'); R(g, 3, 1, 6, 5, '#f4f4f4'); R(g, 3, 0, 6, 1, '#5fae6e'); R(g, 12, 2, 5, 4, '#fff'); R(g, 17, 3, 2, 1, '#fff'); }
    if (kind === 'bucket') { S(16, 20); R(g, 2, 9, 12, 11, '#9aa4b0'); R(g, 2, 9, 12, 1, '#c8d0da'); R(g, 3, 12, 10, 1, '#7a8490'); const r = rng(9); for (let i = 0; i < 12; i++) { const x = 2 + ((r() * 12) | 0), h = 3 + ((r() * 5) | 0); R(g, x, 9 - h, 1, h, '#4f9450'); R(g, x - 1, 7 - h, 3, 3, ['#ff5d7a', '#ffd34d', '#fff', '#b78cff'][i % 4]); } }
    if (kind === 'flowercart') { S(26, 20); R(g, 1, 8, 24, 7, '#a8743e'); R(g, 1, 8, 24, 1, '#c99252'); disc(g, 6, 17, 3, '#3b2a35'); disc(g, 20, 17, 3, '#3b2a35'); P(g, 6, 17, '#9aa'); P(g, 20, 17, '#9aa'); const r = rng(3); for (let i = 0; i < 20; i++) R(g, 2 + i, 3 + ((r() * 4) | 0), 2, 2, ['#ff5d7a', '#ff9ab3', '#ffd34d', '#fff'][i % 4]); }
    if (kind === 'snowman') { S(18, 24); disc(g, 9, 17, 6, '#f4f8ff'); disc(g, 9, 8, 4, '#ffffff'); R(g, 7, 7, 1, 1, '#222'); R(g, 10, 7, 1, 1, '#222'); R(g, 9, 9, 3, 1, '#ff8a3d'); R(g, 5, 11, 8, 2, '#e2504c'); R(g, 6, 1, 6, 3, '#3b3550'); R(g, 5, 4, 8, 1, '#3b3550'); P(g, 9, 15, '#222'); P(g, 9, 18, '#222'); ellipse(g, 9, 23, 7, 1, '#c8d6ee'); }
    if (kind === 'iceblock') { S(18, 18); R(g, 0, 2, 18, 16, '#9fe6ff'); R(g, 0, 2, 18, 2, '#e0f8ff'); R(g, 15, 2, 3, 16, '#5cc4e8'); R(g, 3, 6, 3, 6, '#e0f8ff'); R(g, 8, 10, 2, 4, '#e0f8ff'); }
    if (kind === 'box') { S(18, 16); R(g, 0, 0, 18, 16, '#b8834a'); R(g, 0, 0, 18, 2, '#d8a468'); R(g, 0, 7, 18, 2, '#8a5a30'); text(g, '密', 5, 3, 8, '#e2504c'); }
    // 높은 장애물: 위에서 내려옴, 아래쪽이 땅에서 16px 위
    if (kind === 'signboard') { S(26, 64); R(g, 4, 0, 1, 40, '#3b2a35'); R(g, 21, 0, 1, 40, '#3b2a35'); R(g, 1, 40, 24, 18, '#2a1d24'); R(g, 2, 41, 22, 16, '#c0392b'); text(g, '火锅', 3, 43, 10, '#ffe9a8'); lantern(g, 5, 59); lantern(g, 21, 59); }
    if (kind === 'birdcage') { S(18, 64); R(g, 8, 0, 1, 40, '#3b2a35'); for (let i = 0; i < 6; i++) R(g, 2 + i * 3, 44, 1, 14, '#c49a3e'); ellipse(g, 9, 44, 8, 3, '#c49a3e'); R(g, 1, 57, 17, 2, '#8a5a3a'); R(g, 7, 50, 5, 4, '#ffd34d'); P(g, 11, 51, '#222'); P(g, 12, 52, '#ff8a3d'); }
    if (kind === 'basket') { S(24, 64); R(g, 0, 36, 24, 2, '#5a5470'); R(g, 11, 38, 1, 6, '#3b2a35'); ellipse(g, 11, 50, 9, 5, '#a8743e'); const r = rng(5); for (let i = 0; i < 14; i++) R(g, 3 + ((r() * 16) | 0), 43 + ((r() * 5) | 0), 3, 3, ['#ff5d7a', '#ffd34d', '#fff', '#b78cff'][i % 4]); line(g, 6, 54, 4, 60, '#4f9450'); line(g, 16, 54, 18, 60, '#4f9450'); }
    if (kind === 'icicle') { S(32, 64); R(g, 0, 38, 32, 6, '#9fe6ff'); R(g, 0, 38, 32, 2, '#e0f8ff'); R(g, 2, 0, 2, 38, '#5a6a90'); R(g, 28, 0, 2, 38, '#5a6a90'); for (let i = 1; i < 31; i += 4) { const h = 6 + (i % 3) * 3; for (let k = 0; k < h; k++) R(g, i + Math.floor(k / 4), 44 + k, Math.max(1, 3 - Math.floor(k / 3)), 1, '#bff0ff'); } }
    if (kind === 'banner') { S(28, 64); R(g, 3, 0, 1, 42, '#3b2a35'); R(g, 24, 0, 1, 42, '#3b2a35'); R(g, 0, 42, 28, 16, '#2a1d24'); R(g, 1, 43, 26, 14, '#ffd36e'); text(g, '查', 9, 44, 10, '#c0392b'); }
    outline(c);
    return { c, kind, high: ['signboard', 'birdcage', 'basket', 'icicle', 'banner'].includes(kind) };
  }


  /* ── 새 장애물: 두 번 점프 상자탑 / 굴러오는 공 / 날아오는 비둘기 ── */
  function tall(col) {
    const [c, g] = mk(20, 58);
    for (let i = 0; i < 3; i++) { const y = 58 - (i + 1) * 19; R(g, 0, y, 20, 19, '#b8834a'); R(g, 0, y, 20, 2, '#d8a468'); R(g, 0, y + 8, 20, 2, '#8a5a30'); R(g, 1, y + 2, 1, 17, '#d8a468'); }
    R(g, 4, 1, 12, 7, col); text(g, '高', 6, 0, 8, '#ffffff');
    return { c: outline(c), kind: 'tall', high: false, tall: true };
  }
  const ROLLPAL = { cq: ['#e2504c', '#f2c14e'], cd: ['#8a5a3a', '#c99252'], km: ['#4f9450', '#2f6a35'], heb: ['#f4f8ff', '#c8d6ee'], hq: ['#8a5a3a', '#c99252'] };
  function roller(theme) {
    const [a, b] = ROLLPAL[theme] || ROLLPAL.cq, fr = [];
    for (let f = 0; f < 4; f++) {
      const [c, g] = mk(18, 18); disc(g, 9, 9, 8, a);
      for (let k = 0; k < 3; k++) { const t = (k / 3 + f / 12) * Math.PI * 2; line(g, 9 - Math.cos(t) * 7, 9 - Math.sin(t) * 7, 9 + Math.cos(t) * 7, 9 + Math.sin(t) * 7, b, 2); }
      R(g, 5, 4, 3, 2, '#ffffff88'); fr.push(outline(c));
    }
    return { fr, kind: 'roll', high: false, c: fr[0] };
  }
  const BIRD = [0, 1].map(f => { const [c, g] = mk(16, 11);
    ellipse(g, 8, 7, 5, 3, '#8f96a8'); disc(g, 12, 5, 2, '#6f7688'); P(g, 13, 4, '#ffffff'); P(g, 15, 5, '#f2a03c'); R(g, 1, 7, 3, 1, '#6f7688');
    if (f) { line(g, 6, 6, 3, 0, '#b8bfd0', 2); } else { line(g, 6, 7, 3, 10, '#b8bfd0', 2); }
    R(g, 7, 7, 3, 1, '#7fd6a8'); return outline(c); });

  /* ── 아이템 ── */
  const ITEM = {};
  ITEM.clue = (() => { const [c, g] = mk(14, 16); disc(g, 6, 6, 5, '#f2c14e'); disc(g, 6, 6, 3, '#bfe6ff'); R(g, 4, 4, 2, 2, '#ffffff'); line(g, 9, 9, 12, 13, '#8a5a30', 2); return outline(c); })();
  ITEM.bike = (() => { const c = PX.rider('minhao', 0); const [c2, g] = mk(22, 16);
    const wheel = (x) => { disc(g, x, 11, 4, '#2a2430'); disc(g, x, 11, 2, '#bfbfcc'); P(g, x, 11, '#f2c14e'); };
    wheel(5); wheel(17); line(g, 5, 11, 10, 5, '#f2b631', 2); line(g, 10, 5, 16, 5, '#f2b631', 2); line(g, 10, 11, 16, 5, '#f2b631', 2); line(g, 16, 4, 17, 11, '#f2b631', 2); R(g, 15, 1, 4, 1, '#2a2430'); R(g, 8, 3, 4, 1, '#2a2430'); R(g, 16, 5, 5, 3, '#e8e2d0');
    return outline(c2); })();
  ITEM.heart = (() => { const [c, g] = mk(9, 8); [[1, 0, 2], [5, 0, 2], [0, 1, 9], [0, 2, 9], [0, 3, 9], [1, 4, 7], [2, 5, 5], [3, 6, 3], [4, 7, 1]].forEach(([x, y, w]) => R(g, x, y, w, 1, '#e2504c')); R(g, 1, 1, 2, 1, '#ff9a9a'); return c; })();

  /* ── 덩어리 관문 (세 칸 높이) ── */
  /* 2지선다 관문: 위 문(점프) · 가운데 벽 · 아래 틈(미끄러지기). 높이 104 */
  function gate(col) {
    const [c, g] = mk(30, 104);
    R(g, 0, 0, 5, 104, '#8a2a24'); R(g, 25, 0, 5, 104, '#8a2a24'); R(g, 1, 0, 2, 104, col); R(g, 26, 0, 2, 104, col);
    R(g, 5, 8, 20, 58, '#fff6dc44'); R(g, 5, 8, 20, 1, '#ffffff88');                 // 위 문
    R(g, 0, 66, 30, 24, '#6a2a24'); R(g, 0, 66, 30, 2, '#f2c14e'); R(g, 0, 88, 30, 2, '#f2c14e');   // 가운데 벽
    for (let x = 3; x < 28; x += 6) R(g, x, 70, 3, 16, '#8a3a2e');
    R(g, 11, 71, 8, 13, '#2a1d24'); text(g, '?', 12, 70, 10, '#ffd36e');
    R(g, 5, 90, 20, 14, '#fff6dc44');                                                  // 아래 틈
    R(g, 0, 0, 30, 8, '#c0392b'); R(g, 0, 0, 30, 1, '#f2c14e'); R(g, -2, 0, 34, 2, '#2a1d24');
    return outline(c);
  }
  const BARS = (() => { const [c, g] = mk(20, 58); for (let x = 1; x < 20; x += 4) R(g, x, 0, 2, 58, '#4a4458'); [12, 30, 46].forEach(y => R(g, 0, y, 20, 2, '#4a4458')); return c; })();
  const BARS_DN = (() => { const [c, g] = mk(20, 13); for (let x = 1; x < 20; x += 4) R(g, x, 0, 2, 13, '#4a4458'); R(g, 0, 5, 20, 2, '#4a4458'); return c; })();

  /* ── 결승 탑 (덩어리 사다리) ── */
  function towerScene(theme, W, cx) {
    const t = THEMES[theme](); const [c, g] = mk(W, H);
    t.sky(g); g.drawImage(t.layers[0].c, 0, 0);
    const tx = Math.round((cx == null ? W / 2 : cx) - 34), tw = 68, r = rng(40);
    const cols = { cq: ['#e9e2d6', '#b9b0a4', '#9fb6c0'], cd: ['#f3eee2', '#c9bfa8', '#b03a2e'], km: ['#fbe3e8', '#d8b0bc', '#ff9ab3'], heb: ['#9fe6ff', '#5cc4e8', '#e0f8ff'], hq: ['#5a4a6c', '#3a2a4c', '#ffd36e'] }[theme];
    R(g, tx, 28, tw, GY - 28, cols[0]); R(g, tx + tw - 6, 28, 6, GY - 28, cols[1]);
    for (let i = 0; i < 6; i++) {
      const fy = GY - 22 - i * 23;
      R(g, tx - 6, fy, tw + 12, 4, '#2a1d24'); R(g, tx - 5, fy, tw + 10, 2, theme === 'cd' ? '#5d6070' : '#7b7590');
      for (let k = 0; k < 5; k++) { R(g, tx + 6 + k * 12, fy - 14, 6, 9, '#3b3550'); R(g, tx + 7 + k * 12, fy - 13, 4, 7, r() < .5 ? '#ffd98a' : cols[2]); }
      text(g, String(i + 1), tx - 14, fy - 10, 8, '#ffffff');
    }
    if (theme === 'cq') { R(g, 0, GY - 70, W, 3, '#5a5470'); R(g, tx - 1, GY - 74, tw + 2, 10, '#2a2438'); }
    if (theme === 'cd') for (let i = 0; i < 6; i++) { const fy = GY - 22 - i * 23; for (let k = 0; k < 5; k++) R(g, tx - 10 + k, fy - 2 - k, tw + 20 - k * 2, 1, '#5d6070'); }
    // 탑 꼭대기: 도시의 '말 도장(话印)'
    R(g, tx + 33, 4, 2, 24, '#5a4a3a');
    disc(g, tx + 34, 14, 9, '#8a5a18'); disc(g, tx + 34, 14, 8, '#f2c14e'); disc(g, tx + 34, 14, 6, '#ffd36e');
    text(g, '话', tx + 28, 6, 11, '#8a3a18');
    g.drawImage(t.ground, 0, GY);
    return c;
  }

  /* ── 중국 노선 지도 (한국 자세히) ── */
  const MAP = { W: 560, H: 360, lon0: 70, lon1: 140, lat0: 55, lat1: 15 };
  const proj = (lon, lat) => [Math.round((lon - MAP.lon0) / (MAP.lon1 - MAP.lon0) * MAP.W), Math.round((lat - MAP.lat0) / (MAP.lat1 - MAP.lat0) * MAP.H)];
  const CHINA = [[73.5, 39.5], [75, 37.2], [77.8, 35.5], [79.5, 32.8], [78.8, 31], [81, 30.2], [85, 28.4], [88.1, 27.9], [89.5, 28.1], [91.6, 27.8], [92.1, 26.9], [95, 29.2], [97.4, 28.2], [98.2, 27.5], [98.7, 25.5], [97.6, 23.9], [99.3, 22.2], [101.6, 21.2], [102.3, 22.4], [103.2, 22.6], [105.3, 23.2], [106.6, 22.4], [107.9, 21.6], [109.2, 21.5], [109.8, 21.4], [110.2, 20.3], [110.6, 21.2], [111.6, 21.5], [113.1, 22.1], [113.6, 22.6], [114.3, 22.3], [115.4, 22.8], [116.6, 23.2], [117.6, 23.9], [118.6, 24.6], [119.5, 25.4], [119.8, 26.6], [120.6, 27.4], [121.4, 28.3], [121.9, 29.3], [121.8, 30.1], [121, 30.6], [121.9, 31.1], [121.4, 31.8], [120.9, 32.4], [120.4, 33.2], [119.6, 34.4], [119.2, 35], [120.3, 35.9], [120.9, 36.4], [122.5, 36.9], [122.2, 37.4], [121, 37.7], [120.3, 37.6], [119.2, 37.2], [118.9, 37.5], [118.1, 38.2], [117.6, 38.6], [117.8, 39.1], [118.9, 39.3], [119.6, 39.9], [120.6, 40.4], [121.2, 40.9], [121.9, 40.7], [121.2, 39.5], [121.6, 38.9], [122.3, 39.4], [123, 39.7], [124.3, 39.9], [125.4, 40.8], [126.3, 41.7], [127, 41.6], [128.1, 42], [128.9, 42.1], [129.4, 42.4], [130.1, 42.9], [130.6, 42.5], [131.1, 42.9], [131.3, 44.4], [131, 45], [132.9, 45], [133.5, 45.9], [134.2, 47.2], [134.7, 48.3], [133.1, 48.3], [131.7, 47.7], [130.7, 48.9], [129.6, 49.4], [127.5, 49.8], [126.6, 51.4], [125.8, 52.8], [123.4, 53.5], [121, 53.3], [119.8, 52.6], [120.7, 52.2], [119.3, 50.3], [117.9, 49.5], [116.6, 49.8], [115.5, 48.2], [117.4, 47.6], [119.8, 47], [118.6, 46.7], [116, 45.7], [113.6, 44.8], [111.8, 45.1], [111.3, 43.6], [110.4, 42.8], [107.4, 42.4], [105, 41.6], [101.8, 42.5], [96.4, 42.8], [95.4, 44.3], [93.5, 44.9], [91, 45.4], [90.7, 47.3], [88.8, 48.1], [87.8, 49.2], [86.8, 49], [85.6, 47.1], [83.1, 47.2], [82.6, 45.5], [80.2, 45.1], [80.3, 42.9], [79.6, 42.4], [77, 41.1], [74, 40.4]];
  const KOREA = [[124.3, 39.9], [124.7, 39.6], [125.1, 39.6], [125.4, 39.2], [125.2, 38.8], [124.9, 38.6], [124.7, 38.2], [125.0, 37.95], [125.4, 37.9], [125.7, 37.75], [126.15, 37.75], [126.5, 37.85], [126.65, 37.65], [126.55, 37.4], [126.75, 37.15], [126.5, 37.0], [126.2, 36.8], [126.3, 36.55], [126.5, 36.35], [126.65, 36.05], [126.6, 35.85], [126.45, 35.6], [126.35, 35.3], [126.45, 35.05], [126.25, 34.75], [126.35, 34.45], [126.6, 34.35], [126.9, 34.45], [127.15, 34.6], [127.45, 34.65], [127.6, 34.85], [127.85, 34.75], [128.05, 34.9], [128.35, 34.85], [128.6, 35.0], [128.85, 35.05], [129.1, 35.1], [129.3, 35.35], [129.45, 35.6], [129.55, 36.05], [129.45, 36.5], [129.4, 37.0], [129.15, 37.45], [128.9, 37.8], [128.55, 38.2], [128.35, 38.6], [127.95, 39.05], [127.55, 39.3], [127.45, 39.75], [127.9, 39.95], [128.45, 40.1], [129.05, 40.5], [129.7, 40.9], [129.85, 41.4], [130.15, 41.9], [130.6, 42.3], [130.4, 42.55], [129.9, 42.95], [129.4, 42.4], [128.9, 42.1], [128.1, 42.0], [127.0, 41.6], [126.3, 41.7], [125.4, 40.8]];
  const ISLANDS_KR = [[126.55, 33.37, 2.6, 1.1], [128.65, 34.85, .9, .6], [127.9, 34.8, .7, .5], [126.25, 34.45, .7, .5], [126.0, 34.75, .4, .4], [125.9, 35.0, .3, .3], [126.15, 34.15, .3, .3], [126.3, 37.68, .6, .4], [130.87, 37.5, .5, .5], [131.87, 37.24, .2, .2]];
  const TAIWAN = [[120.1, 23.0], [120.7, 22.0], [121.4, 22.8], [121.6, 23.9], [121.9, 25.0], [121.5, 25.3], [120.9, 24.9], [120.3, 24.0]];
  const HAINAN = [[108.6, 19.2], [109.5, 18.2], [110.5, 18.6], [111.0, 19.7], [110.4, 20.1], [109.2, 20.0]];
  const JAPAN = [[129.6, 33.2], [130.2, 31.3], [131.3, 31.4], [132.0, 33.0], [131.0, 33.9], [131.9, 34.0], [133.2, 34.3], [135.2, 34.5], [136.8, 34.9], [138.8, 34.7], [139.8, 35.0], [140, 36.5], [140.5, 38.5], [139.6, 38.5], [138.9, 37.8], [137.3, 36.8], [136.0, 35.7], [133.3, 35.5], [131.6, 34.6], [130.9, 34.2]];
  const YANGTZE = [[91, 33.5], [95, 33.2], [97.5, 31.5], [99, 28], [100.5, 26.8], [102.5, 26.5], [104.6, 28.8], [106.5, 29.6], [108, 30.4], [110.5, 30.8], [112, 30.2], [114.3, 30.6], [116, 29.8], [117.6, 30.8], [119, 32], [121.4, 31.5]];
  const YELLOW = [[96, 35], [99, 35.5], [101.5, 36], [103.8, 36.1], [105.5, 37.5], [106.5, 39.5], [108, 40.7], [110.5, 40.3], [110.5, 37.5], [110.4, 35.2], [113.5, 34.8], [116, 35.8], [117.5, 37], [118.9, 37.6]];
  const ci = CHINA.findIndex(p => p[0] === 107.9), ce = CHINA.findIndex(p => p[0] === 124.3);
  const SEA_E = [[105.6, 15], [108.9, 15], [109.3, 16.5], [108.6, 18.2], [107.6, 19.6], [106.7, 20.7]].concat(CHINA.slice(ci, ce + 1))
    .concat([[124.8, 39.4], [125.2, 38.6], [126.3, 37.9], [126.4, 34.6], [128.5, 34.6], [129.6, 35.6], [129.6, 37], [128.6, 38.4], [127.6, 39.4], [128.8, 40.3], [130.2, 41.6], [130.75, 42.3], [131.8, 43.0], [133.2, 42.8], [135.3, 43.8], [137.4, 45.4], [138.6, 46.8], [140.2, 48.6], [140.6, 55], [141, 55], [141, 15]]);
  const SEA_BENGAL = [[79.8, 15], [80.2, 15.8], [81.5, 17.0], [84.5, 18.8], [86.5, 20.2], [87, 21.5], [88.6, 22], [90.4, 22.2], [91.6, 22.6], [92.4, 20.7], [93.6, 19.2], [94.4, 16.4], [96.4, 16.6], [97.6, 16.6], [98.2, 15]];
  const SEA_ARAB = [[69, 15], [73.6, 15], [73, 18.5], [72.8, 20.5], [72.6, 21.8], [70.5, 22.5], [69, 22.5]];
  function inPoly(x, y, poly) { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins; } return ins; }
  let mapCache = null;
  function mapCanvas() {
    if (mapCache) return mapCache;
    const [c, g] = mk(MAP.W, MAP.H);
    const P2 = poly => poly.map(([lo, la]) => proj(lo, la));
    const china = P2(CHINA), korea = P2(KOREA), tw = P2(TAIWAN), hn = P2(HAINAN), jp = P2(JAPAN);
    const land = new Uint8Array(MAP.W * MAP.H); // 0 바다 1 중국 2 한국 3 기타
    const SEAS = [SEA_E, SEA_BENGAL, SEA_ARAB].map(P2);
    const isl = ISLANDS_KR.map(([lo, la, rx, ry]) => { const [x, y] = proj(lo, la); return [x, y, rx, ry]; });
    for (let y = 0; y < MAP.H; y++) for (let x = 0; x < MAP.W; x++) {
      let v = 0;
      if (inPoly(x + .5, y + .5, korea) || isl.some(([ix, iy, rx, ry]) => ((x - ix) / rx) ** 2 + ((y - iy) / ry) ** 2 <= 1)) v = 2;
      else if (inPoly(x + .5, y + .5, china) || inPoly(x + .5, y + .5, hn)) v = 1;
      else if (inPoly(x + .5, y + .5, tw) || inPoly(x + .5, y + .5, jp)) v = 3;
      else if (!SEAS.some(sp => inPoly(x + .5, y + .5, sp))) v = 4;   // 이웃 나라 땅
      land[y * MAP.W + x] = v;
    }
    const r = rng(77);
    // 바다
    PX.vgrad(g, 0, 0, MAP.W, MAP.H, ['#3a76b8', '#3f82c4', '#4a8ed0']);
    for (let y = 2; y < MAP.H; y += 6) for (let x = (y * 7) % 13; x < MAP.W; x += 17) R(g, x, y, 4, 1, '#6aa8e0');
    for (let y = 0; y < MAP.H; y++) for (let x = 0; x < MAP.W; x++) {
      const v = land[y * MAP.W + x]; if (!v) continue;
      let [lon, lat] = [MAP.lon0 + x / MAP.W * (MAP.lon1 - MAP.lon0), MAP.lat0 + y / MAP.H * (MAP.lat1 - MAP.lat0)];
      let col;
      if (v === 2) col = (x + y) % 2 ? '#f6e7c4' : '#f1dfb8';
      else if (v === 3 || v === 4) col = (x * 3 + y) % 5 ? '#c8c6b6' : '#bcbaa9';
      else {
        const n = r(); lat += Math.sin(lon * .9) * .9 + Math.sin(lon * 2.3 + lat) * .5; lon += Math.sin(lat * 1.1) * 1.2;
        if (lon < 97 && lat < 36.5 && lat > 27.5) col = n < .1 ? '#ffffff' : n < .5 ? '#cdb89a' : '#c2ab8b';           // 티베트 고원
        else if ((lon < 104 && lat > 37) || (lon < 112 && lat > 41)) col = n < .4 ? '#e2cf98' : '#d9c48a';             // 사막·초원
        else if (lat > 41) col = n < .4 ? '#9cc77c' : '#8fbd70';                                                   // 동북
        else if (lat > 32) col = n < .4 ? '#b9cf86' : '#acc47a';                                                   // 화북
        else col = n < .4 ? '#7fbc6a' : '#72b05e';                                                                  // 남쪽
      }
      P(g, x, y, col);
    }
    // 해안선 (바다와 닿는 땅) + 물거품
    for (let y = 1; y < MAP.H - 1; y++) for (let x = 1; x < MAP.W - 1; x++) {
      const v = land[y * MAP.W + x]; const nb = [land[y * MAP.W + x + 1], land[y * MAP.W + x - 1], land[(y + 1) * MAP.W + x], land[(y - 1) * MAP.W + x]];
      if (v && nb.some(n => !n)) P(g, x, y, v === 2 ? '#c9a66a' : v === 1 ? '#4f8a48' : '#8f8d80');
      else if (!v && nb.some(n => n)) P(g, x, y, '#9fd0f2');
      else if (v === 1 && nb.some(n => n === 2 || n === 4)) P(g, x, y, '#5a6a50');   // 땅 경계
    }
    // 산 (티베트·서쪽)
    for (let i = 0; i < 26; i++) { const [x, y] = proj(80 + r() * 18, 29 + r() * 7); R(g, x - 2, y, 5, 1, '#8a7a64'); R(g, x - 1, y - 1, 3, 1, '#a8987e'); P(g, x, y - 2, '#fff'); }
    // 강
    [[YANGTZE, '#4a9ad8'], [YELLOW, '#c8a24a']].forEach(([pts, col]) => { for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [proj(...pts[i]), proj(...pts[i + 1])]; line(g, a[0], a[1], b[0], b[1], col); } });
    text(g, '长江', proj(110, 30.3)[0], proj(110, 30.3)[1] + 1, 7, '#2a6aa8'); text(g, '黄河', proj(108.5, 38.8)[0], proj(108.5, 38.8)[1], 7, '#8a6a2a');
    // 한국 표시: 서울 별 + 이름
    const [sx, sy] = proj(126.98, 37.57); R(g, sx - 1, sy - 1, 3, 3, '#e2504c'); P(g, sx, sy, '#fff');
    text(g, '서울', sx + 3, sy - 6, 7, '#7a3a2a', "'Jua', sans-serif", 400);
    const [kx, ky] = proj(127.6, 36.3); text(g, '한국', kx - 3, ky, 9, '#7a4a2a', "'Jua', sans-serif", 400);
    const [jx, jy] = proj(126.55, 33.37); text(g, '제주', jx + 6, jy - 4, 6, '#7a4a2a', "'Jua', sans-serif", 400);
    const [dx, dy] = proj(131.87, 37.24); text(g, '독도', dx - 4, dy + 3, 6, '#7a4a2a', "'Jua', sans-serif", 400);
    const [ux, uy] = proj(130.87, 37.5); text(g, '울릉도', ux - 8, uy - 9, 6, '#7a4a2a', "'Jua', sans-serif", 400);
    const [cx0, cy0] = proj(103, 33.5); text(g, '中国', cx0, cy0, 12, '#3f6a3a');
    text(g, '黄海', proj(123.2, 35.5)[0], proj(123.2, 35.5)[1], 7, '#cfe6fb'); text(g, '东海', proj(125, 29.5)[0], proj(125, 29.5)[1], 7, '#cfe6fb');
    // 노선 (철길)
    const order = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => CITY_MAP.find(c => c.no === n));
    const route = [[1, 2], [2, 3], [1, 6], [6, 11], [11, 12], [6, 5], [5, 4], [1, 7], [7, 8], [8, 9], [9, 10], [10, 5]];
    route.forEach(([a, b]) => { const A = order[a - 1], B = order[b - 1]; const [x0, y0] = proj(A.lon, A.lat), [x1, y1] = proj(B.lon, B.lat); line(g, x0, y0, x1, y1, '#3b2a35', 3); line(g, x0, y0, x1, y1, '#e9e2d6');
      const n = Math.hypot(x1 - x0, y1 - y0) / 5; for (let i = 1; i < n; i++) { const t = i / n; P(g, Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), '#8a7a70'); } });
    return mapCache = { c, proj };
  }
  /* 도시 표시 아이콘 (작은 랜드마크) */
  function cityIcon(no, state) {
    const [c, g] = mk(18, 18);
    const base = state === 'lock' ? '#8a8494' : state === 'done' ? '#5fae6e' : '#e2504c';
    disc(g, 9, 9, 7, base); disc(g, 9, 9, 5, '#fff8ec');
    const I = {
      1: () => { R(g, 6, 5, 6, 9, '#9aa6b8'); R(g, 4, 9, 10, 2, '#e2504c'); },
      2: () => { disc(g, 9, 9, 3, '#f6f6f2'); P(g, 7, 7, '#222'); P(g, 11, 7, '#222'); R(g, 8, 9, 3, 1, '#222'); },
      3: () => { R(g, 8, 5, 2, 2, '#ff5d7a'); R(g, 6, 7, 2, 2, '#ffd34d'); R(g, 10, 7, 2, 2, '#ff9ab3'); R(g, 8, 9, 2, 4, '#4f9450'); },
      4: () => { R(g, 8, 5, 2, 8, '#7fe0ff'); R(g, 6, 8, 6, 2, '#7fe0ff'); R(g, 6, 12, 6, 1, '#3fb4e0'); },
      5: () => { R(g, 5, 7, 8, 2, '#c0392b'); R(g, 6, 9, 6, 4, '#e2504c'); R(g, 4, 6, 10, 1, '#f2c14e'); },
      6: () => { R(g, 7, 5, 4, 3, '#b08a5a'); R(g, 6, 8, 6, 5, '#b08a5a'); },
      7: () => { R(g, 8, 4, 2, 9, '#7a8aa8'); R(g, 7, 7, 4, 2, '#9aa6c0'); },
      8: () => { R(g, 6, 6, 2, 7, '#4f8fdc'); R(g, 10, 4, 2, 9, '#4f8fdc'); },
      9: () => { R(g, 8, 4, 2, 2, '#ffd34d'); R(g, 6, 6, 6, 4, '#2f8a4a'); R(g, 7, 10, 4, 2, '#2f8a4a'); },
      10: () => { R(g, 8, 4, 2, 9, '#b78cff'); disc(g, 9, 7, 2, '#ff9ab3'); disc(g, 9, 11, 1, '#ff9ab3'); },
      11: () => { R(g, 5, 9, 8, 3, '#f2c14e'); line(g, 6, 8, 12, 6, '#fff'); },
      12: () => { disc(g, 9, 8, 3, '#ff8a3d'); R(g, 5, 11, 8, 2, '#d9c48a'); }
    };
    (I[no] || (() => {}))();
    if (state === 'lock') { R(g, 7, 9, 5, 4, '#5a5470'); R(g, 8, 7, 3, 2, '#5a5470'); }
    return outline(c);
  }

  return { H, GY, LW, THEMES, ITEM, tall, roller, BIRD, BARS, BARS_DN, gate, towerScene, mapCanvas, cityIcon, MAP };
})();
