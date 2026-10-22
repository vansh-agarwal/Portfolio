import { prefersReducedMotion } from './motion';

/** Prev/next buttons for the horizontally scrolling project list. */
export function initTracks(): void {
  const scroller = document.getElementById('projects-track');
  const buttons = document.querySelectorAll<HTMLButtonElement>('.tracks-nav__btn');
  if (!scroller || !buttons.length) return;

  const step = () => {
    const card = scroller.querySelector<HTMLElement>('.project');
    const gap = parseFloat(getComputedStyle(scroller.querySelector('.projects')!).columnGap) || 0;
    return card ? card.offsetWidth + gap : scroller.clientWidth * 0.8;
  };

  buttons.forEach((btn) =>
    btn.addEventListener('click', () => {
      scroller.scrollBy({
        left: Number(btn.dataset.dir) * step(),
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }),
  );

  const update = () => {
    const max = scroller.scrollWidth - scroller.clientWidth;
    buttons[0].disabled = scroller.scrollLeft <= 2;
    buttons[1].disabled = scroller.scrollLeft >= max - 2;
  };
  scroller.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
}
