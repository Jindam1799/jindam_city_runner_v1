---
name: pixelfx
description: Pixel art VFX for 진담 도시 탐정 런 (vanilla canvas) with the vendored pixelfx library (pinned v0.3.0 in third_party/pixelfx). Use whenever the game needs a pixel effect, hit/pickup juice, city weather, a sprite sheet or a recolor: export it with tools/pixelfx/export.mjs into assets/fx, play it with FXS.play, and check it in the running game.
license: MIT
compatibility: Node 18+.
---

# pixelfx — 도시 탐정 런 프로젝트용

이 게임은 Phaser 없이 캔버스 하나(게임 픽셀 W×200, GY=172 바닥)로 그립니다.

## 프로젝트 규칙 (반드시)

- **고정 버전**: `third_party/pixelfx/` (commit `a84159688af3ca37a4be05a0d422b94451b2e24e`, v0.3.0). 이 폴더는 수정하지 않습니다. 갱신은 `bash tools/pixelfx/fetch-pixelfx.sh <commit>` + `THIRD_PARTY_NOTICES.md` 커밋 수정.
- **Patch Pixel 폰트 금지**: `gallery/`는 넣지 않았습니다. 어떤 결과물에도 쓰지 마세요.
- **크레딧**: 다른 오픈소스를 각색한 자작 이펙트는 `THIRD_PARTY_NOTICES.md`에 추가.
- **화면 크기**: 높이가 200픽셀뿐이라 한 프레임이 약 140×140을 넘으면 화면을 가립니다. 배율(scale)은 1로 두고(픽셀이 깨짐) 작은 이펙트를 고르세요.
- **밝은 낮 배경**: 빛(light)은 시트에 알파로 구워지므로, 밝은 배경에서는 팔레트를 진하게/밝게 바꿔 확인합니다.
- **휴대폰 성능**: 한 번 터지는 이펙트는 시트(`fps: 15`), 계속 도는 날씨는 `js/wx.js`가 실시간(10fps, 320×180)으로 그리고 느리면 저절로 꺼집니다.

## 게임에 넣기

1. 찾기·보기: `cd third_party/pixelfx && node tools/list.mjs <검색어>` → `node tools/render.mjs <id>` → `records/<id>/contact.png` 확인.
2. 등록: `tools/pixelfx/fx.config.json`의 `effects`에 `{ "key", "id", "fps": 15, "options": {...}, "use" }` 추가.
3. 내보내기: `node tools/pixelfx/export.mjs` (하나만: `... export.mjs <key> --preview`) → `assets/fx/<key>.png/json` + `manifest.json`. 게임이 자동으로 불러옵니다.
4. 재생: `FXS.play('<key>', x, y, { flip, delay })` (`js/fx.js`). x,y = 이펙트 기준점(pivot, 보통 발밑). 못 불러왔거나 설정에서 꺼져 있으면 `false` → 기존 효과로 대체: `FXS.play(...) || puff(...)`.
   화면이 바뀌면(`go()`) 재생 중인 이펙트는 지워집니다. 그리기는 `loop()` 맨 끝(흔들림 안쪽).
5. 날씨: `js/wx.js`의 `CITY` 표에 테마 키 → `weather/<이름>` + 팔레트·투명도·패럴랙스. 달리기(`drawRun`)와 장면(`drawScene`)에서 그림. 설정 「날씨·반짝 효과」로 끔.
6. 확인: `python3 -m http.server`로 띄우고 Playwright로 스크린샷 + `FXS.ready('<key>')`, `WX.on` 확인.

현재 이펙트: clue(단서), hit(부딪힘), poof(자전거로 부수기), pow(무음단 잡기), star(미니게임 정답), spark, confetti(사다리 꼭대기). 날씨: 重庆 안개, 成都 대나무잎, 昆明 꽃잎, 哈尔滨 눈.

## pixelfx 원본 가이드 (v0.3.0, 경로만 이 저장소에 맞춤)


# pixelfx

Pixel art effects as code. Each effect is one file, `src/fx/<category>/<name>.js`, that draws into two buffers:
**color** (pixels: opaque, dithered or truly translucent) and **light** (additive glow). No images, so an effect
can be played live, recolored, mirrored, reseeded and rendered to a sprite sheet for any engine.

