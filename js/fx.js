/* ───────── ✨ pixelfx 이펙트 재생기 ─────────
   assets/fx/manifest.json (tools/pixelfx/export.mjs 가 만듦)을 읽어 스프라이트 시트를 불러오고,
   게임 캔버스(게임 픽셀 좌표) 위에 한 번씩 재생합니다.
   FXS.play('clue', x, y, { flip, scale })  → x,y = 이펙트의 기준점(pivot) 위치
   불러오기 전이면 false를 돌려주니, 기존 효과를 대체로 남겨 둘 수 있어요.
   이펙트 원본: pixelfx (MIT) — THIRD_PARTY_NOTICES.md */
const FXS = (() => {
  const BASE = 'assets/fx/', SHEETS = {}, live = [];
  let on = true;
  fetch(BASE + 'manifest.json?v=' + (window.APP_V || '')).then(r => r.json()).then(m => {
    for (const [k, e] of Object.entries(m.effects || {})) {
      fetch(BASE + e.json + '?v=' + (window.APP_V || '')).then(r => r.json()).then(j => {
        const img = new Image();
        img.onload = () => {
          const put = im => { SHEETS[k] = { img: im, fr: j.frames.map(f => f.frame), fps: e.fps, pv: e.pivot, loop: e.loop }; };
          // 미리 풀어 두기: 처음 터질 때 그림을 푸느라 멈칫하지 않게
          if (window.createImageBitmap) createImageBitmap(img).then(put, () => put(img)); else put(img);
        };
        img.src = BASE + e.png + '?v=' + (window.APP_V || '');
      }).catch(() => {});
    }
  }).catch(() => {});
  return {
    ready: k => !!SHEETS[k],
    play(k, x, y, o = {}) {
      const s = SHEETS[k]; if (!s || !on) return false;
      if (live.length > 12) live.shift();
      live.push({ s, x, y, t: -(o.delay || 0), flip: !!o.flip, sc: o.scale || 1, speed: o.speed || 1, follow: o.follow || null });
      return true;
    },
    clear() { live.length = 0; },
    set enabled(v) { on = v; if (!v) live.length = 0; },
    get enabled() { return on; },
    /* 매 프레임: 화면 위에 그리기 (흔들림 변환 안쪽) */
    draw(ctx, dt) {
      for (let i = live.length - 1; i >= 0; i--) {
        const e = live[i]; e.t += dt * e.speed;
        if (e.t < 0) continue;
        const n = Math.floor(e.t * e.s.fps);
        if (n >= e.s.fr.length) { live.splice(i, 1); continue; }
      }
      for (const e of live) {
        if (e.t < 0) continue;
        const f = e.s.fr[Math.min(e.s.fr.length - 1, Math.floor(e.t * e.s.fps))], sc = e.sc;
        let x = e.x, y = e.y; if (e.follow) { const p = e.follow(); x = p[0]; y = p[1]; }
        const dx = Math.round(x - e.s.pv[0] * sc), dy = Math.round(y - e.s.pv[1] * sc);
        if (e.flip) {
          ctx.save(); ctx.translate(Math.round(x), 0); ctx.scale(-1, 1);
          ctx.drawImage(e.s.img, f.x, f.y, f.w, f.h, Math.round(-e.s.pv[0] * sc), dy, f.w * sc, f.h * sc); ctx.restore();
        } else ctx.drawImage(e.s.img, f.x, f.y, f.w, f.h, dx, dy, f.w * sc, f.h * sc);
      }
    },
  };
})();
