/* 🎮 미니게임 모음 — 달리기 중간 이벤트
   1) 골목 피하기 (dodge): 윗집에서 똥·돌·쓰레기가 떨어져요. ◀ ▶ 로 피하면서, 뜻에 맞는 '단어 동전'만 받아요.
   game.js의 전역(R, ctx, W, H, GY, pad, ov, save, set, Sound, PX, ART ...)을 같이 써요. */
const MINI = (() => {
  /* ── 떨어지는 물건 그림 ── */
  const SPR = {};
  SPR.poop = (() => { const [c, g] = PX.mk(14, 13); [[3, 10, 8], [1, 11, 12], [2, 7, 10], [4, 4, 6], [6, 1, 3]].forEach(([x, y, w]) => PX.R(g, x, y, w, 3, '#8a5a30')); PX.R(g, 1, 11, 12, 1, '#6a4020'); PX.R(g, 4, 5, 2, 1, '#b07a48'); PX.R(g, 3, 8, 3, 1, '#b07a48'); PX.R(g, 7, 2, 1, 1, '#b07a48'); PX.R(g, 4, 8, 2, 2, '#fff'); PX.R(g, 8, 8, 2, 2, '#fff'); PX.P(g, 5, 9, '#1d1424'); PX.P(g, 9, 9, '#1d1424'); return PX.outline(c); })();
  SPR.stone = (() => { const [c, g] = PX.mk(13, 11); PX.ellipse(g, 6, 6, 6, 4, '#8f8a96'); PX.ellipse(g, 5, 4, 3, 2, '#b8b4c0'); PX.R(g, 8, 7, 2, 1, '#6a6474'); PX.R(g, 3, 8, 2, 1, '#6a6474'); return PX.outline(c); })();
  SPR.can = (() => { const [c, g] = PX.mk(9, 12); PX.R(g, 1, 1, 7, 10, '#e2504c'); PX.R(g, 1, 1, 7, 1, '#c8c8d0'); PX.R(g, 1, 10, 7, 1, '#c8c8d0'); PX.R(g, 2, 4, 5, 3, '#fff6dc'); PX.R(g, 6, 2, 1, 8, '#ff8a7a'); return PX.outline(c); })();
  SPR.peel = (() => { const [c, g] = PX.mk(14, 10); PX.line(g, 2, 8, 6, 2, '#f2c14e', 2); PX.line(g, 7, 2, 12, 8, '#f2c14e', 2); PX.line(g, 6, 2, 7, 8, '#e0a830', 2); PX.R(g, 6, 0, 2, 2, '#6a4020'); return PX.outline(c); })();
  SPR.bottle = (() => { const [c, g] = PX.mk(7, 14); PX.R(g, 2, 0, 3, 4, '#5fae6e'); PX.R(g, 1, 4, 5, 9, '#4f9450'); PX.R(g, 2, 5, 1, 7, '#9fe0a8'); PX.R(g, 2, 0, 3, 1, '#c8c8d0'); return PX.outline(c); })();
  SPR.coin = [0, 1, 2, 3].map(f => { const [c, g] = PX.mk(22, 22); const w = [10, 7, 3, 7][f]; PX.ellipse(g, 11, 11, w, 10, '#c48a18'); PX.ellipse(g, 11, 11, Math.max(1, w - 1), 9, '#f2c14e'); if (w > 4) PX.ellipse(g, 11, 11, w - 3, 7, '#ffd36e'); PX.R(g, 11 - Math.floor(w / 2), 4, 2, 2, '#fff6dc'); return PX.outline(c); });
  const JUNK = ['poop', 'poop', 'stone', 'can', 'peel', 'bottle'];

  let D = null;
  /* ── 골목 피하기 시작 ── */
  async function dodge(cs, run) {
    go('dodge'); Sound.bgm('dodge');
    const pool = cs.clues.map((c, i) => i);
    const targets = shuffle(pool).slice(0, 3);
    D = { cs, run, t: 0, x: W / 2 - 11, dir: 0, face: 1, items: [], spawn: .6, tgt: targets, ti: 0, got: 0, need: 3, done: false, hurtT: 0, inv: 0, end: 0, wins: [], miss: 0 };
    for (let i = 0; i < 8; i++) D.wins.push({ x: 14 + i * ((W - 40) / 7), who: pick(['auntie', 'uncle', 'grandpa', 'student']), show: 0 });
    pad.innerHTML = `<div class="rtop"><div class="hudrun"><span id="hearts"></span><span id="dg">🎯 0/3</span><span id="dt"></span></div><div id="gq" class="on"></div><div id="msg"></div></div>
      <div class="ctrl"><button class="cbtn slide" id="bL">◀<small>왼쪽</small></button><button class="cbtn jump" id="bR">▶<small>오른쪽</small></button></div>
      <div class="small center">버튼을 꾹 누르거나 화면 왼쪽·오른쪽을 눌러요 · 키보드 ← →</div>`;
    const hold = (b, d) => { b.addEventListener('pointerdown', e => { e.preventDefault(); D.dir = d; }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(k => b.addEventListener(k, () => { if (D.dir === d) D.dir = 0; })); };
    hold($('#bL'), -1); hold($('#bR'), 1);
    hud(); prompt();
    if (!save.tutDodge) {
      save.tutDodge = 1; persist();
      const c = card(`<h2>🏚 골목 이벤트!</h2><div class="t">윗집 창문에서 <b>💩 똥, 돌, 쓰레기</b>가 떨어져요!</div>
        <div class="small" style="margin:1em 0;font-size:1.1em">◀ ▶ 로 왔다 갔다 피하고,<br>🪙 <b>위에 적힌 뜻과 같은 단어 동전</b>만 받아요!</div>
        <div class="t">땅의 그림자를 보면 어디로 떨어질지 알 수 있어요.</div><div class="row"><button class="big go">좋아, 피해 보자!</button></div>`);
      await wait(c);
    }
  }
  function hud() {
    const h = $('#hearts'); if (!h) return;
    h.innerHTML = '❤'.repeat(Math.max(0, R.hearts)) + '<span class="off">' + '❤'.repeat(3 - Math.max(0, R.hearts)) + '</span>';
    $('#dg').textContent = `🎯 ${D.got}/${D.need}`;
  }
  function prompt() {
    const c = D.cs.clues[D.tgt[D.ti]];
    $('#gq').innerHTML = `🪙 「${esc(c[2])}」 단어 동전을 받아요!${set.py ? ` <small>힌트: ${esc(c[1])}</small>` : ''}`;
  }
  function spawn() {
    const x = 6 + Math.random() * (W - 30), win = D.wins.reduce((a, b) => Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a);
    win.show = .8;
    const coinP = D.items.filter(i => i.k === 'coin').length < 2 ? .42 : .1;
    if (Math.random() < coinP) {
      const right = Math.random() < .5, ci = right ? D.tgt[D.ti] : pick(D.cs.clues.map((c, i) => i).filter(i => i !== D.tgt[D.ti]));
      const lab = el(`<div class="coinlab">${esc(D.cs.clues[ci][0])}</div>`); ov.appendChild(lab);
      D.items.push({ k: 'coin', ci, x, y: 30, vy: 34 + Math.random() * 14, lab, w: 22, h: 22 });
    } else {
      const k = pick(JUNK), s = SPR[k];
      D.items.push({ k, x, y: 30, vy: 60 + Math.random() * 40 + Math.min(50, D.t * 2), spin: Math.random() * 6, w: s.width, h: s.height });
      if (Math.random() < .3) Sound.sfx('whoosh');
    }
  }
  function update(dt) {
    if (!D || D.done || R.paused || uiRoot.querySelector('.card,.box')) return;
    D.t += dt;
    D.spawn -= dt; if (D.spawn <= 0) { spawn(); D.spawn = Math.max(.35, .9 - D.t * .02) * (0.7 + Math.random() * .6); }
    const sp = 150; D.x = Math.max(4, Math.min(W - 26, D.x + D.dir * sp * dt)); if (D.dir) D.face = D.dir;
    if (D.hurtT > 0) D.hurtT -= dt; if (D.inv > 0) D.inv -= dt;
    D.wins.forEach(w => { if (w.show > 0) w.show -= dt; });
    const px0 = D.x + 6, px1 = D.x + 18, py0 = GY - 30;
    for (const it of D.items) {
      it.y += it.vy * dt; if (it.k !== 'coin') it.vy += 30 * dt;
      const hit = it.x + it.w - 2 > px0 && it.x + 2 < px1 && it.y + it.h > py0 && it.y < GY;
      if (hit && !it.gone) {
        it.gone = true;
        if (it.k === 'coin') {
          const ok = it.ci === D.tgt[D.ti], c = D.cs.clues[it.ci];
          if (ok) { D.got++; Sound.sfx('clue'); speak(c[0]); msg(`⭕ <b>${esc(c[0])}</b> <span>${esc(c[1])}</span> · ${esc(c[2])}`, 'ok', 1500); if (D.got >= D.need) return finish(); D.ti++; prompt(); }
          else { D.miss++; Sound.sfx('bad'); speak(c[0]); msg(`✖ <b>${esc(c[0])}</b>은(는) '${esc(c[2])}' · 찾는 건 '${esc(D.cs.clues[D.tgt[D.ti]][2])}'`, 'no', 1800); }
          hud();
        } else if (D.inv <= 0) {
          D.inv = 1.1; D.hurtT = .5; R.hearts--; Sound.sfx(it.k === 'poop' ? 'splat' : 'hurt'); hud();
          msg(it.k === 'poop' ? '💩 으악! 똥 맞았다!' : '🪨 아야!', 'no', 1100);
          if (R.hearts <= 0) { D.done = true; clearLabs(); return failRun(); }
        }
      }
      if (it.y > GY - it.h + 2 && !it.gone) { it.gone = true; if (it.k !== 'coin') { it.land = .5; it.ly = GY - it.h + 2; if (it.k === 'poop') Sound.sfx('splat'); } }
    }
    D.items.forEach(it => { if (it.land > 0) it.land -= dt; if (it.gone && it.lab) { it.lab.remove(); it.lab = null; } });
    D.items = D.items.filter(it => !it.gone || it.land > 0);
    if (D.t > 45 && !D.done) finish(true);
  }
  function clearLabs() { D.items.forEach(it => it.lab && it.lab.remove()); }
  async function finish(timeout) {
    D.done = true; clearLabs(); D.items = [];
    Sound.sfx('cheer');
    const bonus = !timeout && R.hearts < 3 && D.miss === 0;
    if (bonus) R.hearts++;
    msg(timeout ? '⏰ 시간 끝! 골목을 빠져나왔어요' : `🎉 단어 동전 ${D.need}개 성공!${bonus ? ' 실수 없음 보너스 ❤ +1' : ''}`, 'ok', 2000);
    R.mini = (R.mini || []).concat({ k: 'dodge', got: D.got, miss: D.miss });
    await sleep(1600);
    D = null;
    go('run'); Sound.bgm(R.boss ? 'hq' : R.cs.theme); runPad(); setTop(); R.gateNow = null;
  }
  function draw(t) {
    if (!D) return;
    const th = THEME;
    // 하늘 + 아파트 벽
    if (skyC) ctx.drawImage(skyC, 0, 0);
    PX.R(ctx, 0, 18, W, GY - 18, '#c9a88a'); PX.dither(ctx, 0, 18, W, 6, '#b8967a', '#c9a88a', .5);
    for (let y = 30; y < GY - 20; y += 34) { PX.R(ctx, 0, y + 26, W, 3, '#a8866a'); }
    D.wins.forEach((w, i) => {
      for (let r = 0; r < 4; r++) {
        const wx = Math.round(w.x), wy = 26 + r * 34;
        PX.R(ctx, wx, wy, 18, 20, '#3b2a35'); PX.R(ctx, wx + 1, wy + 1, 16, 18, r === 0 && w.show > 0 ? '#ffd98a' : '#6a8ab0'); PX.R(ctx, wx + 8, wy + 1, 1, 18, '#3b2a35');
        if (r > 0 && (i + r) % 3 === 0) { PX.R(ctx, wx - 2, wy + 20, 22, 2, '#7a6a5a'); for (let k = 0; k < 3; k++) PX.R(ctx, wx + 1 + k * 6, wy + 22, 4, 6, ['#e2504c', '#7fb2ec', '#ffd36e'][(i + k) % 3]); }
      }
      if (w.show > 0) { const im = PX.person(w.who, 'talk', Math.floor(t / 140) % 2, 'talk'); ctx.save(); ctx.beginPath(); ctx.rect(Math.round(w.x) + 1, 27, 16, 18); ctx.clip(); ctx.drawImage(im, Math.round(w.x) - 4, 28); ctx.restore(); }
    });
    for (let x = 0; x < W; x += ART.LW) ctx.drawImage(th.ground, x, GY);
    // 그림자 (떨어질 자리)
    D.items.forEach(it => { if (it.gone) return; const k = Math.max(0, Math.min(1, (it.y - 30) / (GY - 50))); PX.ellipse(ctx, Math.round(it.x + it.w / 2), GY + 1, Math.round(2 + k * it.w / 2.2), 1, it.k === 'coin' ? 'rgba(242,193,78,.5)' : 'rgba(0,0,0,.25)'); });
    // 떨어지는 것들
    D.items.forEach(it => {
      if (it.k === 'coin') { if (!it.gone) { ctx.drawImage(SPR.coin[Math.floor(t / 120 + it.x) % 4], Math.round(it.x), Math.round(it.y)); if (it.lab) { it.lab.style.left = gx(it.x + 11) + 'px'; it.lab.style.top = gx(it.y + 11) + 'px'; } } }
      else if (it.land > 0) { ctx.globalAlpha = Math.min(1, it.land * 2); ctx.drawImage(SPR[it.k], Math.round(it.x), Math.round(it.ly)); ctx.globalAlpha = 1; if (it.k === 'poop') { PX.R(ctx, it.x - 2, GY - 1, it.w + 4, 2, '#8a5a30'); } }
      else ctx.drawImage(SPR[it.k], Math.round(it.x), Math.round(it.y));
    });
    // 民浩
    if (!(D.inv > 0 && Math.floor(t / 80) % 2)) {
      let im = D.hurtT > 0 ? PX.person('minhao', 'hurt') : D.dir ? PX.person('minhao', 'run', Math.floor(t / 80) % 6) : PX.person('minhao', 'stand', 0, (t % 3000) < 120 ? 'blink' : undefined);
      if (D.face < 0) im = PX.flip(im);
      ctx.drawImage(im, Math.round(D.x), GY - PX.SH + 1);
    }
  }
  function key(e, down) {
    if (!D) return;
    const L = ['ArrowLeft', 'a', 'A'].includes(e.key), Rr = ['ArrowRight', 'd', 'D'].includes(e.key);
    if (!L && !Rr) return; e.preventDefault();
    if (down) D.dir = L ? -1 : 1; else if ((L && D.dir < 0) || (Rr && D.dir > 0)) D.dir = 0;
  }
  function pointer(e, k) {
    if (!D) return;
    if (k === 'up') { D.dir = 0; return; }
    if (k === 'down' || (k === 'move' && e.buttons)) { const r = cv.getBoundingClientRect(); D.dir = (e.clientX - r.left) < r.width / 2 ? -1 : 1; }
  }
  return { dodge, update, draw, key, pointer, get D() { return D; } };
})();
