import { prefersReducedMotion } from './motion';

/** Buttons lean toward the cursor a little. Mouse only, and never with reduced motion. */
export function initMagnetic(): void {
  if (prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;

  document.querySelectorAll<HTMLElement>('.magnetic').forEach((el) => {
    const strength = 0.28;
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * strength;
      const y = (e.clientY - (r.top + r.height / 2)) * strength * 1.3;
      el.style.transition = 'transform 80ms linear, box-shadow 220ms';
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transition = 'transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 220ms';
      el.style.transform = '';
    });
  });
}
