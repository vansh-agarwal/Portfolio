import {
  AmbientLight,
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  Timer,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
  BackSide,
} from 'three';
import { AVATAR_CONFIG } from './config';
import { AvatarAnimator } from './animator';
import { buildProceduralAvatar } from './procedural';
import type { AvatarRig } from './rig';

export interface MountOptions {
  /** Play the uncross, wave, recross intro once ready. */
  intro?: boolean;
  /** Cursor/tilt follow, click reactions and scroll parallax. */
  interactive?: boolean;
  /** For static renders (OG image, icons): keeps the drawing buffer and renders on demand. */
  still?: boolean;
  framing?: 'full' | 'face';
  /** Still mode only: fast-forward the intro to this many seconds (for checking poses). */
  introAt?: number;
  /** Still mode only: fixed look direction, -1..1. */
  look?: { x: number; y: number };
  onWave?(waving: boolean): void;
  onGroove?(): void;
}

export interface AvatarController {
  groove(): void;
  dispose(): void;
  /** Render a frame now (for still mode). */
  renderOnce(): void;
  canvas: HTMLCanvasElement;
}

const C = AVATAR_CONFIG.colors;

export async function mountAvatar(container: HTMLElement, opts: MountOptions = {}): Promise<AvatarController> {
  const { intro = true, interactive = true, still = false, framing = 'full' } = opts;
  const isSmall = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;

  const renderer = new WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'default',
    preserveDrawingBuffer: still,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2));
  renderer.outputColorSpace = SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new Scene();
  scene.add(new AmbientLight('#fff2e2', 1.35));
  const key = new DirectionalLight('#ffffff', 2.1);
  key.position.set(2.2, 3.5, 4);
  scene.add(key);
  const rim = new DirectionalLight('#ffd9a8', 1.4);
  rim.position.set(-3, 2.5, -2.5);
  scene.add(rim);

  await yieldToMain();
  const rig: AvatarRig =
    AVATAR_CONFIG.source === 'glb'
      ? await (await import('./glb')).loadGlbAvatar()
      : buildProceduralAvatar({ detail: isSmall ? 0.6 : 1 });

  await yieldToMain();
  const stage = new Group();
  stage.add(buildGround());
  stage.add(rig.root);
  scene.add(stage);

  const camera = new PerspectiveCamera(framing === 'face' ? 24 : 26, 1, 0.1, 50);
  const frame = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (framing === 'face') {
      camera.position.set(0, 1.74, 1.45);
      camera.lookAt(0, 1.72, 0);
    } else {
      // Keep the whole figure (plus the ground disc) in view for any aspect ratio.
      const halfV = Math.tan((camera.fov * Math.PI) / 360);
      const dist = Math.max(5.2, 0.8 / (halfV * camera.aspect));
      camera.position.set(0, 1.12, dist);
      camera.lookAt(0, 0.93, 0);
    }
    camera.updateProjectionMatrix();
  };
  frame();
  // Compile shaders off the critical path where the browser supports it.
  await renderer.compileAsync(scene, camera);
  await yieldToMain();
  container.appendChild(canvas);

  const animator = new AvatarAnimator(rig, { onWave: opts.onWave });

  // ---------- input: cursor, touch, device tilt ----------
  const look = { x: 0, y: 0 };
  let lastInput = -Infinity;
  const timer = new Timer();
  const listeners: [EventTarget, string, EventListener][] = [];
  const on = <K extends string>(target: EventTarget, type: K, fn: (e: Event) => void, o?: AddEventListenerOptions) => {
    target.addEventListener(type, fn, o);
    listeners.push([target, type, fn]);
  };

  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const hitsAvatar = (clientX: number, clientY: number) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(rig.hitTargets, true).length > 0;
  };

  const groove = () => {
    animator.groove();
    opts.onGroove?.();
  };

  if (interactive) {
    const aimAt = (clientX: number, clientY: number) => {
      const r = container.getBoundingClientRect();
      // Aim at roughly where his head is on screen.
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.22;
      look.x = Math.max(-1, Math.min(1, (clientX - cx) / (window.innerWidth * 0.45)));
      look.y = Math.max(-1, Math.min(1, (cy - clientY) / (window.innerHeight * 0.45)));
      lastInput = timer.getElapsed();
    };
    on(window, 'pointermove', (e) => {
      const pe = e as PointerEvent;
      aimAt(pe.clientX, pe.clientY);
      if (pe.pointerType === 'mouse') canvas.style.cursor = hitsAvatar(pe.clientX, pe.clientY) ? 'pointer' : '';
    }, { passive: true });

    let askedTilt = false;
    on(canvas, 'pointerdown', (e) => {
      const pe = e as PointerEvent;
      aimAt(pe.clientX, pe.clientY);
      const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
      if (!askedTilt && typeof DOE?.requestPermission === 'function') {
        askedTilt = true;
        DOE.requestPermission().catch(() => {});
      }
    });
    on(canvas, 'click', (e) => {
      const me = e as MouseEvent;
      if (hitsAvatar(me.clientX, me.clientY)) groove();
    });

    let baseBeta: number | null = null;
    on(window, 'deviceorientation', (e) => {
      const { beta, gamma } = e as DeviceOrientationEvent;
      if (beta == null || gamma == null) return;
      baseBeta ??= beta;
      look.x = Math.max(-1, Math.min(1, gamma / 25));
      look.y = Math.max(-1, Math.min(1, (baseBeta - beta) / 25));
      lastInput = timer.getElapsed();
    });
  }

  // ---------- render loop, paused when off screen or tab hidden ----------
  const target = { x: 0, y: 0 };
  const tick = () => {
    timer.update();
    const dt = timer.getDelta();
    const t = timer.getElapsed();
    if (still) {
      target.x = opts.look?.x ?? 0;
      target.y = opts.look?.y ?? 0;
    } else if (t - lastInput > 4) {
      // Nobody's steering: let him glance around on his own.
      target.x = Math.sin(t * 0.35) * 0.35;
      target.y = Math.sin(t * 0.23) * 0.15 + 0.05;
    } else {
      target.x = look.x;
      target.y = look.y;
    }
    if (interactive) {
      const r = container.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height)));
      stage.position.y = -p * 0.4;
      stage.rotation.y = p * 0.6;
    }
    rig.root.updateMatrixWorld(true);
    animator.update(dt, target);
    renderer.render(scene, camera);
  };

  let onScreen = true;
  let running = false;
  const sync = () => {
    const shouldRun = !still && onScreen && document.visibilityState === 'visible';
    if (shouldRun === running) return;
    running = shouldRun;
    if (running) timer.reset();
    renderer.setAnimationLoop(running ? tick : null);
  };
  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    sync();
  });
  io.observe(container);
  on(document, 'visibilitychange', sync);
  const ro = new ResizeObserver(() => {
    frame();
    if (!running) tick();
  });
  ro.observe(container);

  if (still) {
    // Let the smoothed look-at settle, and optionally fast-forward the intro.
    const warmLook = opts.look ?? { x: 0, y: 0 };
    for (let s = 0; s < 1.5; s += 1 / 60) animator.update(1 / 60, warmLook);
    if (opts.introAt != null) {
      animator.playIntro();
      for (let s = 0; s < opts.introAt; s += 1 / 60) animator.update(1 / 60, warmLook);
    }
  }
  // First frame before we reveal the canvas, so there's no blank flash.
  tick();
  if (intro && !still) animator.playIntro();
  sync();

  return {
    canvas,
    groove,
    renderOnce: tick,
    dispose() {
      renderer.setAnimationLoop(null);
      io.disconnect();
      ro.disconnect();
      for (const [t, type, fn] of listeners) t.removeEventListener(type, fn);
      scene.traverse((o) => {
        const m = o as Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mat of mats) {
          for (const v of Object.values(mat)) if (v && typeof v === 'object' && 'isTexture' in v) (v as { dispose(): void }).dispose();
          mat.dispose();
        }
      });
      timer.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

/** Pastel ground disc with a little stretch of road and a soft blob shadow. */
function buildGround(): Group {
  const g = new Group();

  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = C.ground;
  ctx.fillRect(0, 0, size, size);
  // road band running left to right
  ctx.fillStyle = C.road;
  ctx.fillRect(0, size * 0.36, size, size * 0.28);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, size * 0.375, size, 5);
  ctx.fillRect(0, size * 0.62 - 5, size, 5);
  ctx.fillStyle = C.roadLine;
  for (let x = 6; x < size; x += 56) ctx.fillRect(x, size * 0.5 - 5, 32, 10);
  // soft shadow under the feet
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.26);
  grad.addColorStop(0, 'rgba(34,28,59,0.32)');
  grad.addColorStop(0.6, 'rgba(34,28,59,0.12)');
  grad.addColorStop(1, 'rgba(34,28,59,0)');
  ctx.fillStyle = grad;
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.scale(1, 0.75);
  ctx.translate(-size / 2, -size / 2);
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  const top = new CanvasTexture(c);
  top.colorSpace = SRGBColorSpace;
  top.anisotropy = 4;

  const radius = 0.68;
  const disc = new Mesh(new CylinderGeometry(radius, radius, 0.06, 64), [
    new MeshToonMaterial({ color: '#9fe3c4' }),
    new MeshBasicMaterial({ map: top }),
    new MeshBasicMaterial({ color: C.ground }),
  ]);
  disc.position.y = -0.03;
  disc.rotation.y = Math.PI / 2; // road runs left to right across the frame
  g.add(disc);

  const rimLine = new Mesh(
    new CylinderGeometry(radius + 0.014, radius + 0.014, 0.074, 64),
    new MeshBasicMaterial({ color: C.outline, side: BackSide }),
  );
  rimLine.position.y = -0.03;
  g.add(rimLine);

  // a tiny shadow plane right under the shoes for contact
  const shadow = new Mesh(
    new PlaneGeometry(0.42, 0.24),
    new MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.002, 0.02);
  g.add(shadow);
  return g;
}

function blobTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(34,28,59,0.45)');
  grad.addColorStop(1, 'rgba(34,28,59,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

/** Break long setup work into separate tasks so the page stays responsive. */
function yieldToMain(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}
