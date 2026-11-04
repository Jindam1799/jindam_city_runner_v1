# 서드파티 고지 (Third-Party Notices)

진담 도시 탐정 런에는 다음 오픈소스 소프트웨어와 글꼴이 포함되어 있거나 사용됩니다.

---

## pixelfx — MIT License

- 출처: https://github.com/patch-gg/pixelfx
- 버전: v0.3.0, commit `a84159688af3ca37a4be05a0d422b94451b2e24e` (`third_party/pixelfx/`)
- 사용: 내보낸 스프라이트 시트 (`assets/fx/`: clue, hit, poof, pow, star, spark, confetti)와 도시 날씨 이펙트 코드(`js/wx.js`가 `third_party/pixelfx/src`의 weather/fog·falling-leaves·cherry-blossoms·snow를 실시간으로 그림)

```
MIT License

Copyright (c) 2026 Patch
Copyright (c) 2026 Hugo Duprez

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

pixelfx가 밝힌 추가 고지 (`third_party/pixelfx/NOTICE.md`):

- **Sprite Fusion pixel art VFX** (Hugo Duprez), MIT License — `src/core/sim.js`와 일부 이펙트(예: `spawn/poof`의 연기 덩어리)가 각색. https://www.spritefusion.com/pixel-art-vfx
- **Hollow Crown** (rehan-remade), MIT License — `src/core/act.js`. https://github.com/rehan-remade/hollow-crown

> **Patch Pixel 폰트는 포함하지 않았고 사용하지 않습니다.** 이 폰트(pixelfx `gallery/fonts/PatchPixel-Regular.woff2`)는
> Patch의 소유이며 MIT 라이선스 대상이 아닙니다. 저장소에 넣을 때 `gallery/`와 이 폰트를 쓰는 도구(`tools/build-gallery.mjs`, `tools/serve.mjs`)를 제외했습니다.

---

## 글꼴 — SIL Open Font License 1.1

Google Fonts에서 불러옵니다 (저장소에 포함하지 않음).

- **Jua** — Copyright (c) Woowahan Brothers. https://fonts.google.com/specimen/Jua
- **Noto Sans SC** — Copyright (c) Google LLC. https://fonts.google.com/noto/specimen/Noto+Sans+SC

pixelfx 이펙트를 뺀 게임 안의 도트 그래픽, 캐릭터·배경, 효과음과 배경음은 이 프로젝트에서 직접 만든 것이며
© 2026 진담중국어 (Jindam Chinese). All rights reserved.
