import type { AvatarController } from '../avatar/scene';
import { prefersReducedMotion, reducedMotionQuery } from './motion';

const GROOVE_MS = 2800;
/** How long after load to wait for the page to settle before loading 3D anyway. */
const SETTLE_MS = 2500;

/**
 * Hero stage: the SVG avatar is always in the HTML (instant paint, no-WebGL and
 * reduced-motion fallback). When conditions are right we lazy-load Three.js
 * and crossfade to the 3D version.
 */
export function initStage(): void {
  const stage = document.getElementById('avatar-stage');
  const svg = document.getElementById('avatar-svg');
  const btn = document.getElementById('groove-btn');
  const bubble = document.getElementById('stage-bubble');
  const status = document.getElementById('groove-status');
  if (!stage || !svg) return;

  let controller: AvatarController | null = null;
  let grooveTimer = 0;

  const showGroove = () => {
    stage.classList.add('is-grooving');
    if (status) status.textContent = 'Vansh nods along to the beat.';
    window.clearTimeout(grooveTimer);
    grooveTimer = window.setTimeout(() => {
      stage.classList.remove('is-grooving');
      if (status) status.textContent = '';
    }, GROOVE_MS);
  };
  const setBubble = (on: boolean) => bubble?.classList.toggle('is-on', on);

  btn?.addEventListener('click', () => {
    if (controller) controller.groove(); // fires showGroove via onGroove
    else showGroove();
  });
  svg.addEventListener('click', showGroove);

  // 2D greeting so the fallback says hi too.
  const greet2d = () => {
    window.setTimeout(() => setBubble(true), 700);
    window.setTimeout(() => setBubble(false), 3600);
  };

  if (!canUse3D()) {
    greet2d();
    return;
  }

  let started = false;
  const start = async () => {
    if (started) return;
    started = true;
    io.disconnect();
    try {
      const { mountAvatar } = await import('../avatar/scene');
      if (prefersReducedMotion()) return;
      controller = await mountAvatar(stage, {
        onWave: setBubble,
        onGroove: showGroove,
      });
      stage.classList.add('is-3d');
    } catch (err) {
      console.warn('[avatar] 3D scene unavailable, keeping the illustration.', err);
      stage.classList.remove('is-3d');
      greet2d();
    }
  };

  // The SVG is already on screen, so there's no rush: load Three.js on the first
  // interaction, or once the page has settled, and only if the stage is near the viewport.
  let near = false;
  let ready = false;
  const maybeStart = () => {
    if (near && ready) start();
  };
  const io = new IntersectionObserver(
    (entries) => {
      near = entries.some((e) => e.isIntersecting);
      maybeStart();
    },
    { rootMargin: '200px' },
  );
  const markReady = () => {
    if (ready) return;
    ready = true;
    for (const type of INTERACTIONS) window.removeEventListener(type, markReady);
    maybeStart();
  };
  const INTERACTIONS = ['pointermove', 'pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
  const begin = () => {
    io.observe(stage);
    for (const type of INTERACTIONS) window.addEventListener(type, markReady, { once: true, passive: true });
    window.setTimeout(() => whenIdle(markReady), SETTLE_MS);
  };
  if (document.readyState === 'complete') begin();
  else window.addEventListener('load', begin, { once: true });

  reducedMotionQuery.addEventListener('change', () => {
    if (prefersReducedMotion() && controller) {
      controller.dispose();
      controller = null;
      stage.classList.remove('is-3d');
      setBubble(false);
    }
  });
}

function canUse3D(): boolean {
  if (prefersReducedMotion()) return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return false;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

function whenIdle(fn: () => void): void {
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
    .requestIdleCallback;
  if (ric) ric(fn, { timeout: 2500 });
  else window.setTimeout(fn, 600);
}
