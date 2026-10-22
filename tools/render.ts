// Dev-only harness for rendering the avatar to images (OG card, icons) and
// checking poses. Not part of the production build.
//   /Portfolio/tools/render.html?mode=debug&t=2.2&lx=0.3&ly=0
//   /Portfolio/tools/render.html?mode=og
//   /Portfolio/tools/render.html?mode=icon
import '@fontsource/shrikhand/400.css';
import '@fontsource-variable/bricolage-grotesque';
import '../src/styles/tokens.css';
import { mountAvatar } from '../src/avatar/scene';

const q = new URLSearchParams(location.search);
const mode = q.get('mode') ?? 'debug';
const stage = document.getElementById('stage')!;
const num = (k: string) => (q.has(k) ? Number(q.get(k)) : undefined);
const look = { x: num('lx') ?? 0, y: num('ly') ?? 0 };

async function run() {
  if (mode === 'og') {
    document.body.innerHTML = `
      <div style="position:absolute;inset:0;background:#fff7e8;display:grid;grid-template-columns:1fr 470px;font-family:var(--font-body);color:#221c3b">
        <div style="padding:70px 0 60px 80px;display:grid;align-content:center;gap:22px">
          <div style="justify-self:start;padding:8px 18px;background:#d2f5e5;border:3px solid #221c3b;border-radius:999px;font-weight:700;font-size:24px">&#9679; Open to AI/ML internships</div>
          <div style="font-family:var(--font-display);font-size:92px;line-height:1;color:#c3321a">Vansh Agarwal</div>
          <div style="font-weight:800;font-size:46px;line-height:1.1;max-width:15ch">I build ML systems that <span style="background:linear-gradient(transparent 58%,#ffc83d 58% 92%,transparent 92%)">leave the notebook.</span></div>
          <div style="font-size:24px;font-weight:600;color:#4f4870">B.Tech CSE, VIT Chennai &middot; CGPA 8.54</div>
        </div>
        <div style="position:relative">
          <div style="position:absolute;left:50%;top:70px;width:380px;height:380px;transform:translateX(-50%);border-radius:50%;background:radial-gradient(circle,#ffe9a8 0 58%,transparent 59%),repeating-conic-gradient(#ffc83d 0 6deg,transparent 6deg 18deg)"></div>
          <div id="stage" style="position:absolute;inset:0"></div>
        </div>
        <div style="position:absolute;left:0;right:0;bottom:0;height:22px;background:#ddd3ee;border-top:3px solid #221c3b"><div style="margin-top:8px;height:5px;background:repeating-linear-gradient(90deg,#ffc83d 0 30px,transparent 30px 52px)"></div></div>
      </div>`;
    await document.fonts.ready;
    await mountAvatar(document.getElementById('stage')!, { still: true, interactive: false, look: { x: -0.25, y: 0.05 } });
  } else if (mode === 'icon') {
    document.body.style.background = '#ffc83d';
    await mountAvatar(stage, { still: true, interactive: false, framing: 'face', look });
  } else {
    await mountAvatar(stage, { still: true, interactive: false, introAt: num('t'), look });
  }
  document.title = 'ready';
  (window as unknown as { __ready: boolean }).__ready = true;
}
run();
