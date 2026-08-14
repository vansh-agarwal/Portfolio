// ===== Footer year =====
document.getElementById('year').textContent = new Date().getFullYear();

// ===== Sidebar toggle (mobile) =====
const side = document.getElementById('side');
const sideToggle = document.getElementById('sideToggle');
const sideNav = document.getElementById('sideNav');

sideToggle.addEventListener('click', () => {
  const open = side.classList.toggle('open');
  sideToggle.classList.toggle('open', open);
  sideToggle.setAttribute('aria-expanded', String(open));
});

sideNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    side.classList.remove('open');
    sideToggle.classList.remove('open');
    sideToggle.setAttribute('aria-expanded', 'false');
  });
});

// ===== Scroll-reveal animations =====
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('in'), i * 35);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

revealEls.forEach(el => revealObserver.observe(el));

// ===== Active sidebar link highlighting =====
const sections = document.querySelectorAll('main.content section[id]');
const sideLinks = document.querySelectorAll('.side-link');

const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const id = entry.target.getAttribute('id');
    const link = document.querySelector(`.side-link[href="#${id}"]`);
    if (!link) return;
    if (entry.isIntersecting) {
      sideLinks.forEach(a => a.classList.remove('active'));
      link.classList.add('active');
    }
  });
}, { threshold: 0.35, rootMargin: '-40px 0px -40% 0px' });

sections.forEach(sec => navObserver.observe(sec));
