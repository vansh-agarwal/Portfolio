/** Total trip length in km. Matches the graduation year, which is the joke. */
const TRIP_KM = 2028;
const WHOLE_DIGITS = 4;

export function initOdometer(): void {
  const host = document.getElementById('odometer');
  const trip = document.querySelector<HTMLElement>('.trip');
  if (!host) return;

  const strips: HTMLElement[] = [];
  const makeDigit = (tenth = false) => {
    const digit = document.createElement('span');
    digit.className = tenth ? 'odo-digit odo-digit--tenth' : 'odo-digit';
    const strip = document.createElement('span');
    strip.className = 'odo-digit__strip';
    for (let i = 0; i < 10; i++) {
      const n = document.createElement('span');
      n.textContent = String(i);
      strip.appendChild(n);
    }
    digit.appendChild(strip);
    host.appendChild(digit);
    strips.push(strip);
  };
  for (let i = 0; i < WHOLE_DIGITS; i++) makeDigit();
  makeDigit(true);

  let queued = false;
  const update = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    const tenths = Math.round(progress * TRIP_KM * 10);
    const digits = String(tenths).padStart(WHOLE_DIGITS + 1, '0');
    strips.forEach((strip, i) => strip.style.setProperty('--d', digits[i]));
    trip?.style.setProperty('--trip', progress.toFixed(4));
  };
  const onScroll = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
}
