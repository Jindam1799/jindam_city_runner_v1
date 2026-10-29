/* 중국어 음성 (브라우저 내장 음성). 2.5초 안에 시작하지 않으면 다음 중국어 목소리로 다시 읽음 */
const TTS = (() => {
  const ok = 'speechSynthesis' in window;
  let voices = [], bad = new Set(), rate = 0.85, chosen = null, works = null;
  function load() {
    if (!ok) return;
    voices = speechSynthesis.getVoices().filter(v => /^zh/i.test(v.lang) || /chinese|普通话|中文/i.test(v.name));
    voices.sort((a, b) => score(b) - score(a));
  }
  function score(v) {
    let s = 0;
    if (/zh[-_]CN/i.test(v.lang)) s += 10;
    if (/HK|TW/i.test(v.lang)) s -= 5;
    if (/Google|Tingting|Xiaoxiao|Yaoyao|Huihui|Meijia/i.test(v.name)) s += 3;
    return s;
  }
  if (ok) { load(); speechSynthesis.onvoiceschanged = load; }
  function pick() {
    if (chosen) { const v = voices.find(v => v.name === chosen); if (v) return v; }
    return voices.find(v => !bad.has(v.name)) || null;
  }
  function speak(text, opt = {}) {
    if (!ok || !text) return Promise.resolve(false);
    return new Promise(res => {
      try { if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel(); } catch (e) {}
      const v = pick();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN'; if (v) u.voice = v;
      u.rate = opt.rate || rate; u.volume = 1;
      let started = false, done = false;
      const fin = r => { if (!done) { done = true; res(r); } };
      u.onstart = () => { started = true; works = true; };
      u.onend = () => fin(true);
      u.onerror = () => fin(false);
      setTimeout(() => {
        if (!started && !done) {
          try { speechSynthesis.cancel(); } catch (e) {}
          if (v && !opt.retry) { bad.add(v.name); speak(text, Object.assign({}, opt, { retry: 1 })).then(fin); }
          else { works = works || false; fin(false); }
        }
      }, 2500);
      speechSynthesis.speak(u);
    });
  }
  return {
    speak, ok,
    get voices() { return voices; },
    setRate(r) { rate = r; },
    setVoice(n) { chosen = n || null; },
    stop() { if (ok) try { speechSynthesis.cancel(); } catch (e) {} },
    get works() { return works; }
  };
})();
