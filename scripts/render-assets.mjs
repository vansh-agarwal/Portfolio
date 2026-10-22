// Renders the 3D avatar to static images with headless Chrome:
//   public/og.png               1200x630 social sharing card
//   public/apple-touch-icon.png 512x512 home-screen icon
//
// Usage: npm run render-assets   (set CHROME_PATH if Chrome isn't found)
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';

const root = resolve(import.meta.dirname, '..');
const candidates = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);
const chrome = candidates.find((p) => existsSync(p));
if (!chrome) {
  console.error('Chrome not found. Set CHROME_PATH to your Chrome/Chromium executable.');
  process.exit(1);
}

const server = await createServer({ root, server: { port: 5199, strictPort: true }, logLevel: 'warn' });
await server.listen();
// Warm the dev server so dependency pre-bundling happens before Chrome loads the page.
await fetch('http://localhost:5199/Portfolio/tools/render.html');
await server.waitForRequestsIdle?.();
const base = 'http://localhost:5199/Portfolio/tools/render.html';

const shots = [
  { mode: 'og', out: 'public/og.png', w: 1200, h: 630, scale: 1 },
  // Chrome won't open a window narrower than ~500px; iOS scales a 512px icon down fine.
  { mode: 'icon', out: 'public/apple-touch-icon.png', w: 512, h: 512, scale: 1 },
];

const profile = mkdtempSync(join(tmpdir(), 'avatar-render-'));
try {
  for (const s of shots) {
    const out = join(root, s.out);
    // Async spawn: a sync one would block this process, and with it the Vite server Chrome is loading from.
    const status = await run(
      chrome,
      [
        '--headless=new',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--hide-scrollbars',
        '--disable-extensions',
        '--no-first-run',
        `--force-device-scale-factor=${s.scale}`,
        `--window-size=${s.w},${s.h}`,
        '--virtual-time-budget=10000',
        `--user-data-dir=${profile}`,
        `--screenshot=${out}`,
        `${base}?mode=${s.mode}`,
      ],
    );
    if (status !== 0 || !existsSync(out)) throw new Error(`Rendering ${s.out} failed`);
    console.log(`wrote ${s.out}`);
  }
} finally {
  await server.close();
  rmSync(profile, { recursive: true, force: true });
}

function run(cmd, args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'ignore'] });
    child.on('error', reject);
    child.on('exit', (code) => resolveRun(code));
  });
}
