export function initExtras(): void {
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  initCopyEmail();
  initCassette();
}

function initCopyEmail(): void {
  const btn = document.getElementById('copy-email') as HTMLButtonElement | null;
  const status = document.getElementById('copy-status');
  if (!btn) return;
  const label = btn.textContent;
  btn.addEventListener('click', async () => {
    const email = btn.dataset.email ?? '';
    try {
      await navigator.clipboard.writeText(email);
      btn.textContent = 'Copied! Honk honk';
      if (status) status.textContent = 'Email address copied to clipboard.';
    } catch {
      btn.textContent = email;
      if (status) status.textContent = `Could not copy automatically. The address is ${email}.`;
    }
    window.setTimeout(() => {
      btn.textContent = label;
    }, 2200);
  });
}

/** Footer easter egg: a tiny synthesized road-trip jingle plus a double honk. No audio files. */
function initCassette(): void {
  const btn = document.getElementById('cassette');
  if (!btn) return;
  let ctx: AudioContext | null = null;
  let busy = false;

  btn.addEventListener('click', () => {
    if (busy) return;
    const AC =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    busy = true;
    btn.classList.add('is-playing');

    // A cheerful arpeggio up, a little turnaround, then beep beep.
    const notes: [number, number, OscillatorType][] = [
      [523.25, 0.14, 'triangle'],
      [659.25, 0.14, 'triangle'],
      [783.99, 0.14, 'triangle'],
      [1046.5, 0.24, 'triangle'],
      [880.0, 0.14, 'triangle'],
      [1046.5, 0.3, 'triangle'],
      [0, 0.12, 'triangle'],
      [392.0, 0.12, 'square'],
      [0, 0.06, 'square'],
      [392.0, 0.2, 'square'],
    ];
    let t = ctx.currentTime + 0.02;
    for (const [freq, dur, type] of notes) {
      if (freq > 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(type === 'square' ? 0.05 : 0.16, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur + 0.02);
      }
      t += dur;
    }
    window.setTimeout(
      () => {
        busy = false;
        btn.classList.remove('is-playing');
      },
      (t - ctx.currentTime) * 1000,
    );
  });
}