The method is Hugo Duprez's ([How to make (good) pixel art effects with
Claude](https://www.spritefusion.com/blog/how-to-make-good-pixel-art-effects-with-claude)): code is clay, trust
your eyes, feed your references. One-shot prompts make mediocre effects. Drafts you render, look at and refine
make good ones.

## Before anything

1. 이 저장소에는 pixelfx가 `third_party/pixelfx/`에 **고정 버전으로 들어 있습니다**. 새로 clone하지 마세요.
   아래의 `node tools/...` 명령은 모두 `third_party/pixelfx/` 안에서 실행합니다(또는 `npm run fx:render -- <id>`).
2. Check it runs: `node tools/render.mjs fire/torch` writes `records/fire/torch/contact.png`. Open that PNG with
   your image-reading tool. That contact sheet is how you see every effect from now on.

## 1. Look for an existing effect first

`node tools/list.mjs <words>` searches ids, names, tags and descriptions (`node tools/list.mjs frost`,
`node tools/list.mjs slash loop`). `docs/CATALOG.md` lists everything by category. Render the candidates and
look at them before choosing. Most requests are an existing effect with different options:

- `palette`: the main ramp, dark to bright, as hex strings. Any `PAL` ramp in `src/core/color.js` (fire ember
  lava smoke dust ice water electric volt poison holy heal arcane shadow blood earth stone gold leaf wood metal
  bone neon cyber matrix candy night) or your own. A blue fire is `{"palette": PAL.ice}`.
- `seed` for a different but equivalent take; `flip` to face left; `angle` to rotate; `light` (0..1+) for glow
  strength; plus each effect's own knobs in its `meta.options` (size, count, radius, text, height...).
- Try options without editing code: `node tools/render.mjs fire/torch --opts '{"palette":["#102","#215","#43a","#8cf","#fff"]}'`.

## 2. Put it in the game

**Canvas or WebGL games in JS or TS** (plain canvas, Phaser, PixiJS, Kaplay, three.js): use the code directly. It
has no dependencies; copy `src/core` and the effect files you need, or depend on the repo.

```js
import { createFrame, clearFrame, createFx, composite } from "pixelfx";   // src/core/index.js
import * as frostNova from "pixelfx/fx/ice/frost-nova";                   // src/fx/ice/frost-nova.js

const frame = createFrame(320, 180);            // the game's pixel resolution; ox, oy scroll it with the camera
const img = new ImageData(320, 180);
const fx = createFx(frostNova, { x: hero.x, y: hero.y, flip: hero.facing < 0 });

// every tick
fx.update(dt);
clearFrame(frame);
fx.draw(frame, "back");    // what goes behind characters
drawCharacters();          // your own sprites, or draw them into frame.color yourself
fx.draw(frame, "front");
composite(frame, img.data, background);   // color over the background plus light; or null for transparent
ctx.putImageData(img, 0, 0);              // then scale the canvas up with image-rendering: pixelated
if (fx.done()) removeIt();               // one-shots end on their own; fx.stop() fades a loop out
```

Several effects can share one frame. In a WebGL engine, upload the composited RGBA to a texture each frame, or
render the effect to a sprite sheet once (below) and play it like any other animation.

**Any engine** (Godot, Unity, GameMaker, Defold, LÖVE, Bevy, Construct): export sprite sheets.
`node tools/render.mjs ice/frost-nova --sheet` writes `records/ice/frost-nova/frost-nova.png` (transparent
frames in a grid) and `frost-nova.json` (Aseprite-style frames, so Phaser's atlas loader, Godot and Unity Aseprite
importers and most tools read it; `meta.pixelfx` has fps, loop, frame size, columns and the pivot). Set the
pivot to `meta.pixelfx.pivot` (the effect's origin, e.g. the feet), import with nearest-neighbour filtering and no
compression, and play at `meta.pixelfx.fps`. Glow is baked into the sheet as color with alpha, which reads as
additive over dark scenes; for bright scenes, render a recolored version or keep the effect on a dark layer.

For the full library: `node tools/render.mjs <category> --sheet` does a whole category.

**A hit needs a body behind it.** An effect alone looks like a sticker. Effects with a character carry an `act`: when the body winds
up, when to freeze, how the target reacts. Use it whichever way the game is built:

- With the stock character: `createAct(slash, { x, y })` instead of `createFx`. `act.update(dt)`, `act.draw(frame)`, and throw the
  picture by `act.shake`. It holds still by itself during a freeze. `node tools/act.mjs <id> --sheet` bakes the lot into a sprite sheet.
- With the game's own character: read the timing, `slash.act` or `meta.pixelfx.act` in a sheet's JSON (`windup`, `recovery`, `hits`
  with `t` and `freeze`). Play the character's attack animation `windup` seconds before the effect, and at each hit stop updating
  everything, effect and characters both, for `freeze` seconds. Host-side hit-stop works on any effect, with or without an act.

`src/fx/moves/` has whole attacks chained from the effects, wind-up to recovery: start there when someone asks for a move, not an effect.

## 3. Make a new one

Read `docs/AUTHORING.md` first: it is the contract (meta, `draw(p, t, o)` for pure effects or `create(o)` for
simulated ones, local coordinates, seamless loops, ending empty), the toolkit, the painter API and the quality bar.
Then:

1. **Say it in one line** with art direction: what it is, how it moves, its palette, its timing. "A frost nova:
   crystals erupt in a ring from the feet outward, a white flash at the center, shards spin off, the floor stays
   frosted and fades."
2. **Find references** in the library: `node tools/list.mjs <words>`, then read the two or three closest effect
   files and borrow their techniques (`Particles` and `Bits` in `src/core/sim.js` for sparks, smoke and debris,
   `p.disc` for translucent volumes, `cycle` for seamless particles, `tileFbm` scrolls for flames and water). Look at
   the closest of [Hugo Duprez's effects](https://www.spritefusion.com/pixel-art-vfx) too: they are the quality bar.
   If his has more detail, light or life at the same size on screen, yours isn't done.
3. **Draft.** `node tools/new.mjs <category>/<name>` (add `--loop` for a loop) gives a working file. When the
   direction is open, write 3 to 5 genuinely different drafts (`<name>-a.js` .. `-e.js`), render them all
   (`node tools/render.mjs "<category>/<name>-*"`) and look at every contact sheet before choosing. Show the user
   the strongest two or three if they're around (`--gif` makes animations to share).
4. **Look, judge, fix.** Render, open `records/<id>/contact.png`, and judge like a picky pixel artist. Fix the
   worst thing, render again. Three rounds minimum; a showpiece takes more. `--all` shows every frame,
   `--mp4` shows motion at full speed.
5. **Act it out** if a character is involved: add `export const act` (see "Acts" in `docs/AUTHORING.md`), with a wind-up before t = 0,
   a pose change on the release frame, a freeze on contact and a recovery. `node tools/act.mjs <id>` shows consecutive 12 fps steps:
   judge motion from those and from `--mp4`, not from a contact sheet's samples.
6. **Check.** `node tools/check.mjs <id>` catches drawing outside the canvas, one-shots that don't end empty,
   loop seams, unseeded randomness and slow frames, and in an act: keys out of order, unknown pose fields and hands
   that teleport. Fix until it passes clean. Delete the drafts you didn't keep.

What to look for, and the usual fix:

| you see | fix |
|---|---|
| it reads as mush at 1x | fewer colors, a clear silhouette, one focal point, bigger shapes |
| speckle: lone noise pixels inside shapes | threshold noise less, quantize with `at()`, no noise on small shapes |
| floaty, no punch | fast in, slow out (`ease.outQuart`/`outExpo`), a 1 to 2 frame white hero frame, shorter total time |
| stiff or mechanical | vary every particle (size, speed, delay, life), add secondary motion (sparks, smoke, debris) |
| washed out | less glow (k 0.2 to 0.5), darker edge steps, keep white for the hottest core only |
| flat | light from one side: brighter top-left, darker bottom-right step; a darker ramp step at the base |
| smooth gradients, vector look | hard ramp steps in color; softness only in light and in translucent smoke |
| a checkerboard where smoke should be | `SMOKE`, `VAPOUR` or `DUST` particles, or `p.disc`: truly translucent, lit on top |
| seam when a loop wraps | `cycle`, `loopNoise(phase)`, whole-cell `tileNoise` scrolls, `sin(phase * TAU * n)` |
| a one-shot that pops off | let it shrink, dither out or fall away before t = duration |
| a great effect on a dead character | give it an act: wind-up, release pose, freeze on contact, a target that reacts, recovery |
| the act feels weightless | a wind-up the opposite way to the blow, a longer freeze (up to 0.2 s), a bigger silhouette change, shake |
| the hit lands out of sync | move the hit key to the effect's own constant, not to a time you eyeballed |
| he holds the weapon badly | keep a bend in the elbow, shafts in front of the chest; on a swing the blade lags the hand; arms reach about 15 px and don't stretch, so step the body in |
| his arms cross or the pose looks flat | he faces three-quarters towards us: for open arms the near hand goes left (`fx < 0`), far hand right, with `turn: 1`; `yaw` really turns him |

Directional effects face right, ground effects stand on y = 0, actor effects wrap `o.actor` (a 24 x 38 stock
character's mask and pixels), and nothing uses `Math.random`. Generic motifs are fine; never recreate a specific game's
sprites, characters or logos.

## 4. Native code instead of JS

If the game can't run JS and a sprite sheet isn't enough (an effect that follows a moving target, or needs
per-instance colors at runtime), port the effect. Pure effects are a function of time; simulated ones step the particles in
`src/core/sim.js`. Keep the two-buffer idea, the 4x4 Bayer threshold for dithered alpha and the palette ramp lookups.
Render the JS original and your port side by side to check they match.
