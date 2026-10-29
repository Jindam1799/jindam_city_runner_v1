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
  SPR.coin = [0, 1, 2, 3].map(f => { const [c, g] = PX.mk(14, 14); const w = [6, 4, 2, 4][f]; PX.ellipse(g, 7, 7, w, 6, '#c48a18'); PX.ellipse(g, 7, 7, Math.max(1, w - 1), 5, '#f2c14e'); if (w > 3) PX.ellipse(g, 7, 7, w - 2, 3, '#ffd36e'); PX.R(g, 7 - Math.floor(w / 2), 2, 1, 1, '#fff6dc'); return PX.outline(c); });
  const JUNK = ['poop', 'poop', 'stone', 'can', 'peel', 'bottle'];

  let D = null, CUR = null, CD = 0;
  const stars = miss => miss === 0 ? 3 : miss <= 2 ? 2 : 1;
  const rank = miss => '★'.repeat(stars(miss)) + '☆'.repeat(3 - stars(miss));
  function burst(x, y, col) { const d = el(`<div class="burst" style="left:${gx(x)}px;top:${gx(y)}px;--c:${col}"></div>`); ov.appendChild(d); setTimeout(() => d.remove(), 500); }
  /* 3·2·1 시작! (이 동안은 게임이 멈춰요) */
  async function countdown() {
    CD = performance.now() + 2600;
    for (const t of ['3', '2', '1', '开始！']) { const d = el(`<div class="cdown">${t}</div>`); ov.appendChild(d); Sound.sfx(t.length > 1 ? 'good' : 'blip'); if (t.length > 1) speak('开始'); await sleep(t.length > 1 ? 500 : 700); d.remove(); }
    CD = 0;
  }
  function backToRun() { CUR = null; go('run'); Sound.bgm(R.boss ? 'hq' : R.cs.theme); runPad(); setTop(); }
  /* ── 골목 피하기 시작 ── */
  async function dodge(cs, run) {
    go('mini'); Sound.bgm('dodge'); CUR = 'dodge';
    const st = pick(cs.ladder.filter(l => l.t.length >= 2 && l.t.length <= 3)) || cs.ladder[1];
    D = { cs, run, t: 0, x: W / 2 - 11, dir: 0, face: 1, items: [], spawn: .6, st, toks: st.t, ti: 0, got: 0, need: st.t.length, done: false, hurtT: 0, inv: 0, end: 0, wins: [], miss: 0, combo: 0 };
    for (let i = 0; i < 8; i++) D.wins.push({ x: 14 + i * ((W - 40) / 7), who: pick(['auntie', 'uncle', 'grandpa', 'student']), show: 0 });
    pad.innerHTML = `<div class="rtop"><div class="hudrun"><span id="hearts"></span><span id="dg">🎯 0/3</span><span id="dt"></span></div><div id="gq" class="on"></div></div><div id="msg" class="mmsg"></div>
      <div class="ctrl"><button class="cbtn slide" id="bL">◀<small>왼쪽</small></button><button class="cbtn jump" id="bR">▶<small>오른쪽</small></button></div>
      <div class="small center">버튼을 꾹 누르거나 화면 왼쪽·오른쪽을 눌러요 · 키보드 ← →</div>`;
    const hold = (b, d) => { b.addEventListener('pointerdown', e => { e.preventDefault(); D.dir = d; }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(k => b.addEventListener(k, () => { if (D.dir === d) D.dir = 0; })); };
    hold($('#bL'), -1); hold($('#bR'), 1);
    hud(); prompt();
    if (!save.tutDodge) {
      save.tutDodge = 1; persist();
      const c = card(`<h2>🏚 골목 이벤트!</h2><div class="t">윗집 창문에서 <b>💩 똥, 돌, 쓰레기</b>가 떨어져요!</div>
        <div class="small" style="margin:1em 0;font-size:1.1em">◀ ▶ 로 왔다 갔다 피하고,<br>🪙 위의 뜻이 되도록 <b>덩어리 조각 동전을 순서대로</b> 받아요!</div>
        <div class="t">땅의 그림자를 보면 어디로 떨어질지 알 수 있어요.</div><div class="row"><button class="big go">좋아, 피해 보자!</button></div>`);
      await wait(c);
    }
    await countdown();
  }
  function hud() {
    const h = $('#hearts'); if (!h) return;
    h.innerHTML = '❤'.repeat(Math.max(0, R.hearts)) + '<span class="off">' + '❤'.repeat(3 - Math.max(0, R.hearts)) + '</span>';
    $('#dg').textContent = `🪙 ${D.got}/${D.need}`;
  }
  function prompt() {
    $('#gq').innerHTML = `🪙 "${esc(D.st.ko)}" <span class="slots2">${D.toks.map((t, i) => `<i class="${i < D.ti ? 'on' : i === D.ti ? 'nx' : ''}">${i < D.ti ? esc(t) : '?'}</i>`).join('')}</span> 순서대로 받아요!`;
  }
  function spawn() {
    const x = 6 + Math.random() * (W - 30), win = D.wins.reduce((a, b) => Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a);
    win.show = .8;
    const coinP = D.items.filter(i => i.k === 'coin').length < 2 ? .42 : .1;
    if (Math.random() < coinP) {
      const r = Math.random(), need = D.toks[D.ti];
      const w = r < .45 ? need : r < .7 && D.toks.length > 1 ? pick(D.toks.filter(t => t !== need)) : pick(D.cs.clues.map(c => c[0]).filter(t => !D.toks.includes(t)));
      const lab = el(`<div class="coinlab">${esc(w)}</div>`); ov.appendChild(lab);
      D.items.push({ k: 'coin', w, x, y: 30, vy: 30 + Math.random() * 12 + Math.min(20, D.t * .6), lab, w2: 14, w: w, h: 14, cw: 14 });
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
      const iw = it.k === 'coin' ? 14 : it.w, hit = it.x + iw - 2 > px0 && it.x + 2 < px1 && it.y + it.h > py0 && it.y < GY;
      if (hit && !it.gone) {
        it.gone = true;
        if (it.k === 'coin') {
          const need = D.toks[D.ti], ok = it.w === need, clue = D.cs.clues.find(c => c[0] === it.w);
          if (ok) { D.got++; D.ti++; D.combo++; Sound.sfx('clue'); speak(it.w); burst(it.x + 7, it.y + 7, '#ffd36e'); msg(`⭕ <b>${esc(D.toks.slice(0, D.ti).join(' '))}</b>${D.combo >= 2 ? ` · 콤보 ×${D.combo}!` : ''}`, 'ok', 1400); prompt(); if (D.got >= D.need) return finish(); }
          else { D.miss++; D.combo = 0; Sound.sfx('bad'); shake(3, .25); speak(it.w); msg(D.toks.includes(it.w) ? `✖ 「${esc(it.w)}」는 맞지만 순서가 달라요! 다음은 ?번째 조각` : `✖ 「${esc(it.w)}」${clue ? ` (${esc(clue[2])})` : ''}는 이 덩어리에 없어요`, 'no', 1700); }
          hud();
        } else if (D.inv <= 0) {
          D.inv = 1.1; D.hurtT = .5; R.hearts--; D.combo = 0; shake(5, .3); Sound.sfx(it.k === 'poop' ? 'splat' : 'hurt'); hud();
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
    const full = D.toks.join(''); if (!timeout) speak(full);
    msg(timeout ? '⏰ 시간 끝! 골목을 빠져나왔어요' : `🎉 <b>${esc(full)}</b> 덩어리 완성! ${rank(D.miss)}${bonus ? ' · 보너스 ❤ +1' : ''}`, 'ok', 2200);
    R.mini = (R.mini || []).concat({ k: 'dodge', got: D.got, miss: D.miss, stars: timeout ? 1 : stars(D.miss) });
    await sleep(1800);
    D = null; backToRun();
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
      if (it.k === 'coin') { if (!it.gone) { ctx.drawImage(SPR.coin[Math.floor(t / 120 + it.x) % 4], Math.round(it.x), Math.round(it.y)); if (it.lab) { it.lab.style.left = gx(it.x + 7) + 'px'; it.lab.style.top = gx(it.y - 1) + 'px'; } } }
      else if (it.land > 0) { ctx.globalAlpha = Math.min(1, it.land * 2); ctx.drawImage(SPR[it.k], Math.round(it.x), Math.round(it.ly)); ctx.globalAlpha = 1; if (it.k === 'poop') { PX.R(ctx, it.x - 2, GY - 1, it.w + 4, 2, '#8a5a30'); } }
      else ctx.drawImage(SPR[it.k], Math.round(it.x), Math.round(it.y));
    });
    // 民浩
    if (!(D.inv > 0 && Math.floor(t / 80) % 2)) {
      let im = D.hurtT > 0 ? PX.person(PL(), 'hurt') : D.dir ? PX.person(PL(), 'run', Math.floor(t / 80) % 6) : PX.person(PL(), 'stand', 0, (t % 3000) < 120 ? 'blink' : undefined);
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
  const DODGE = { update, draw, key, pointer };

  /* 공통: 미니게임 위 칸 (하트 · 목표 · 질문 · 메시지) */
  function topPad(goal, extra = '') {
    pad.innerHTML = `<div class="rtop"><div class="hudrun"><span id="hearts"></span><span id="dg">${goal}</span><span id="dt"></span></div><div id="gq" class="on"></div></div><div id="msg" class="mmsg"></div>${extra}`;
    const h = $('#hearts'); h.innerHTML = '❤'.repeat(Math.max(0, R.hearts)) + '<span class="off">' + '❤'.repeat(3 - Math.max(0, R.hearts)) + '</span>';
  }
  const gameXY = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
  async function tut(key, html) { if (!save[key]) { save[key] = 1; persist(); const c = card(html + '<div class="row"><button class="big go">시작!</button></div>'); await wait(c); } await countdown(); }

  /* ───── 🔦 손전등 단서 찾기: 깜깜한 골목에서 뜻에 맞는 단서 쪽지를 찾아 눌러요 ───── */
  const FLASH = (() => {
    let F = null;
    const DARK = () => { const [c, g] = PX.mk(W, H); return [c, g]; };
    function props(r) {           // 골목 소품 배치
      const list = [], kinds = ['bin', 'crate', 'bike', 'door', 'poster', 'pipe', 'cat', 'crate', 'bin', 'poster'];
      for (let x = 8; x < W - 30; x += 34 + ((r() * 16) | 0)) list.push({ k: kinds[(r() * kinds.length) | 0], x });
      return list;
    }
    function start(cs, run) {
      go('mini'); CUR = 'flash'; Sound.bgm('flash');
      const r = PX.rng((Math.random() * 1e6) | 0);
      const ids = shuffle(cs.clues.map((c, i) => i)), tgt = ids.slice(0, 3), dec = ids.slice(3, 7);
      const tags = [];
      shuffle(tgt.concat(dec)).forEach(ci => {
        for (let k = 0; k < 40; k++) { const x = 16 + Math.random() * (W - 60), y = 58 + Math.random() * (GY - 82); if (tags.every(t => Math.hypot(t.x - x, t.y - y) > 40)) { tags.push({ ci, x, y, rot: (Math.random() - .5) * .3, found: false }); break; } }
      });
      F = { cs, tgt, ti: 0, tags, props: props(r), lx: W / 2, ly: H / 2, t: 0, bat: 40, got: 0, miss: 0, done: false, flick: 0 };
      topPad('🔦 0/3', `<div class="small center">화면을 끌어서 손전등을 비추고, 맞는 쪽지를 눌러요</div>`);
      prompt();
      tut('tutFlash', `<h2>🔦 깜깜한 골목!</h2><div class="t">정전이 됐어요! 손전등으로 골목을 비춰요.</div><div class="small" style="margin:1em 0;font-size:1.1em">손가락으로 화면을 <b>끌면</b> 불빛이 따라와요.<br>위에 적힌 <b>뜻에 맞는 중국어 쪽지</b>를 찾아서 <b>눌러요</b>!</div><div class="t">🔋 배터리가 다 닳기 전에 3개를 찾아요.</div>`);
    }
    function prompt() { const c = F.cs.clues[F.tgt[F.ti]]; $('#gq').innerHTML = `🔦 「${esc(c[2])}」 쪽지를 찾아요!`; }
    function hud() { $('#dg').textContent = `🔦 ${F.got}/3`; $('#dt').textContent = `🔋 ${Math.ceil(F.bat)}초`; }
    function update(dt) {
      if (!F || F.done || R.paused || uiRoot.querySelector('.card,.box')) return;
      F.t += dt; F.bat -= dt; F.flick = F.bat < 8 && Math.random() < .08 ? .08 : Math.max(0, F.flick - dt);
      if (Math.floor(F.t * 4) !== F._h) { F._h = Math.floor(F.t * 4); hud(); }
      if (F.bat <= 0) end(true);
    }
    function tap(x, y) {
      const rad = 30, hitTag = F.tags.find(t => !t.found && x > t.x - 4 && x < t.x + 30 && y > t.y - 4 && y < t.y + 20);
      if (hitTag && Math.hypot(hitTag.x + 13 - F.lx, hitTag.y + 8 - F.ly) < rad + 8) {
        const c = F.cs.clues[hitTag.ci];
        if (hitTag.ci === F.tgt[F.ti]) { hitTag.found = true; F.got++; Sound.sfx('clue'); speak(c[0]); msg(`⭕ <b>${esc(c[0])}</b> <span>${esc(c[1])}</span> · ${esc(c[2])}`, 'ok', 1500); hud(); if (F.got >= 3) return end(false); F.ti++; prompt(); }
        else { F.miss++; Sound.sfx('bad'); speak(c[0]); msg(`✖ <b>${esc(c[0])}</b>은(는) '${esc(c[2])}'`, 'no', 1500); F.bat = Math.max(1, F.bat - 3); }
        return;
      }
      F.lx = x; F.ly = y; Sound.sfx('click');
    }
    async function end(timeout) {
      F.done = true; Sound.sfx(timeout ? 'bad' : 'cheer');
      const bonus = !timeout && F.miss === 0 && R.hearts < 3; if (bonus) R.hearts++;
      msg(timeout ? '🔋 배터리가 다 됐어요! 다음엔 더 빨리 찾아 봐요' : `🎉 단서 쪽지 3개 발견!${bonus ? ' 실수 없음 보너스 ❤ +1' : ''}`, timeout ? 'no' : 'ok', 2000);
      R.mini = (R.mini || []).concat({ k: 'flash', got: F.got, miss: F.miss });
      await sleep(1700); F = null; backToRun();
    }
    function drawProp(p) {
      const y = GY;
      if (p.k === 'bin') { PX.R(ctx, p.x, y - 22, 20, 22, '#3f6a4a'); PX.R(ctx, p.x - 1, y - 24, 22, 3, '#2f5038'); for (let k = 2; k < 20; k += 4) PX.R(ctx, p.x + k, y - 20, 1, 18, '#2f5038'); }
      if (p.k === 'crate') { PX.R(ctx, p.x, y - 16, 18, 16, '#8a5a30'); PX.R(ctx, p.x, y - 16, 18, 2, '#a8744e'); PX.line(ctx, p.x, y - 14, p.x + 17, y - 1, '#6a4020'); PX.R(ctx, p.x + 3, y - 30, 14, 14, '#9a6a3a'); PX.R(ctx, p.x + 3, y - 30, 14, 2, '#b8834a'); }
      if (p.k === 'bike') { PX.disc(ctx, p.x + 4, y - 5, 4, '#2a2430'); PX.disc(ctx, p.x + 20, y - 5, 4, '#2a2430'); PX.line(ctx, p.x + 4, y - 5, p.x + 12, y - 12, '#f2b631', 2); PX.line(ctx, p.x + 12, y - 12, p.x + 20, y - 5, '#f2b631', 2); }
      if (p.k === 'door') { PX.R(ctx, p.x, y - 46, 22, 46, '#4a3040'); PX.R(ctx, p.x + 2, y - 44, 18, 44, '#6a4050'); PX.R(ctx, p.x + 16, y - 24, 2, 2, '#f2c14e'); PX.R(ctx, p.x - 2, y - 50, 26, 4, '#3a2030'); }
      if (p.k === 'poster') { PX.R(ctx, p.x, y - 70, 20, 26, '#e2504c'); PX.R(ctx, p.x + 2, y - 68, 16, 10, '#ffd36e'); PX.R(ctx, p.x + 3, y - 54, 14, 2, '#fff6dc'); PX.R(ctx, p.x + 3, y - 50, 10, 2, '#fff6dc'); }
      if (p.k === 'pipe') { PX.R(ctx, p.x + 8, 20, 4, GY - 20, '#5a5a6a'); PX.R(ctx, p.x + 8, 60, 4, 2, '#3a3a4a'); PX.R(ctx, p.x + 8, 110, 4, 2, '#3a3a4a'); }
      if (p.k === 'cat') { PX.ellipse(ctx, p.x + 10, y - 5, 7, 4, '#2a2430'); PX.disc(ctx, p.x + 16, y - 10, 3, '#2a2430'); PX.R(ctx, p.x + 14, y - 14, 1, 2, '#2a2430'); PX.R(ctx, p.x + 18, y - 14, 1, 2, '#2a2430'); PX.line(ctx, p.x + 3, y - 6, p.x, y - 14, '#2a2430'); }
    }
    function draw(t) {
      if (!F) return;
      // 밤 골목
      PX.R(ctx, 0, 0, W, H, '#2a2238');
      for (let y = 12; y < GY; y += 8) for (let x = ((y / 8) % 2) * 8; x < W; x += 16) { PX.R(ctx, x, y, 15, 7, '#3a3048'); PX.R(ctx, x, y, 15, 1, '#463a56'); }
      PX.R(ctx, 0, 0, W, 12, '#120c1c'); for (let i = 0; i < 20; i++) PX.P(ctx, (i * 53) % W, (i * 7) % 10, '#fff6dc');
      F.props.forEach(drawProp);
      PX.R(ctx, 0, GY, W, H - GY, '#3a3442'); for (let x = 0; x < W; x += 12) PX.R(ctx, x, GY + 6, 8, 1, '#2a2432');
      // 쪽지
      F.tags.forEach(tg => {
        if (tg.found) return;
        const c = F.cs.clues[tg.ci], x = Math.round(tg.x), y = Math.round(tg.y);
        PX.R(ctx, x, y, 28, 17, '#e8dcc0'); PX.R(ctx, x, y, 28, 2, '#fff6dc'); PX.R(ctx, x + 12, y - 2, 4, 3, '#e2504c');
        PX.text(ctx, c[0], x + (c[0].length > 1 ? 2 : 9), y + 1, c[0].length > 2 ? 8 : 11, '#2a1d24');
      });
      // 어둠 (손전등 불빛만 보임)
      const [dc, dg] = F._dark && F._dark[0].width === W ? F._dark : (F._dark = DARK());
      dg.globalCompositeOperation = 'source-over'; dg.clearRect(0, 0, W, H); dg.fillStyle = F.flick > 0 ? 'rgba(6,4,12,1)' : 'rgba(6,4,12,.988)'; dg.fillRect(0, 0, W, H);
      dg.globalCompositeOperation = 'destination-out';
      const lx = Math.round(F.lx), ly = Math.round(F.ly);
      if (F.flick <= 0) { dg.fillStyle = 'rgba(0,0,0,.5)'; PX.disc(dg, lx, ly, 36, 'rgba(0,0,0,.45)'); PX.disc(dg, lx, ly, 30, '#000'); }
      dg.globalCompositeOperation = 'source-over';
      ctx.drawImage(dc, 0, 0);
      if (F.flick <= 0) { ctx.fillStyle = 'rgba(255,240,180,.10)'; PX.disc(ctx, lx, ly, 30, 'rgba(255,240,180,.08)'); }
      // 民浩 (손전등 든 모습)
      const im = PX.person(PL(), 'think', 0); ctx.drawImage(im, 8, GY - PX.SH + 1);
      PX.R(ctx, 26, GY - 26, 5, 3, '#ffd36e');
    }
    function pointer(e, k) {
      if (!F || F.done) return;
      const [x, y] = gameXY(e);
      if (k === 'move' && (e.buttons || e.pointerType === 'mouse')) { F.lx = x; F.ly = y; F.drag = (F.drag || 0) + 1; }
      if (k === 'down') { F.drag = 0; F.dx = x; F.dy = y; }
      if (k === 'up' && (F.drag || 0) < 6) tap(x, y);
    }
    return { start, update, draw, pointer, get F() { return F; } };
  })();

  /* ───── 🚇 지하철 노선 잇기: 덩어리 역을 순서대로 이어서 문장 열차를 완성해요 ───── */
  const SUBWAY = (() => {
    let M = null;
    const LINE = ['#e2504c', '#4f8fdc', '#5fae6e', '#f2b631'];
    function start(cs, run) {
      go('mini'); CUR = 'subway'; Sound.bgm('subway');
      M = { cs, round: 0, rounds: [2, 4].filter(i => cs.ladder[i]), miss: 0, t: 0, done: false };
      topPad('🚇 0/2', `<div class="small center">출발역부터 다음 역(덩어리)을 차례대로 눌러 노선을 이어요</div>`);
      setup();
      tut('tutSubway', `<h2>🚇 지하철 노선 잇기!</h2><div class="t">문장 열차가 출발하려면 노선이 필요해요.</div><div class="small" style="margin:1em 0;font-size:1.1em">🚉 <b>出发(출발)</b>에서 시작해서<br>뜻에 맞게 <b>덩어리 역을 순서대로</b> 눌러요.<br>마지막 역까지 이으면 열차가 달려요!</div><div class="t">⚠ 함정 역도 하나 섞여 있어요.</div>`);
    }
    function setup() {
      const st = M.cs.ladder[M.rounds[M.round]];
      const decoy = pick(M.cs.clues.filter(c => !st.t.join('').includes(c[0])))[0];
      const toks = st.t.map((t, i) => ({ t, i })).concat([{ t: decoy, i: -1 }]);
      const cols = Math.max(4, Math.ceil(toks.length / 2) + 1), cells = [];
      for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) cells.push([c, r]);
      const pos = shuffle(cells).slice(0, toks.length);
      const x0 = 56, x1 = W - 56, y0 = 76, y1 = GY - 26;
      M.st = st; M.next = 0; M.path = [{ x: 22, y: (y0 + y1) / 2, t: '出发' }];
      M.stations = toks.map((k, j) => ({ ...k, x: x0 + (pos[j][0] + .5) * (x1 - x0) / cols + (Math.random() * 10 - 5), y: y0 + pos[j][1] * (y1 - y0) + (Math.random() * 8 - 4), on: false }));
      M.end = { x: W - 22, y: (y0 + y1) / 2, t: '终点' };
      M.train = null; M.col = LINE[M.round % LINE.length];
      ov.querySelectorAll('.stlab').forEach(x => x.remove());
      M.stations.forEach(s => { s.lab = el(`<button class="stlab">${esc(s.t)}</button>`); s.lab.onclick = () => tapSt(s); ov.appendChild(s.lab); });
      [M.path[0], M.end].forEach(s => { s.lab = el(`<div class="stlab fixed">${s.t}</div>`); ov.appendChild(s.lab); });
      $('#gq').innerHTML = `🚇 "${esc(st.ko)}"`;
      $('#dg').textContent = `🚇 ${M.round}/${M.rounds.length}`;
    }
    function tapSt(s) {
      if (M.done || M.train || s.on) return;
      if (s.i === M.next) {
        s.on = true; s.lab.classList.add('on'); M.path.push(s); M.next++; Sound.sfx('ding'); speak(s.t);
        if (M.next >= M.st.t.length) { M.path.push(M.end); M.train = { d: 0 }; Sound.sfx('train'); }
      } else {
        M.miss++; Sound.sfx('bad'); s.lab.classList.remove('bad'); void s.lab.offsetWidth; s.lab.classList.add('bad');
        msg(s.i < 0 ? `✖ 「${esc(s.t)}」은(는) 함정 역이에요!` : `✖ 「${esc(s.t)}」은(는) 다음 역이 아니에요`, 'no', 1400);
      }
    }
    const pathLen = () => { let L = 0; for (let i = 1; i < M.path.length; i++) L += Math.hypot(M.path[i].x - M.path[i - 1].x, M.path[i].y - M.path[i - 1].y); return L; };
    function at(d) { for (let i = 1; i < M.path.length; i++) { const a = M.path[i - 1], b = M.path[i], l = Math.hypot(b.x - a.x, b.y - a.y); if (d <= l) return [a.x + (b.x - a.x) * d / l, a.y + (b.y - a.y) * d / l, b.x > a.x ? 1 : -1]; d -= l; } const e = M.path[M.path.length - 1]; return [e.x, e.y, 1]; }
    async function update(dt) {
      if (!M || M.done || R.paused || uiRoot.querySelector('.card,.box')) return;
      M.t += dt;
      if (M.train && !M.train.arrived) {
        M.train.d += dt * 150;
        if (M.train.d >= pathLen()) {
          M.train.arrived = true; const full = M.st.t.join(''); speak(full); Sound.sfx('open');
          msg(`⭕ <b>${esc(full)}</b>`, 'ok', 2200); M.round++; $('#dg').textContent = `🚇 ${M.round}/${M.rounds.length}`;
          await sleep(2000);
          if (!M) return;
          if (M.round >= M.rounds.length) return end(); setup();
        }
      }
    }
    async function end() {
      M.done = true; ov.querySelectorAll('.stlab').forEach(x => x.remove()); Sound.sfx('cheer');
      const bonus = M.miss === 0 && R.hearts < 3; if (bonus) R.hearts++;
      msg(`🎉 문장 열차 ${M.rounds.length}대 출발 완료!${bonus ? ' 실수 없음 보너스 ❤ +1' : ''}`, 'ok', 2000);
      R.mini = (R.mini || []).concat({ k: 'subway', miss: M.miss });
      await sleep(1600); M = null; backToRun();
    }
    function draw(t) {
      if (!M) return;
      PX.R(ctx, 0, 0, W, H, '#1d2a44');
      for (let x = 0; x < W; x += 16) PX.R(ctx, x, 0, 1, H, '#243354'); for (let y = 0; y < H; y += 16) PX.R(ctx, 0, y, W, 1, '#243354');
      PX.R(ctx, 0, GY + 4, W, H - GY - 4, '#141c30'); PX.text(ctx, '地铁线路图', 6, GY + 6, 9, '#7f9ac8');
      // 놓인 노선
      for (let i = 1; i < M.path.length; i++) { const a = M.path[i - 1], b = M.path[i]; PX.line(ctx, a.x, a.y, b.x, b.y, '#0e1424', 7); PX.line(ctx, a.x, a.y, b.x, b.y, M.col, 4); }
      // 역
      const all = [M.path[0], ...M.stations, M.end];
      all.forEach(s => {
        const on = s.on || s === M.path[0] || (s === M.end && M.train);
        PX.disc(ctx, Math.round(s.x), Math.round(s.y), 6, '#0e1424'); PX.disc(ctx, Math.round(s.x), Math.round(s.y), 5, on ? M.col : '#ffffff'); PX.disc(ctx, Math.round(s.x), Math.round(s.y), 2, on ? '#ffffff' : '#8a9ac0');
        if (s.lab) { s.lab.style.left = gx(s.x) + 'px'; s.lab.style.top = gx(s.y - 12) + 'px'; }
      });
      // 다음 역 안내 (깜빡)
      if (!M.train && Math.floor(t / 400) % 2) { const last = M.path[M.path.length - 1]; PX.disc(ctx, Math.round(last.x), Math.round(last.y), 8, 'rgba(255,255,255,.25)'); }
      // 열차
      if (M.train) {
        const [x, y, dir] = at(M.train.d), tx = Math.round(x - 10), ty = Math.round(y - 6);
        PX.R(ctx, tx, ty, 20, 10, '#0e1424'); PX.R(ctx, tx + 1, ty + 1, 18, 8, '#f4f1ea'); PX.R(ctx, tx + 1, ty + 6, 18, 2, M.col);
        for (let k = 0; k < 3; k++) PX.R(ctx, tx + 3 + k * 5, ty + 2, 3, 3, '#4f8fdc');
        PX.R(ctx, dir > 0 ? tx + 17 : tx + 1, ty + 2, 2, 3, '#ffd36e');
      }
    }
    return { start, update, draw };
  })();

  /* 공통 끝내기 */
  async function finishMini(kind, ok, extra, text) {
    Sound.sfx(ok ? 'cheer' : 'bad');
    const bonus = ok && extra.miss === 0 && R.hearts < 3; if (bonus) R.hearts++;
    const st = ok ? stars(extra.miss || 0) : 1;
    msg(`${text} ${'★'.repeat(st)}${'☆'.repeat(3 - st)}${bonus ? ' · 보너스 ❤ +1' : ''}`, ok ? 'ok' : 'no', 2200);
    R.mini = (R.mini || []).concat({ k: kind, ...extra, stars: st });
    document.querySelectorAll('.mbtn,.wlab,.blab,.mcards,.mconn,.mmaze,.mslide,.mspot,.plab').forEach(x => x.remove());
    await sleep(1700); backToRun();
  }
  const optBtns = (opts, onPick, cls = '') => {
    document.querySelectorAll('.mbtn').forEach(x => x.remove());
    const wrap = el(`<div class="mbtn ${cls}">${opts.map((o, i) => `<button data-i="${i}">${o}</button>`).join('')}</div>`);
    wrap.querySelectorAll('button').forEach(b => b.onclick = () => onPick(+b.dataset.i, b));
    (LAND ? ov : pad).appendChild(wrap); return wrap;
  };

  /* ───── 👊 두더지 단원 잡기: 창문에서 튀어나오는 단원 중, 뜻에 맞는 단어를 든 단원만 콕! ───── */
  const WHACK = (() => {
    let K = null;
    function start(cs) {
      go('mini'); CUR = 'whack'; Sound.bgm('dodge');
      const tgt = shuffle(cs.clues.map((c, i) => i)).slice(0, 3);
      const holes = []; const cols = 4, rows = 2;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) holes.push({ x: Math.round(W * (c + .5) / cols) - 13, y: 84 + r * 50, up: 0, who: null });
      K = { cs, tgt, ti: 0, got: 0, miss: 0, holes, t: 0, spawn: .5, done: false, fx: [] };
      topPad('👊 0/3', `<div class="small center">튀어나온 사람을 눌러요 · 시민은 누르면 안 돼요!</div>`);
      prompt();
      tut('tutWhack', `<h2>👊 단원 잡기!</h2><div class="t">무음단 단원들이 창문에서 불쑥불쑥 나타나요.</div><div class="small" style="margin:1em 0;font-size:1.1em">🕶 <b>단원</b>이 들고 있는 단어 중<br>위에 적힌 <b>뜻에 맞는 단어</b>를 든 단원만 콕!<br>🙂 시민(친구)은 누르면 안 돼요.</div>`);
    }
    function prompt() { const c = K.cs.clues[K.tgt[K.ti]]; $('#gq').innerHTML = `👊 「${esc(c[2])}」 단어를 든 단원을 잡아요!`; $('#dg').textContent = `👊 ${K.got}/3`; }
    function pop() {
      const free = K.holes.filter(h => !h.who); if (!free.length) return;
      const h = pick(free), r = Math.random();
      const gang = r < .78, right = gang && Math.random() < .5;
      const ci = right ? K.tgt[K.ti] : pick(K.cs.clues.map((c, i) => i).filter(i => i !== K.tgt[K.ti]));
      h.who = { gang, ci, look: gang ? 'club' : pick(['xiaomei', 'xiaoyu', 'grandpa', 'auntie']), life: 1.5 + Math.random() * .5, hit: 0 };
      h.lab = el(`<div class="wlab ${gang ? '' : 'civ'}">${gang ? esc(K.cs.clues[ci][0]) : '🙂'}</div>`); ov.appendChild(h.lab);
    }
    function update(dt) {
      if (!K || K.done || R.paused || uiRoot.querySelector('.card,.box')) return;
      K.t += dt; K.spawn -= dt; if (K.spawn <= 0) { pop(); K.spawn = Math.max(.45, .9 - K.t * .015); }
      K.holes.forEach(h => {
        if (!h.who) { h.up = Math.max(0, h.up - dt * 6); return; }
        h.up = Math.min(1, h.up + dt * 6); h.who.life -= dt;
        if (h.who.life <= 0 || h.who.hit && h.who.hit < K.t - .5) { h.who = null; if (h.lab) { h.lab.remove(); h.lab = null; } }
      });
      if (K.t > 40) end(false);
    }
    function tap(x, y) {
      const h = K.holes.find(h => h.who && !h.who.hit && x > h.x - 4 && x < h.x + 30 && y > h.y - 32 && y < h.y + 10);
      if (!h) return;
      const w = h.who; w.hit = K.t;
      if (!w.gang) { K.miss++; Sound.sfx('bad'); shake(2, .15); msg('🙂 앗, 시민이에요! 단원만 잡아요', 'no', 1300); return; }
      const c = K.cs.clues[w.ci];
      if (w.ci === K.tgt[K.ti]) { K.got++; Sound.sfx('smash'); shake(3, .15); burst(h.x + 13, h.y - 14, '#ffd36e'); speak(c[0]); msg(`🚔 잡았다! <b>${esc(c[0])}</b> <span>${esc(c[1])}</span> · ${esc(c[2])}`, 'ok', 1400); if (K.got >= 3) return end(true); K.ti++; prompt(); }
      else { K.miss++; Sound.sfx('lock'); shake(2, .15); speak(c[0]); msg(`✖ <b>${esc(c[0])}</b>은(는) '${esc(c[2])}'`, 'no', 1500); }
    }
    function end(ok) { K.done = true; ov.querySelectorAll('.wlab').forEach(x => x.remove()); const k = K; K = null; finishMini('whack', ok, { got: k.got, miss: k.miss }, ok ? '🎉 단원 3명 체포!' : '⏰ 시간 끝! 단원들이 숨어 버렸어요'); }
    function draw(t) {
      if (!K) return;
      if (skyC) ctx.drawImage(skyC, 0, 0);
      PX.R(ctx, 0, 40, W, GY - 40, '#b89a80'); for (let y = 40; y < GY; y += 10) PX.R(ctx, 0, y, W, 1, '#a8866a');
      K.holes.forEach(h => {
        PX.R(ctx, h.x - 4, h.y - 34, 34, 38, '#3b2a35'); PX.R(ctx, h.x - 2, h.y - 32, 30, 34, '#2a1d2e');
        if (h.who) {
          const dy = Math.round((1 - h.up) * 30), im = PX.person(h.who.look, h.who.hit ? 'hurt' : 'stand', 0, h.who.hit ? 'hurt' : undefined);
          ctx.save(); ctx.beginPath(); ctx.rect(h.x - 2, h.y - 32, 30, 34); ctx.clip(); ctx.drawImage(im, h.x, h.y - 30 + dy); ctx.restore();
          if (h.lab) { h.lab.style.left = gx(h.x + 13) + 'px'; h.lab.style.top = gx(h.y - 40 + dy) + 'px'; h.lab.style.opacity = h.up > .5 ? 1 : 0; }
          if (h.who.hit) PX.text(ctx, h.who.gang ? '★' : '!', h.x + 9, h.y - 46, 10, '#ffd36e');
        }
        PX.R(ctx, h.x - 6, h.y + 2, 38, 4, '#7a5a40'); PX.R(ctx, h.x - 6, h.y + 2, 38, 1, '#a8866a');
      });
      for (let x = 0; x < W; x += ART.LW) ctx.drawImage(THEME.ground, x, GY);
      ctx.drawImage(PX.person(PL(), 'stand'), 6, GY - PX.SH + 1);
    }
    function pointer(e, k) { if (K && !K.done && k === 'down') { const [x, y] = gameXY(e); tap(x, y); } }
    return { start, update, draw, pointer };
  })();

  /* ───── 📢 방송실 되찾기: 뒤섞인 방송을 듣고, 들린 단어를 골라요 (듣기) ───── */
  const RADIO = (() => {
    let A = null;
    function start(cs) {
      go('mini'); CUR = 'radio'; Sound.bgm('flash');
      A = { cs, queue: shuffle(cs.clues.map((c, i) => i)).slice(0, 5), got: 0, need: 5, miss: 0, t: 0, done: false, wave: 0 };
      topPad('📢 0/5', `<div class="small center">🔊 다시 듣기 버튼을 눌러도 돼요</div>`);
      tut('tutRadio', `<h2>📢 방송실을 되찾아라!</h2><div class="t">무음단이 역 안내 방송을 지지직 뒤섞어 놨어요.</div><div class="small" style="margin:1em 0;font-size:1.1em">🔊 방송에서 <b>들린 단어</b>를 골라요.<br>단어 5개를 맞히면 방송이 돌아와요!</div><div class="t">틀린 단어는 마지막에 한 번 더 나와요.</div>`).then(round);
    }
    function round() {
      if (!A || A.done) return;
      const ci = A.queue[0], c = A.cs.clues[ci];
      const opts = shuffle([ci].concat(shuffle(A.cs.clues.map((x, i) => i).filter(i => i !== ci)).slice(0, 3)));
      A.opts = opts; A.lock = false;
      $('#gq').innerHTML = `📢 방송에서 들린 단어는? <button class="mini" id="rplay">🔊 다시 듣기</button>`;
      $('#rplay').onclick = play; $('#dg').textContent = `📢 ${A.got}/${A.need}`;
      optBtns(opts.map(i => esc(A.cs.clues[i][0])), pickOpt, 'grid4');
      setTimeout(play, 350);
    }
    function play() { if (!A) return; Sound.sfx('click'); A.wave = 1.2; speak(A.cs.clues[A.queue[0]][0]); }
    async function pickOpt(i, b) {
      if (!A || A.lock) return; A.lock = true;
      const ci = A.queue[0], c = A.cs.clues[ci], ok = A.opts[i] === ci;
      if (ok) { b.classList.add('right'); A.got++; Sound.sfx('ding'); msg(`⭕ <b>${esc(c[0])}</b> <span>${esc(c[1])}</span> · ${esc(c[2])}`, 'ok', 1300); A.queue.shift(); }
      else { b.classList.add('wrong'); A.miss++; Sound.sfx('bad'); shake(2, .15); const rb = [...document.querySelectorAll('.mbtn button')][A.opts.indexOf(ci)]; if (rb) rb.classList.add('right'); msg(`✖ 들린 건 <b>${esc(c[0])}</b> <span>${esc(c[1])}</span> · ${esc(c[2])}`, 'no', 1800); speak(c[0]); A.queue.push(A.queue.shift()); }
      await sleep(ok ? 1100 : 1900);
      if (!A) return;
      if (A.got >= A.need) { A.done = true; const a = A; A = null; return finishMini('radio', true, { miss: a.miss }, '🎉 방송이 돌아왔어요! 귀가 밝은 탐정!'); }
      round();
    }
    function update(dt) { if (A) { A.t += dt; A.wave = Math.max(0, A.wave - dt); } }
    function draw(t) {
      if (!A) return;
      PX.R(ctx, 0, 0, W, H, '#3a3048'); for (let x = 0; x < W; x += 12) PX.R(ctx, x, 0, 6, GY, '#43385a');
      const cx = Math.round(W * .18);
      // 스피커 + 음파
      PX.R(ctx, cx - 16, 70, 32, 46, '#1d1424'); PX.disc(ctx, cx, 86, 10, '#4a4458'); PX.disc(ctx, cx, 86, 5, '#8a84a0'); PX.disc(ctx, cx, 106, 5, '#4a4458');
      if (A.wave > 0) for (let k = 0; k < 3; k++) { const r = 16 + k * 9 + ((t / 60) % 9); for (let a = -0.7; a < 0.7; a += 0.12) PX.P(ctx, cx + 14 + Math.cos(a) * r, 86 + Math.sin(a) * r, '#ffd36e'); }
      else for (let k = 0; k < 14; k++) PX.P(ctx, cx + 18 + ((k * 13 + t / 20) % 40), 76 + ((k * 7) % 22), '#6a6478');
      // 콘솔
      PX.R(ctx, 0, GY - 24, W, 24, '#2a2436'); for (let k = 0; k < W; k += 14) { PX.R(ctx, k + 4, GY - 18, 6, 10, '#4a4458'); PX.R(ctx, k + 5, GY - 16 + ((k * 3 + t / 90) % 6), 4, 2, '#7fd6a8'); }
      for (let x = 0; x < W; x += ART.LW) ctx.drawImage(THEME.ground, x, GY);
      ctx.drawImage(PX.person(PL(), 'think'), cx - 40, GY - PX.SH + 1);
    }
    return { start, update, draw };
  })();

  /* ───── 🔐 금고 열기: 한자를 보고 알맞은 병음(성조)을 골라 자물쇠 3개를 풀어요 ───── */
  const SAFE = (() => {
    let Z = null;
    const TONES = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', ü: 'ǖǘǚǜ' };
    const BASE = {}; Object.entries(TONES).forEach(([v, s]) => [...s].forEach((ch, k) => BASE[ch] = [v, k]));
    function retone(py, seed) {   // 성조 하나를 바꾼 가짜 병음
      const chars = [...py], idx = chars.map((ch, i) => BASE[ch] ? i : -1).filter(i => i >= 0);
      if (!idx.length) return null;
      const at = idx[seed % idx.length], [v, k] = BASE[chars[at]], nk = (k + 1 + (seed >> 1) % 3) % 4;
      chars[at] = TONES[v][nk]; return chars.join('');
    }
    function start(cs) {
      go('mini'); CUR = 'safe'; Sound.bgm('check');
      const ids = shuffle(cs.clues.map((c, i) => i).filter(i => [...cs.clues[i][1]].some(ch => BASE[ch]))).slice(0, 3);
      Z = { cs, ids, k: 0, miss: 0, open: 0, t: 0, done: false, dial: 0 };
      topPad('🔐 0/3', `<div class="small center">한자를 보고, 소리 내어 읽은 다음 알맞은 병음을 골라요</div>`);
      tut('tutSafe', `<h2>🔐 무음단 금고!</h2><div class="t">훔친 말이 금고 안에 갇혀 있어요. 자물쇠는 3개!</div><div class="small" style="margin:1em 0;font-size:1.1em">금고 화면의 <b>한자</b>를 보고<br><b>성조까지 맞는 병음</b>을 골라요.</div><div class="t">소리 내어 읽어 보면 더 잘 보여요!</div>`).then(round);
    }
    function round() {
      if (!Z || Z.done) return;
      const c = Z.cs.clues[Z.ids[Z.k]], set2 = new Set([c[1]]);
      for (let sd = 1; set2.size < 3 && sd < 20; sd++) { const f = retone(c[1], sd * 7 + Z.k); if (f) set2.add(f); }
      while (set2.size < 3) set2.add(pick(Z.cs.clues)[1]);
      Z.opts = shuffle([...set2]); Z.lock = false;
      $('#gq').innerHTML = `🔐 금고 화면: <span class="zh">${esc(c[0])}</span>${set.ko ? ` <small>${esc(c[2])}</small>` : ''}`;
      $('#dg').textContent = `🔐 ${Z.open}/3`;
      optBtns(Z.opts.map(o => esc(o)), pickOpt, 'row3');
    }
    async function pickOpt(i, b) {
      if (!Z || Z.lock) return; Z.lock = true;
      const c = Z.cs.clues[Z.ids[Z.k]], ok = Z.opts[i] === c[1];
      if (ok) { b.classList.add('right'); Z.open++; Z.dial = 1; Sound.sfx('open'); speak(c[0]); msg(`🔓 딸깍! <b>${esc(c[0])}</b> <span>${esc(c[1])}</span>`, 'ok', 1300); Z.k++; }
      else { b.classList.add('wrong'); Z.miss++; Sound.sfx('lock'); speak(c[0]); msg(`✖ 잘 들어 봐요: <b>${esc(c[0])}</b> <span>${esc(c[1])}</span>`, 'no', 1600); }
      await sleep(ok ? 1100 : 1700);
      if (!Z) return;
      if (Z.open >= 3) { Z.done = true; Z.dial = 2; Sound.sfx('door'); const sc = STORY.cases[Z.cs.no]; await sleep(900); const z = Z; Z = null; return finishMini('safe', true, { miss: z.miss }, `🎉 금고가 열렸어요! 안에서 훔친 말 "${sc ? sc.stolen : ''}" 조각 발견!`); }
      if (!ok) Z.lock = false, document.querySelectorAll('.mbtn button').forEach(x => x.classList.remove('wrong'));
      else round();
    }
    function update(dt) { if (Z) { Z.t += dt; if (Z.dial === 1) Z.dial = 0; } }
    function draw(t) {
      if (!Z) return;
      PX.R(ctx, 0, 0, W, H, '#2a2238'); for (let y = 0; y < GY; y += 16) PX.R(ctx, 0, y, W, 1, '#342a44');
      const cx = Math.round(W * .2), sy = 52;
      PX.R(ctx, cx - 34, sy, 68, 90, '#4a4458'); PX.R(ctx, cx - 32, sy + 2, 64, 86, '#6a6478'); PX.R(ctx, cx - 32, sy + 2, 64, 3, '#8a84a0');
      PX.R(ctx, cx - 22, sy + 10, 44, 18, '#16121e'); PX.R(ctx, cx - 21, sy + 11, 42, 16, '#1f3a2a');
      for (let k = 0; k < 3; k++) { const lx = cx - 22 + k * 18, ly = sy + 46, open = k < Z.open; PX.disc(ctx, lx + 4, ly, 7, '#2a2436'); PX.disc(ctx, lx + 4, ly, 6, open ? '#7fd6a8' : '#c8c0d0'); const a = (open ? 1.6 : 0) + (k === Z.open ? Math.sin(t / 150) * .3 : 0); PX.line(ctx, lx + 4, ly, lx + 4 + Math.cos(a - 1.57) * 5, ly + Math.sin(a - 1.57) * 5, '#2a1d24', 2); }
      PX.R(ctx, cx + 22, sy + 60, 6, 16, '#c8c0d0');
      PX.text(ctx, '嘘', cx - 6, sy + 70, 12, '#2a2436');
      for (let x = 0; x < W; x += ART.LW) ctx.drawImage(THEME.ground, x, GY);
      ctx.drawImage(PX.person(PL(), 'think'), cx + 44, GY - PX.SH + 1);
    }
    return { start, update, draw };
  })();

  /* ───── 🃏 암호 카드 뒤집기: 한자 카드와 뜻 카드를 짝지어요 ───── */
  const CARDS = (() => {
    let C = null;
    function start(cs) {
      go('mini'); CUR = 'cards'; Sound.bgm('check');
      const ids = shuffle(cs.clues.map((c, i) => i)).slice(0, 4);
      const deck = shuffle(ids.flatMap(ci => [{ ci, side: 'zh' }, { ci, side: 'ko' }]));
      C = { cs, deck, open: [], pairs: 0, miss: 0, lock: false, done: false, t: 0 };
      topPad('🃏 0/4', `<div class="small center">카드 2장을 뒤집어 한자와 뜻을 짝지어요</div>`);
      $('#gq').innerHTML = '🃏 무음단 암호 카드! 같은 뜻끼리 짝지으면 암호가 풀려요';
      const wrap = el(`<div class="mcards">${deck.map((d, i) => `<button class="mc" data-i="${i}"><span class="back">嘘</span><span class="front ${d.side}">${esc(d.side === 'zh' ? cs.clues[d.ci][0] : cs.clues[d.ci][2])}</span></button>`).join('')}</div>`);
      wrap.querySelectorAll('.mc').forEach(b => b.onclick = () => flip(+b.dataset.i, b));
      (LAND ? ov : pad).appendChild(wrap); C.wrap = wrap;
      tut('tutCards', `<h2>🃏 암호 카드 뒤집기!</h2><div class="t">무음단이 암호 카드를 엎어 놨어요.</div><div class="small" style="margin:1em 0;font-size:1.1em">카드를 2장씩 뒤집어서<br><b>한자 카드</b>와 <b>뜻 카드</b>를 짝지어요.<br>4쌍을 모두 찾으면 성공!</div>`);
    }
    async function flip(i, b) {
      if (!C || C.lock || b.classList.contains('up') || b.classList.contains('done')) return;
      b.classList.add('up'); Sound.sfx('tile'); const d = C.deck[i];
      if (d.side === 'zh') speak(C.cs.clues[d.ci][0]);
      C.open.push({ i, b, d });
      if (C.open.length < 2) return;
      C.lock = true; const [a, c] = C.open; C.open = [];
      if (a.d.ci === c.d.ci && a.d.side !== c.d.side) {
        await sleep(350); [a, c].forEach(x => x.b.classList.add('done')); C.pairs++; Sound.sfx('ding');
        const w = C.cs.clues[a.d.ci]; msg(`⭕ <b>${esc(w[0])}</b> <span>${esc(w[1])}</span> · ${esc(w[2])}`, 'ok', 1300); speak(w[0]);
        $('#dg').textContent = `🃏 ${C.pairs}/4`;
        if (C.pairs >= 4) { C.done = true; await sleep(900); const k = C; C = null; k.wrap.remove(); return finishMini('cards', true, { miss: Math.max(0, k.miss - 3) }, '🎉 암호를 모두 풀었어요!'); }
      } else { C.miss++; Sound.sfx('bad'); shake(2, .15); await sleep(900); [a, c].forEach(x => x.b.classList.remove('up')); }
      C.lock = false;
    }
    function update(dt) { if (C) C.t += dt; }
    function draw(t) {
      if (!C) return;
      PX.R(ctx, 0, 0, W, H, '#2a3a2e'); for (let y = 0; y < H; y += 8) for (let x = (y / 8 % 2) * 8; x < W; x += 16) PX.R(ctx, x, y, 8, 8, '#2f4234');
      PX.R(ctx, 0, GY, W, H - GY, '#5a3a24'); PX.R(ctx, 0, GY, W, 2, '#7a5a3a');
      ctx.drawImage(PX.person(PL(), 'think'), 8, GY - PX.SH + 1);
    }
    return { start, update, draw };
  })();

  /* ───── 🎈 풍선 터뜨리기: ▲▼로 움직이고 🏹 화살을 쏴서, 뜻에 맞는 한자 풍선만 터뜨려요 ───── */
  const BALLOON = (() => {
    let B = null;
    const COLS = ['#e2504c', '#4f8fdc', '#5fae6e', '#f2b631', '#b05a8a', '#ff8a3d'];
    function start(cs) {
      go('mini'); CUR = 'balloon'; Sound.bgm('subway');
      B = { cs, tgt: shuffle(cs.clues.map((c, i) => i)).slice(0, 3), ti: 0, got: 0, miss: 0, y: GY - 60, dir: 0, arrows: [], bals: [], spawn: .3, t: 0, cool: 0, done: false };
      topPad('🎈 0/3', `<div class="ctrl"><span class="vbtns"><button class="cbtn slide" id="bU">▲<small>위</small></button><button class="cbtn slide" id="bD">▼<small>아래</small></button></span><button class="cbtn jump" id="bF">🏹<small>쏘기</small></button></div><div class="small center">▲▼ 움직이기 · 🏹 또는 화면 누르기 = 쏘기 · 키보드 ↑↓ 스페이스</div>`);
      const hold = (b, d) => { b.addEventListener('pointerdown', e => { e.preventDefault(); B && (B.dir = d); }); ['pointerup', 'pointerleave', 'pointercancel'].forEach(k => b.addEventListener(k, () => { if (B && B.dir === d) B.dir = 0; })); };
      hold($('#bU'), -1); hold($('#bD'), 1); $('#bF').addEventListener('pointerdown', e => { e.preventDefault(); fire(); });
      prompt();
      tut('tutBalloon', `<h2>🎈 풍선 터뜨리기!</h2><div class="t">무음단이 훔친 단어를 풍선에 매달아 날려 보냈어요.</div><div class="small" style="margin:1em 0;font-size:1.1em">▲▼로 위아래로 움직이고 🏹 화살을 쏴요.<br>위에 적힌 <b>뜻에 맞는 한자 풍선</b>만 터뜨려요!<br>엉뚱한 풍선을 터뜨리면 실수예요.</div>`);
    }
    function prompt() { const c = B.cs.clues[B.tgt[B.ti]]; $('#gq').innerHTML = `🎈 「${esc(c[2])}」 풍선을 터뜨려요!`; $('#dg').textContent = `🎈 ${B.got}/3`; }
    function fire() { if (!B || B.done || B.cool > 0) return; B.cool = .35; B.arrows.push({ x: 38, y: B.y + 12 }); Sound.sfx('whoosh'); }
    function spawn() {
      const right = Math.random() < .38, ci = right ? B.tgt[B.ti] : pick(B.cs.clues.map((c, i) => i).filter(i => i !== B.tgt[B.ti]));
      const lab = el(`<div class="blab">${esc(B.cs.clues[ci][0])}</div>`); ov.appendChild(lab);
      B.bals.push({ ci, x: 90 + Math.random() * (W - 120), y: GY + 10, vy: -(18 + Math.random() * 14), sw: Math.random() * 6, col: pick(COLS), lab });
    }
    function update(dt) {
      if (!B || B.done || R.paused || uiRoot.querySelector('.card,.box')) return;
      B.t += dt; B.cool -= dt; B.spawn -= dt; if (B.spawn <= 0) { spawn(); B.spawn = .9 + Math.random() * .5; }
      B.y = Math.max(40, Math.min(GY - 30, B.y + B.dir * 110 * dt));
      B.arrows.forEach(a => a.x += 260 * dt); B.arrows = B.arrows.filter(a => a.x < W + 10 && !a.gone);
      for (const b of B.bals) {
        b.y += b.vy * dt; b.x += Math.sin(B.t * 2 + b.sw) * 8 * dt;
        for (const a of B.arrows) if (!a.gone && !b.pop && Math.abs(a.x - b.x) < 9 && Math.abs(a.y - (b.y + 2)) < 11) { a.gone = true; hit(b); }
      }
      B.bals.forEach(b => { if (b.pop) b.pop -= dt; if ((b.y < 20 || b.pop < 0) && b.lab) { b.lab.remove(); b.lab = null; } });
      B.bals = B.bals.filter(b => b.lab);
      if (B.t > 45) end(false);
    }
    function hit(b) {
      b.pop = .3; const c = B.cs.clues[b.ci]; speak(c[0]);
      if (b.ci === B.tgt[B.ti]) { B.got++; Sound.sfx('pop'); Sound.sfx('clue'); burst(b.x, b.y, b.col); msg(`⭕ <b>${esc(c[0])}</b> <span>${esc(c[1])}</span> · ${esc(c[2])}`, 'ok', 1300); if (B.got >= 3) return end(true); B.ti++; prompt(); }
      else { B.miss++; Sound.sfx('pop'); Sound.sfx('bad'); shake(3, .2); msg(`✖ 앗! <b>${esc(c[0])}</b>은(는) '${esc(c[2])}'`, 'no', 1500); }
    }
    function end(ok) { B.done = true; ov.querySelectorAll('.blab').forEach(x => x.remove()); const k = B; B = null; finishMini('balloon', ok, { got: k.got, miss: k.miss }, ok ? '🎉 단어 풍선 3개 명중!' : '⏰ 풍선이 다 날아가 버렸어요'); }
    function draw(t) {
      if (!B) return;
      if (skyC) ctx.drawImage(skyC, 0, 0);
      THEME.layers.forEach(L => ctx.drawImage(L.c, 0, 0));
      for (let x = 0; x < W; x += ART.LW) ctx.drawImage(THEME.ground, x, GY);
      B.bals.forEach(b => {
        const x = Math.round(b.x), y = Math.round(b.y);
        if (b.pop > 0) { for (let k = 0; k < 8; k++) { const a = k * .8; PX.R(ctx, x + Math.cos(a) * (14 - b.pop * 30), y + Math.sin(a) * (14 - b.pop * 30), 2, 2, b.col); } if (b.lab) b.lab.style.opacity = 0; return; }
        PX.line(ctx, x, y + 11, x + Math.round(Math.sin(t / 300 + b.sw) * 2), y + 24, '#5a4a5c');
        PX.ellipse(ctx, x, y, 9, 11, '#1d1424'); PX.ellipse(ctx, x, y, 8, 10, b.col); PX.R(ctx, x - 4, y - 6, 2, 3, '#ffffff99'); PX.R(ctx, x - 1, y + 10, 3, 2, b.col);
        if (b.lab) { b.lab.style.left = gx(x) + 'px'; b.lab.style.top = gx(y) + 'px'; }
      });
      B.arrows.forEach(a => { PX.R(ctx, a.x - 10, a.y, 12, 1, '#6a4028'); PX.R(ctx, a.x + 2, a.y - 1, 3, 3, '#c8c8d0'); PX.R(ctx, a.x - 12, a.y - 1, 3, 3, '#e2504c'); });
      // 탐정 (사다리차 발판 위)
      PX.R(ctx, 12, B.y + 30, 26, 3, '#5a4a3a'); PX.R(ctx, 24, B.y + 33, 2, GY - B.y - 33, '#8a8a96');
      ctx.drawImage(PX.person(PL(), 'stand'), 12, Math.round(B.y)); PX.R(ctx, 32, B.y + 9, 6, 2, '#8a5a30');
    }
    function key(e, down) {
      if (!B) return;
      if (['ArrowUp', 'w', 'W'].includes(e.key)) { e.preventDefault(); B.dir = down ? -1 : (B.dir < 0 ? 0 : B.dir); }
      else if (['ArrowDown', 's', 'S'].includes(e.key)) { e.preventDefault(); B.dir = down ? 1 : (B.dir > 0 ? 0 : B.dir); }
      else if (e.key === ' ' && down) { e.preventDefault(); fire(); }
    }
    function pointer(e, k) { if (B && k === 'down') fire(); }
    return { start, update, draw, key, pointer };
  })();

  /* ───── 🔗 짝꿍 선 잇기 (퍼즐): 왼쪽 앞말과 오른쪽 짝꿍 말을 선으로 이어요 ───── */
  const CONNECT = (() => {
    let Q = null;
    const LC = ['#e2504c', '#4f8fdc', '#5fae6e', '#f2b631'];
    function start(cs) {
      go('mini'); CUR = 'connect'; Sound.bgm('check');
      const pairs = cs.gates.slice(0, 4).map((g, i) => ({ i, L: g.stem, Rt: g.ans, ko: g.ko, full: g.stem.replace(/＿+/, g.ans), py: g.py }));
      Q = { cs, pairs, order: shuffle(pairs.map(p => p.i)), sel: null, done: 0, miss: 0, lines: [], end: false };
      topPad('🔗 0/4', `<div class="small center">왼쪽을 누르고 → 짝꿍인 오른쪽을 눌러요</div>`);
      $('#gq').innerHTML = '🔗 무음단이 짝꿍 말을 떼어 놨어요! 다시 이어 붙여요';
      const wrap = el(`<div class="mconn"><div class="colL">${pairs.map(p => `<button data-l="${p.i}">${esc(p.L)}</button>`).join('')}</div><div class="colR">${Q.order.map(i => `<button data-r="${i}">${esc(pairs[i].Rt)}</button>`).join('')}</div></div>`);
      wrap.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { if (b.classList.contains('done')) return; wrap.querySelectorAll('[data-l]').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); Q.sel = +b.dataset.l; Sound.sfx('tile'); });
      wrap.querySelectorAll('[data-r]').forEach(b => b.onclick = () => link(+b.dataset.r, b));
      (LAND ? ov : pad).appendChild(wrap); Q.wrap = wrap;
      tut('tutConnect', `<h2>🔗 짝꿍 선 잇기!</h2><div class="t">함께 쓰는 말끼리는 짝꿍이에요. (坐 + 轻轨)</div><div class="small" style="margin:1em 0;font-size:1.1em">왼쪽 앞말을 누르고,<br>그 빈칸에 들어갈 <b>오른쪽 짝꿍</b>을 눌러 선으로 이어요.</div>`);
    }
    async function link(ri, b) {
      if (!Q || Q.end || b.classList.contains('done')) return;
      if (Q.sel == null) { msg('먼저 왼쪽 앞말을 골라요', '', 1000); return; }
      const lb = Q.wrap.querySelector(`[data-l="${Q.sel}"]`);
      if (ri === Q.sel) {
        const p = Q.pairs[ri], col = LC[Q.done % 4];
        [lb, b].forEach(x => { x.classList.remove('sel'); x.classList.add('done'); x.style.borderColor = col; });
        Q.lines.push({ a: lb, b, col }); Q.done++; Sound.sfx('ding'); speak(p.full);
        msg(`⭕ <b>${esc(p.full)}</b> <span>${esc(p.py)}</span> · ${esc(p.ko)}`, 'ok', 1500);
        $('#dg').textContent = `🔗 ${Q.done}/4`; Q.sel = null;
        if (Q.done >= 4) { Q.end = true; await sleep(1300); const k = Q; Q = null; k.wrap.remove(); return finishMini('connect', true, { miss: k.miss }, '🎉 짝꿍 말을 모두 이었어요!'); }
      } else { Q.miss++; Sound.sfx('bad'); b.classList.remove('bad'); void b.offsetWidth; b.classList.add('bad'); msg(`✖ 「${esc(Q.pairs[Q.sel].L.replace(/＿+/, Q.pairs[ri].Rt))}」 는 어색해요`, 'no', 1400); }
    }
    function update() {}
    function draw(t) {
      if (!Q) return;
      PX.R(ctx, 0, 0, W, H, '#f3ead8'); for (let x = 0; x < W; x += 10) PX.R(ctx, x, 0, 1, H, '#e8dcc4'); for (let y = 0; y < H; y += 10) PX.R(ctx, 0, y, W, 1, '#e8dcc4');
      // 이어진 선 (HTML 버튼 위치를 게임 좌표로)
      if (Q.wrap) { const r0 = cv.getBoundingClientRect(); Q.lines.forEach(l => { const a = l.a.getBoundingClientRect(), b = l.b.getBoundingClientRect(); const k = W / r0.width; if (a.top > r0.bottom || !LAND) return; PX.line(ctx, (a.right - r0.left) * k, (a.top + a.height / 2 - r0.top) * k, (b.left - r0.left) * k, (b.top + b.height / 2 - r0.top) * k, l.col, 3); }); }
      ctx.drawImage(PX.person(PL(), 'think'), 6, GY - PX.SH + 1);
    }
    return { start, update, draw };
  })();

  /* ───── 🧩 덩어리 미로 (퍼즐): 칸을 이어 밟으며 문장 길을 찾아 출구로! ───── */
  const MAZE = (() => {
    let Z = null;
    const COLS = 4, ROWS = 3;
    function makePath(n) {
      for (let tries = 0; tries < 200; tries++) {
        const p = [[0, (Math.random() * ROWS) | 0]], seen = new Set([p[0].join()]);
        while (p.length < n) {
          const [c, r] = p[p.length - 1], nb = shuffle([[c + 1, r], [c, r + 1], [c, r - 1], [c - 1, r]]).filter(([x, y]) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !seen.has(x + ',' + y));
          if (!nb.length) break; const nx = nb.find(([x]) => x > c) || nb[0]; p.push(nx); seen.add(nx.join());
        }
        if (p.length === n && p[n - 1][0] >= COLS - 2) return p;
      }
      return null;
    }
    function start(cs) {
      go('mini'); CUR = 'maze'; Sound.bgm('flash');
      const st = cs.ladder.slice().reverse().find(l => l.t.length >= 4 && l.t.length <= 6) || cs.ladder[3];
      const path = makePath(st.t.length) || Array.from({ length: st.t.length }, (_, i) => [i % COLS, Math.floor(i / COLS)]);
      const sent = st.t.join(''), pool = shuffle(CASES.flatMap(k => k.clues.map(c => c[0])).filter((x, i, arr) => arr.indexOf(x) === i && !sent.includes(x) && !st.t.some(t => x.includes(t.replace(/[，。！？,!?]/g, '')))));
      const grid = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) grid.push({ c, r, t: null });
      path.forEach(([c, r], i) => { grid[r * COLS + c].t = st.t[i]; grid[r * COLS + c].k = i; });
      grid.forEach(g => { if (g.t == null) g.t = pool.pop() || '…'; });
      Z = { cs, st, path, grid, pos: -1, miss: 0, end: false };
      topPad('🧩 0/' + st.t.length, `<div class="small center">왼쪽 첫 칸부터, 바로 옆 칸만 이어서 밟아요</div>`);
      $('#gq').innerHTML = `🧩 "${esc(st.ko)}" 문장 길을 따라 출구로!`;
      const wrap = el(`<div class="mmaze">${grid.map((g, i) => `<button data-i="${i}">${esc(g.t)}</button>`).join('')}</div>`);
      wrap.querySelectorAll('button').forEach(b => b.onclick = () => step(+b.dataset.i, b));
      (LAND ? ov : pad).appendChild(wrap); Z.wrap = wrap;
      tut('tutMaze', `<h2>🧩 덩어리 미로!</h2><div class="t">무음단이 미로에 함정 칸을 숨겼어요.</div><div class="small" style="margin:1em 0;font-size:1.1em">위에 적힌 뜻의 문장이 되도록<br><b>맨 왼쪽 첫 칸</b>부터 <b>바로 옆 칸</b>을 이어서 눌러요.<br>대각선은 안 돼요!</div>`);
    }
    async function step(i, b) {
      if (!Z || Z.end) return;
      const g = Z.grid[i], want = Z.pos + 1, prev = Z.pos >= 0 ? Z.path[Z.pos] : null;
      const adj = prev ? Math.abs(prev[0] - g.c) + Math.abs(prev[1] - g.r) === 1 : g.c === 0;
      if (g.k === want && adj) {
        Z.pos++; b.classList.add('on'); Sound.sfx('tile'); speak(g.t); $('#dg').textContent = `🧩 ${Z.pos + 1}/${Z.st.t.length}`;
        if (Z.pos >= Z.st.t.length - 1) { Z.end = true; const full = Z.st.t.join(''); Sound.sfx('open'); speak(full); msg(`⭕ 출구 도착! <b>${esc(full)}</b>`, 'ok', 2000); await sleep(1800); const k = Z; Z = null; k.wrap.remove(); return finishMini('maze', true, { miss: k.miss }, '🎉 미로 탈출 성공!'); }
      } else {
        Z.miss++; Sound.sfx('bad'); b.classList.remove('bad'); void b.offsetWidth; b.classList.add('bad');
        msg(!adj ? '✖ 바로 옆 칸만 밟을 수 있어요' : `✖ 함정 칸! 「${esc(g.t)}」 다음엔 다른 말이 와요`, 'no', 1300);
        if (Z.miss >= 3) { const h = Z.grid.findIndex(x => x.k === want); const hb = Z.wrap.querySelectorAll('button')[h]; if (hb) hb.classList.add('hint'); }
      }
    }
    function update() {}
    function draw(t) {
      if (!Z) return;
      PX.R(ctx, 0, 0, W, H, '#2a3048'); for (let y = 0; y < H; y += 12) for (let x = (y / 12 % 2) * 12; x < W; x += 24) PX.R(ctx, x, y, 12, 12, '#30385a');
      PX.R(ctx, W - 18, 70, 14, 30, '#ffd36e'); PX.text(ctx, '出口', W - 19, 102, 7, '#ffd36e');
      ctx.drawImage(PX.person(PL(), 'think'), 6, GY - PX.SH + 1);
    }
    return { start, update, draw };
  })();

  /* ───── 🔢 슬라이딩 퍼즐: 조각을 밀어 도시 사진을 맞춰요. 조각 번호는 중국어 숫자 一~八 ───── */
  const SLIDE = (() => {
    let P = null;
    const NUM = ['一', '二', '三', '四', '五', '六', '七', '八'];
    function picture(cs) {
      const [c, g] = PX.mk(120, 120), th = ART.THEMES[cs.theme]();
      th.sky(g); g.drawImage(th.layers[0].c, -10, -70); if (th.layers[1]) g.drawImage(th.layers[1].c, -40, -60);
      for (let x = 0; x < 120; x += ART.LW) g.drawImage(th.ground, x, 104);
      PX.R(g, 0, 0, 120, 14, '#2a1d2ecc'); PX.text(g, cs.city, 4, 0, 12, '#ffd36e');
      return c.toDataURL();
    }
    function start(cs) {
      go('mini'); CUR = 'slide'; Sound.bgm('check');
      let tiles = [0, 1, 2, 3, 4, 5, 6, 7, 8];         // 8 = 빈칸
      let blank = 8, prev = -1;
      for (let k = 0; k < 20; k++) { const r = (blank / 3) | 0, c = blank % 3; const nb = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < 3 && b < 3).map(([a, b]) => a * 3 + b).filter(p => p !== prev); const n = pick(nb); [tiles[blank], tiles[n]] = [tiles[n], tiles[blank]]; prev = blank; blank = n; }
      P = { cs, tiles, moves: 0, done: false, img: picture(cs) };
      topPad('🔢 0번', `<div class="small center">빈칸 옆 조각을 누르면 밀려요 · 一二三 순서대로 맞춰요</div>`);
      $('#gq').innerHTML = '🔢 무음단이 찢어 놓은 도시 사진! 一 → 八 순서로 맞춰요';
      render();
      tut('tutSlide', `<h2>🔢 슬라이딩 퍼즐!</h2><div class="t">무음단이 도시 사진을 조각조각 섞어 놨어요.</div><div class="small" style="margin:1em 0;font-size:1.1em">빈칸 옆 조각을 누르면 미끄러져요.<br>조각의 중국어 숫자 <b>一 二 三 … 八</b> 순서로<br>왼쪽 위부터 맞춰요!</div>`);
    }
    function render() {
      document.querySelectorAll('.mslide').forEach(x => x.remove());
      const wrap = el(`<div class="mslide">${P.tiles.map((t, i) => t === 8 ? `<div class="st empty"></div>` : `<button class="st" data-i="${i}" style="background-image:url(${P.img});background-position:${(t % 3) * 50}% ${((t / 3) | 0) * 50}%"><b>${NUM[t]}</b></button>`).join('')}</div>`);
      wrap.querySelectorAll('button').forEach(b => b.onclick = () => move(+b.dataset.i));
      (LAND ? ov : pad).appendChild(wrap);
    }
    async function move(i) {
      if (!P || P.done) return;
      const bl = P.tiles.indexOf(8), r = (i / 3) | 0, c = i % 3, br = (bl / 3) | 0, bc = bl % 3;
      if (Math.abs(r - br) + Math.abs(c - bc) !== 1) { Sound.sfx('bad'); return; }
      [P.tiles[i], P.tiles[bl]] = [P.tiles[bl], P.tiles[i]]; P.moves++; Sound.sfx('tile');
      speak(NUM[P.tiles[bl]]); $('#dg').textContent = `🔢 ${P.moves}번`; render();
      if (P.tiles.every((t, k) => t === k)) {
        P.done = true; Sound.sfx('open'); speak(P.cs.title.zh);
        msg(`⭕ 완성! <b>${esc(P.cs.title.zh)}</b>`, 'ok', 2200);
        await sleep(2000); const k = P; P = null; document.querySelectorAll('.mslide').forEach(x => x.remove());
        return finishMini('slide', true, { moves: k.moves, miss: k.moves > 40 ? 1 : 0 }, `🎉 도시 사진 완성! (${k.moves}번 움직임)`);
      }
    }
    function update() {}
    function draw(t) { if (!P) return; PX.R(ctx, 0, 0, W, H, '#3a2a4a'); for (let y = 0; y < H; y += 10) PX.R(ctx, 0, y, W, 1, '#423252'); ctx.drawImage(PX.person(PL(), 'think'), 6, GY - PX.SH + 1); }
    return { start, update, draw };
  })();

  /* ───── 🔍 틀린 그림 찾기: 두 골목 그림에서 다른 곳 4군데를 찾으면 숨은 단어가 나와요 ───── */
  const SPOT = (() => {
    let S2 = null;
    const PW = 150, PH = 100;
    function scene(cs) {
      const r = PX.rng((Math.random() * 1e6) | 0), items = [];
      items.push({ k: 'sun', x: 120, y: 14, on: true });
      [[4, 30, 34, 70, '#c99a7a'], [40, 22, 30, 78, '#9fb6c0'], [72, 34, 36, 66, '#e2b88a'], [110, 26, 36, 74, '#b8a0c8']].forEach(([x, y, w, h, col]) => items.push({ k: 'bld', x, y, w, h, col }));
      for (let b = 0; b < 4; b++) for (let k = 0; k < 4; k++) items.push({ k: 'win', x: [8, 44, 76, 114][b] + (k % 2) * 13, y: [36, 28, 40, 32][b] + Math.floor(k / 2) * 16, on: r() < .5 });
      items.push({ k: 'line', x: 0, y: 46 });
      [16, 46, 76, 106, 136].forEach((x, i) => items.push({ k: 'lan', x, y: 50 + (i % 2) * 3, col: '#e2504c' }));
      items.push({ k: 'sign', x: 76, y: 70, t: cs.city.slice(0, 2) });
      items.push({ k: 'bike', x: 18, y: 86, on: true });
      items.push({ k: 'cat', x: 128, y: 92, on: true });
      items.push({ k: 'pot', x: 60, y: 90, col: '#5fae6e' });
      items.push({ k: 'bird', x: 52, y: 12, on: true });
      return items;
    }
    const DIFFS = [
      it => { const l = it.filter(x => x.k === 'lan'); const o = pick(l); o.col = '#4f8fdc'; return [o.x - 5, o.y - 3, 10, 12]; },
      it => { const o = it.find(x => x.k === 'cat'); o.on = false; return [o.x - 8, o.y - 10, 18, 12]; },
      it => { const o = it.find(x => x.k === 'bike'); o.on = false; return [o.x - 2, o.y - 10, 22, 14]; },
      it => { const o = it.find(x => x.k === 'bird'); o.on = false; return [o.x - 4, o.y - 4, 12, 9]; },
      it => { const o = it.find(x => x.k === 'pot'); o.col = '#ff9ab3'; return [o.x - 4, o.y - 10, 12, 16]; },
      it => { const o = it.find(x => x.k === 'sun'); o.on = false; return [o.x - 9, o.y - 9, 18, 18]; },
      it => { const w = pick(it.filter(x => x.k === 'win')); w.on = !w.on; return [w.x - 1, w.y - 1, 10, 12]; },
      it => { const o = it.find(x => x.k === 'sign'); o.t = '嘘'; return [o.x - 2, o.y - 2, 30, 14]; }
    ];
    function paint(items) {
      const [c, g] = PX.mk(PW, PH);
      PX.vgrad(g, 0, 0, PW, 80, ['#9fd0f0', '#cfe8f8', '#f8e8d0']);
      items.forEach(o => {
        if (o.k === 'sun' && o.on) { PX.disc(g, o.x, o.y, 7, '#ffd36e'); PX.disc(g, o.x, o.y, 5, '#fff1b8'); }
        if (o.k === 'bird' && o.on) { PX.line(g, o.x - 3, o.y, o.x, o.y + 2, '#3b2a35'); PX.line(g, o.x, o.y + 2, o.x + 3, o.y, '#3b2a35'); }
        if (o.k === 'bld') { PX.R(g, o.x, o.y, o.w, o.h, o.col); PX.R(g, o.x, o.y, o.w, 2, '#00000022'); PX.R(g, o.x + o.w - 3, o.y, 3, o.h, '#00000018'); }
        if (o.k === 'win') { PX.R(g, o.x, o.y, 8, 10, '#3b2a35'); PX.R(g, o.x + 1, o.y + 1, 6, 8, o.on ? '#ffd98a' : '#6a8ab0'); }
        if (o.k === 'line') PX.R(g, 0, o.y, PW, 1, '#3b2a35');
        if (o.k === 'lan') { PX.R(g, o.x, o.y - 3, 1, 3, '#3b2a35'); PX.ellipse(g, o.x, o.y + 3, 4, 4, o.col); PX.R(g, o.x - 3, o.y + 1, 7, 1, '#f2c14e'); }
        if (o.k === 'sign') { PX.R(g, o.x, o.y, 26, 10, '#2a1d24'); PX.R(g, o.x + 1, o.y + 1, 24, 8, '#c0392b'); PX.text(g, o.t, o.x + 3, o.y - 1, 8, '#ffe9a8'); }
      });
      PX.R(g, 0, 80, PW, 20, '#b9a596'); for (let x = 0; x < PW; x += 12) PX.R(g, x, 88, 11, 1, '#9a8676');
      items.forEach(o => {
        if (o.k === 'bike' && o.on) { PX.disc(g, o.x + 3, o.y, 3, '#2a2430'); PX.disc(g, o.x + 15, o.y, 3, '#2a2430'); PX.line(g, o.x + 3, o.y, o.x + 9, o.y - 6, '#f2b631'); PX.line(g, o.x + 9, o.y - 6, o.x + 15, o.y, '#f2b631'); PX.R(g, o.x + 13, o.y - 9, 4, 1, '#2a2430'); }
        if (o.k === 'cat' && o.on) { PX.ellipse(g, o.x, o.y - 3, 5, 3, '#3b3550'); PX.disc(g, o.x + 5, o.y - 7, 2, '#3b3550'); PX.P(g, o.x + 4, o.y - 10, '#3b3550'); PX.P(g, o.x + 6, o.y - 10, '#3b3550'); }
        if (o.k === 'pot') { PX.R(g, o.x - 3, o.y - 4, 8, 6, '#a8743e'); PX.disc(g, o.x + 1, o.y - 7, 4, o.col); }
      });
      return c;
    }
    function start(cs) {
      go('mini'); CUR = 'spot'; Sound.bgm('flash');
      const A = scene(cs), Bi = JSON.parse(JSON.stringify(A));
      const which = shuffle(DIFFS.map((f, i) => i)).slice(0, 4), boxes = which.map(i => DIFFS[i](Bi));
      const words = shuffle(cs.clues.map((c, i) => i)).slice(0, 4);
      S2 = { cs, boxes: boxes.map((b, i) => ({ b, ci: words[i], found: false })), got: 0, miss: 0, t: 0, done: false, imgA: paint(A).toDataURL(), imgB: paint(Bi).toDataURL() };
      topPad('🔍 0/4', `<div class="small center">두 그림에서 다른 곳을 눌러요 · 찾으면 숨은 단어가 나와요</div>`);
      $('#gq').innerHTML = '🔍 무음단이 골목을 몰래 바꿔 놨어요! 다른 곳 4군데를 찾아요';
      const wrap = el(`<div class="mspot"><div class="pic"><img src="${S2.imgA}"><div class="marks"></div></div><div class="pic"><img src="${S2.imgB}"><div class="marks"></div></div></div>`);
      wrap.querySelectorAll('.pic').forEach(p => p.addEventListener('pointerdown', e => tap(e, p)));
      (LAND ? ov : pad).appendChild(wrap); S2.wrap = wrap;
      tut('tutSpot', `<h2>🔍 틀린 그림 찾기!</h2><div class="t">무음단이 골목을 몰래 바꾸고 단어를 숨겼어요.</div><div class="small" style="margin:1em 0;font-size:1.1em">두 그림을 비교해서 <b>다른 곳 4군데</b>를 눌러요.<br>찾을 때마다 숨어 있던 단어가 나와요!</div>`);
    }
    function tap(e, p) {
      if (!S2 || S2.done) return;
      const r = p.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * PW, y = (e.clientY - r.top) / r.height * PH;
      const hit = S2.boxes.find(o => !o.found && x > o.b[0] - 4 && x < o.b[0] + o.b[2] + 4 && y > o.b[1] - 4 && y < o.b[1] + o.b[3] + 4);
      if (!hit) { S2.miss++; Sound.sfx('bad'); shake(2, .12); msg('✖ 거기는 똑같아요', 'no', 800); return; }
      hit.found = true; S2.got++; Sound.sfx('clue');
      S2.wrap.querySelectorAll('.marks').forEach(m => { const d = document.createElement('i'); d.style.left = ((hit.b[0] + hit.b[2] / 2) / PW * 100) + '%'; d.style.top = ((hit.b[1] + hit.b[3] / 2) / PH * 100) + '%'; m.appendChild(d); });
      const c = S2.cs.clues[hit.ci]; speak(c[0]);
      msg(`🔍 발견! 숨은 단어 <b>${esc(c[0])}</b> <span>${esc(c[1])}</span> · ${esc(c[2])}`, 'ok', 1600);
      $('#dg').textContent = `🔍 ${S2.got}/4`;
      if (S2.got >= 4) { S2.done = true; setTimeout(() => { const k = S2; S2 = null; if (k) { k.wrap.remove(); finishMini('spot', true, { miss: Math.max(0, k.miss - 2) }, '🎉 바뀐 곳을 모두 찾았어요!'); } }, 1500); }
    }
    function update(dt) { if (S2) { S2.t += dt; if (S2.t > 75 && !S2.done) { S2.done = true; const k = S2; S2 = null; k.wrap.remove(); finishMini('spot', false, { miss: k.miss }, '⏰ 시간 끝! 다음엔 더 꼼꼼히 봐요'); } } }
    function draw(t) { if (!S2) return; PX.R(ctx, 0, 0, W, H, '#2a2436'); for (let x = 0; x < W; x += 14) PX.R(ctx, x, 0, 7, H, '#30293e'); ctx.drawImage(PX.person(PL(), 'think'), 6, GY - PX.SH + 1); }
    return { start, update, draw };
  })();

  /* ───── 📦 덩어리 택배: 컨베이어 위 상자의 빈칸 ＿ 에 맞는 말을, 상자가 끝에 닿기 전에 골라요 (옛 갈림길 문제) ───── */
  const PARCEL = (() => {
    let Q = null;
    const BOX = (() => { const [c, g] = PX.mk(34, 24); PX.R(g, 1, 3, 32, 20, '#c99252'); PX.R(g, 1, 3, 32, 3, '#e0b070'); PX.R(g, 15, 3, 4, 20, '#e8d6a8'); PX.R(g, 1, 22, 32, 1, '#8a5a30'); PX.R(g, 4, 9, 8, 6, '#fff6dc'); PX.R(g, 5, 10, 6, 1, '#8a8a9a'); PX.R(g, 5, 12, 4, 1, '#8a8a9a'); return PX.outline(c); })();
    const BELT_Y = GY - 72, X0 = 60;
    function start(cs, run) {
      go('mini'); CUR = 'parcel'; Sound.bgm('subway');
      const items = run.boss ? run.quizPool.splice(0, 4) : shuffle(cs.gates.map((g, i) => ({ g, gi: i }))).sort((a, b) => (save.weakGate[cs.no + ':' + b.gi] ? 1 : 0) - (save.weakGate[cs.no + ':' + a.gi] ? 1 : 0));
      Q = { cs, run, queue: items.slice(), need: items.length, got: 0, miss: 0, tried: new Set(), t: 0, x: W + 10, active: false, fly: null, drop: null };
      topPad(`📦 0/${Q.need}`);
      tut('tutParcel', `<h2>📦 덩어리 택배를 지켜라!</h2><div class="t">무음단이 택배 상자에 적힌 말을 지워 버렸어요.</div><div class="small" style="margin:1em 0;font-size:1.1em">상자의 <b>빈칸 ＿</b> 에 들어갈 말을 골라요.<br>상자가 <b>끝에 떨어지기 전에</b> 눌러야 해요!</div><div class="t">틀리거나 늦은 상자는 한 번 더 돌아와요.</div>`).then(round);
    }
    const stemOf = g => g.quiz ? g.q : g.stem;
    const fullOf = g => g.quiz ? g.ans : g.stem.replace(/＿+/, g.ans);
    function round() {
      if (!Q) return;
      const it = Q.queue[0], g = it.g; Q.cur = it;
      Q.opts = shuffle([g.ans, ...g.wrong.slice(0, 2)]);
      Q.x = W + 4; Q.speed = (W + 4 - X0) / Math.max(4.5, 8 - Q.got * .8); Q.active = true; Q.lock = false;
      ov.querySelectorAll('.plab').forEach(x => x.remove());
      Q.lab = el(`<div class="glab plab">${esc(stemOf(g)).replace(/＿+/, '<u>＿＿</u>')}</div>`); ov.appendChild(Q.lab); Q.lab._k = null;
      $('#gq').innerHTML = g.quiz ? `📦 <b>${esc(g.ko)}</b> — 알맞은 대답은?` : `📦 <b>${esc(g.ko)}</b> — 빈칸에 들어갈 말은?`;
      $('#dg').textContent = `📦 ${Q.got}/${Q.need}`;
      optBtns(Q.opts.map(esc), pickOpt, 'pbtn');
      Sound.sfx('gate'); if (g.quiz) speak(g.q);
    }
    function pickOpt(i, b) { if (!Q || !Q.active || Q.lock) return; resolve(Q.opts[i] === Q.cur.g.ans, false, b); }
    async function resolve(ok, late, b) {
      Q.lock = true; Q.active = false;
      const it = Q.cur, g = it.g, full = fullOf(g), first = !Q.tried.has(it); Q.tried.add(it);
      if (first) { R.gates.push({ g, ok, first: true }); if (!g.quiz) { if (ok) delete save.weakGate[Q.cs.no + ':' + it.gi]; else save.weakGate[Q.cs.no + ':' + it.gi] = 1; persist(); } }
      const btns = [...document.querySelectorAll('.mbtn button')], rb = btns[Q.opts.indexOf(g.ans)];
      if (ok) {
        b.classList.add('right'); Q.got++; Sound.sfx('ding'); Sound.sfx('stamp'); burst(Q.x + 17, BELT_Y - 12, '#7fd6a8'); speak(full);
        if (Q.lab) Q.lab.innerHTML = `✅ ${esc(full)}`;
        msg(`⭕ <b>${esc(full)}</b>${set.py && g.py ? ` <span>${esc(g.py)}</span>` : ''}${set.ko ? ` · ${esc(g.ko)}` : ''}`, 'ok', 1500);
        Q.fly = { x: Q.x, t: 0 }; Q.queue.shift();
      } else {
        if (b) b.classList.add('wrong'); if (rb) rb.classList.add('right'); Q.miss++; Sound.sfx('bad'); shake(3, .2); speak(full);
        msg(`${late ? '⏰ 늦었어요!' : '✖ 틀렸어요!'} 정답 <b>${esc(full)}</b>${set.py && g.py ? ` <span>${esc(g.py)}</span>` : ''}`, 'no', 2000);
        Q.drop = { x: Q.x, t: 0 }; Q.queue.push(Q.queue.shift());
      }
      $('#dg').textContent = `📦 ${Q.got}/${Q.need}`;
      await sleep(ok ? 1200 : 2000);
      if (!Q) return;
      ov.querySelectorAll('.plab').forEach(x => x.remove()); Q.lab = null; Q.fly = Q.drop = null;
      if (Q.got >= Q.need) { const q = Q; Q = null; return finishMini('parcel', true, { miss: q.miss }, '🎉 택배 배달 완료! 덩어리 박사!'); }
      round();
    }
    function update(dt) {
      if (!Q) return; Q.t += dt;
      if (Q.active && !Q.lock) { Q.x -= Q.speed * dt; if (Q.x <= X0) { Q.x = X0; resolve(false, true, null); } }
      if (Q.fly) Q.fly.t += dt; if (Q.drop) Q.drop.t += dt;
    }
    function draw(t) {
      if (!Q) return;
      PX.R(ctx, 0, 0, W, H, '#3d3346'); for (let x = 0; x < W; x += 16) PX.R(ctx, x, 0, 8, GY, '#443a50');
      // 선반 위 상자들
      for (let x = 70; x < W - 70; x += 60) { PX.R(ctx, x, 52, 48, 3, '#6a5a6c'); for (let k = 0; k < 3; k++) PX.R(ctx, x + 3 + k * 15, 38, 12, 14, k % 2 ? '#b8844a' : '#c99252'); }
      // 컨베이어
      PX.R(ctx, X0 - 4, BELT_Y, W - X0 + 8, 8, '#2a2436'); PX.R(ctx, X0 - 4, BELT_Y, W - X0 + 8, 2, '#5a5468');
      for (let x = X0; x < W; x += 12) { const o = ((t / 25) | 0) % 12; PX.R(ctx, x - o + 12, BELT_Y + 3, 4, 2, '#4a4458'); }
      for (let x = X0 + 6; x < W; x += 40) { PX.R(ctx, x, BELT_Y + 8, 4, GY - BELT_Y - 8, '#4a4458'); }
      // 끝: 쓰레기통 (늦으면 여기로 떨어져요)
      PX.R(ctx, X0 - 40, GY - 26, 34, 26, '#5a6474'); PX.R(ctx, X0 - 42, GY - 28, 38, 3, '#7a8494'); PX.text(ctx, '✕', X0 - 28, GY - 21, 9, '#e2504c');
      // 위쪽: 트럭 (맞히면 날아가요)
      PX.R(ctx, W - 60, 6, 56, 26, '#e8e0d0'); PX.R(ctx, W - 60, 6, 56, 3, '#d0702a'); PX.text(ctx, '快递', W - 46, 11, 9, '#d0702a');
      // 상자
      let bx = Q.x, by = BELT_Y - 24;
      if (Q.fly) { const k = Math.min(1, Q.fly.t / .8); bx = Q.fly.x + (W - 48 - Q.fly.x) * k; by = BELT_Y - 24 - Math.sin(k * Math.PI) * 40 - k * (BELT_Y - 40); }
      if (Q.drop) { const k = Math.min(1, Q.drop.t / .5); bx = Q.drop.x - k * 34; by = BELT_Y - 24 + k * k * (GY - BELT_Y - 4); }
      if (Q.active || Q.fly || Q.drop) {
        ctx.drawImage(BOX, Math.round(bx), Math.round(by));
        const near = Q.active && Q.x < X0 + 70 && Math.floor(t / 150) % 2; if (near) PX.R(ctx, Math.round(bx), Math.round(by) - 3, 34, 2, '#e2504c');
        if (Q.lab) { const lw = Q.lab._w || (Q.lab._w = Q.lab.offsetWidth), X = Math.round(Math.max(lw / 2 + 4, Math.min(gx(W) - lw / 2 - 4, gx(bx + 17)))), Y = Math.round(gx(by - 12)), k2 = X + ',' + Y; if (Q.lab._k !== k2) { Q.lab._k = k2; Q.lab.style.transform = `translate3d(${X}px, ${Y}px, 0) translate(-50%, -50%)`; } }
      }
      for (let x = 0; x < W; x += ART.LW) ctx.drawImage(THEME.ground, x, GY);
      ctx.drawImage(PX.person(PL(), Q.lock ? 'cheer' : 'think', Math.floor(t / 300) % 2), 2, GY - PX.SH + 1);
    }
    return { start, update, draw };
  })();

  const GAMES = { dodge: DODGE, flash: FLASH, subway: SUBWAY, whack: WHACK, radio: RADIO, safe: SAFE, cards: CARDS, balloon: BALLOON, connect: CONNECT, maze: MAZE, slide: SLIDE, spot: SPOT, parcel: PARCEL };
  return {
    start(k, cs, run) { const G = { flash: FLASH, subway: SUBWAY, whack: WHACK, radio: RADIO, safe: SAFE, cards: CARDS, balloon: BALLOON, connect: CONNECT, maze: MAZE, slide: SLIDE, spot: SPOT, parcel: PARCEL }[k]; if (G) return G.start(cs, run); return dodge(cs, run); },
    update(dt) { if (CD || !CUR || !GAMES[CUR]) return; GAMES[CUR].update(dt); },
    draw(t) { if (CUR && GAMES[CUR]) GAMES[CUR].draw(t); },
    key(e, d) { if (CUR && GAMES[CUR].key) GAMES[CUR].key(e, d); },
    pointer(e, k) { if (CUR && GAMES[CUR].pointer) GAMES[CUR].pointer(e, k); },
    get D() { return D; }, get cur() { return CUR; }
  };
})();
