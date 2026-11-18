import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { FLAVORS, INSTAGRAM, INSTAGRAM_DM } from './flavors.js';
import { createHeroScene, state } from './hero/scene.js';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isNarrow = () => window.innerWidth / window.innerHeight < 1.2 || window.innerWidth <= 860;

/* ───────────────────────── build hero DOM ───────────────────────── */
const hero = $('#hero');
const copies = $('[data-copies]');
copies.innerHTML = FLAVORS.map((f, i) => `
  <article class="copy" data-i="${i}" aria-hidden="${i ? 'true' : 'false'}">
    <p class="copy__eyebrow"><i style="background:${f.accent}"></i>${f.pack}</p>
    <h1>${f.headline.map((l) => `<span class="line"><span>${l}</span></span>`).join('')}</h1>
    <p>${f.blurb}</p>
    <div class="copy__actions">
      <a class="btn btn--dark" href="#order" data-order-flavor="${f.key}">Order ${f.name}<span class="btn__plus" aria-hidden="true">+</span></a>
      <a class="btn btn--ghost" href="#flavours">All flavours</a>
    </div>
  </article>`).join('');

const picker = $('[data-picker]');
picker.innerHTML = FLAVORS.map((f, i) => `
  <button class="pick" role="tab" aria-selected="${i === 0}" data-goto="${i}">
    <span class="pick__can" style="background-image:url(${f.label})"></span>
    <span><span class="pick__name">${f.name}</span><span class="pick__sub">Sparkling</span></span>
    <span class="pick__bar"><i></i></span>
  </button>`).join('');

/* ───────────────────────── 3D scene ───────────────────────── */
let three = null;
const canvas = $('.stage');
try {
  three = createHeroScene(canvas, { mobile: isNarrow(), reducedMotion, floorEl: $('.footer__pour-text') });
} catch (err) {
  console.warn('WebGL unavailable, using photo fallback', err);
  document.documentElement.classList.add('no-webgl');
}

/* ───────────────────────── intro (on load, not scroll) ───────────────────────── */
gsap.set('.copy[data-i="0"] .line > span', { yPercent: 110 });
const intro = gsap.timeline({ delay: 0.15, defaults: { ease: 'power3.out' } })
  .from('.nav', { autoAlpha: 0, duration: 0.9, clearProps: 'opacity,visibility' }, 0) // fade only: the nav's CSS transform transition owns its position
  .to('.copy[data-i="0"] .line > span', { yPercent: 0, duration: 1.1, stagger: 0.08 }, 0.1)
  .from('.copy[data-i="0"] > p, .copy[data-i="0"] .copy__actions, .copy[data-i="0"] .copy__eyebrow', { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.35)
  .from('.hero__picker .pick', { x: 40, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 0.45)
  .from('.hero__meta', { autoAlpha: 0, duration: 0.8 }, 0.7)
  .from('.hero__word[data-i="0"]', { scale: 0.85, autoAlpha: 0, duration: 1.6 }, 0);
if (three) {
  // fruit bursts out of the can on load
  state.phase.mango = -1;
  intro.to(state.phase, { mango: 0, duration: 1.6, ease: 'power2.out' }, 0.2);
}

/* ───────────────────────── the pinned, scrubbed flavour timeline ───────────────────────── */
// Timeline units: 0–2 Mango · 2–4 → Cranberry · 4–6 Cranberry · 6–8 → Orange · 8–9.2 Orange · 9.2–10 hand-off
const STOPS = [0, 5, 8.7]; // where each flavour "rests" (used by the picker)
const TOTAL = 10;
const words = $$('.hero__word');
const copyEls = $$('.copy');
let tl, st;

function transition(tl, from, to, at) {
  const f = FLAVORS[to];
  const outLines = $$('.line > span', copyEls[from]);
  const inLines = $$('.line > span', copyEls[to]);
  const outRest = $$('.copy__eyebrow, p, .copy__actions', copyEls[from]);
  const inRest = $$('.copy__eyebrow, p, .copy__actions', copyEls[to]);
  tl
    // 1 · old copy leaves, old word fades
    .to(outLines, { yPercent: -105, duration: 0.55, stagger: 0.05, ease: 'power2.in' }, at)
    .to(outRest, { y: -16, autoAlpha: 0, duration: 0.45, stagger: 0.03, ease: 'power2.in' }, at)
    .set(copyEls[from], { visibility: 'hidden' }, at + 0.75)
    .to(words[from], { autoAlpha: 0, xPercent: -8, duration: 0.8, ease: 'power1.in' }, at)
    // 2 · background morphs into the next palette
    .to(hero, { '--g1': f.bg[0], '--g2': f.bg[1], '--g3': f.bg[2], '--accent': f.accent, duration: 1.7, ease: 'power1.inOut' }, at + 0.15)
    // 3 · old fruit is pulled into the can
    .to(state.phase, { [FLAVORS[from].key]: 1, duration: 1.05, ease: 'power1.in' }, at + 0.05)
    // 4 · can pulls back and performs a half-turn → the new genuine label comes round
    .to(state, { dip: 1, duration: 0.8, ease: 'power2.inOut' }, at + 0.2)
    .to(state, { dip: 0, duration: 0.9, ease: 'power2.inOut' }, at + 1.0)
    .to(state, { spin: Math.PI * to, duration: 1.6, ease: 'power3.inOut' }, at + 0.2)
    // 5 · new fruit bursts out from the centre and settles
    .fromTo(state.phase, { [f.key]: -1 }, { [f.key]: 0, duration: 1.1, ease: 'power2.out', immediateRender: false }, at + 0.95)
    // 6 · new word + copy arrive
    .fromTo(words[to], { autoAlpha: 0, xPercent: 8 }, { autoAlpha: 1, xPercent: 0, duration: 0.8, ease: 'power2.out', immediateRender: false }, at + 1.1)
    .set(copyEls[to], { visibility: 'visible' }, at + 1.2)
    .fromTo(inLines, { yPercent: 105 }, { yPercent: 0, duration: 0.65, stagger: 0.06, ease: 'power3.out', immediateRender: false }, at + 1.25)
    .fromTo(inRest, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.55, stagger: 0.05, ease: 'power2.out', immediateRender: false }, at + 1.4);
}

function buildTimeline() {
  // hidden copies start below their masks
  copyEls.slice(1).forEach((c) => {
    gsap.set($$('.line > span', c), { yPercent: 105 });
    gsap.set($$('.copy__eyebrow, p, .copy__actions', c), { autoAlpha: 0 });
  });
  gsap.set(words.slice(1), { autoAlpha: 0 });

  tl = gsap.timeline({ defaults: { ease: 'none' } });
  // gentle scroll-linked turn while resting on each flavour
  tl.to(state, { spin: 0.18, duration: 2, ease: 'sine.inOut' }, 0);
  transition(tl, 0, 1, 2);
  tl.fromTo(state, { spin: Math.PI }, { spin: Math.PI + 0.18, duration: 2, ease: 'sine.inOut', immediateRender: false }, 4);
  transition(tl, 1, 2, 6);
  tl.fromTo(state, { spin: Math.PI * 2 }, { spin: Math.PI * 2 + 0.14, duration: 1.2, ease: 'sine.inOut', immediateRender: false }, 8);
  // hand-off: fruit drifts away, type exits, can lifts — then the pin releases
  tl.to(state, { drift: 1, duration: 0.8, ease: 'power1.in' }, 9.2)
    .to(state, { lift: 1, duration: 0.8, ease: 'power1.inOut' }, 9.2)
    .to($$('.line > span', copyEls[2]), { yPercent: -105, duration: 0.5, stagger: 0.04, ease: 'power2.in' }, 9.25)
    .to($$('.copy__eyebrow, p, .copy__actions', copyEls[2]), { autoAlpha: 0, duration: 0.4 }, 9.25)
    .to(words[2], { autoAlpha: 0, scale: 1.08, duration: 0.7 }, 9.25)
    .to('.hero__picker, .hero__meta', { autoAlpha: 0, duration: 0.5 }, 9.3);
  tl.set({}, {}, TOTAL);

  st = ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: () => '+=' + Math.round(window.innerHeight * (isNarrow() ? 3.6 : 4.4)),
    pin: true,
    pinSpacing: true,
    anticipatePin: 1,
    scrub: reducedMotion ? true : 0.9,
    animation: tl,
    invalidateOnRefresh: true,
  });
  tl.eventCallback('onUpdate', syncUI);
}

/* ───────────────────────── UI sync: picker, counter, aria ───────────────────────── */
const picks = $$('.pick');
const bars = $$('.pick__bar i');
const counter = $('[data-count]');
let active = -1;
function syncUI() {
  const t = tl.time();
  if (t > 1.5 && intro.isActive()) intro.progress(1); // never fight the scroll timeline
  const idx = t < 3 ? 0 : t < 7 ? 1 : 2;
  const ranges = [[0, 3], [3, 7], [7, 9.2]];
  bars.forEach((b, i) => gsap.set(b, { scaleX: gsap.utils.clamp(0, 1, (t - ranges[i][0]) / (ranges[i][1] - ranges[i][0])) }));
  if (idx !== active) {
    active = idx;
    picks.forEach((p, i) => p.setAttribute('aria-selected', String(i === idx)));
    copyEls.forEach((c, i) => c.setAttribute('aria-hidden', String(i !== idx)));
    counter.textContent = String(idx + 1).padStart(2, '0');
  }
}

function scrollToFlavor(i) {
  const y = st.start + (st.end - st.start) * (STOPS[i] / TOTAL) + (i ? 2 : 0);
  gsap.to(window, { scrollTo: y, duration: reducedMotion ? 0 : 1.6, ease: 'power2.inOut' });
}
picks.forEach((p) => p.addEventListener('click', () => scrollToFlavor(+p.dataset.goto)));
picker.addEventListener('keydown', (e) => {
  if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(e.key)) return;
  e.preventDefault();
  const n = (active + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + 3) % 3;
  picks[n].focus();
  scrollToFlavor(n);
});

/* ───────────────────────── sections ───────────────────────── */
// flavour cards
$('[data-flavour-cards]').innerHTML = FLAVORS.map((f, i) => `
  <a class="fcard" href="#hero" data-goto-card="${i}" style="--c1:${f.bg[0]};--c2:${f.bg[1]};--c3:${f.bg[2]}">
    <div class="fcard__top"><span>0${i + 1}</span><span>Sparkling</span></div>
    <span class="fcard__can" style="background-image:url(${f.label})" role="img" aria-label="Tomi ${f.pack} can"></span>
    <div><h3>${f.name}</h3><p>${f.pack}. ${f.blurb.split('.')[0]}.</p></div>
  </a>`).join('');
$$('[data-goto-card]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); scrollToFlavor(+a.dataset.gotoCard); }));

// instagram gallery (genuine posts + reels from @tomi.juice)
const GALLERY = [
  { v: '/video/reel-69701.mp4', tag: 'Reel' },
  { i: '/img/cranberry-girl.webp', alt: 'Smiling woman holding a Tomi Cranberry can in front of a Tomi Cranberry typographic swirl' },
  { i: '/img/orange-splash.webp', alt: 'Tomi Orange can on a blue and yellow splash illustration' },
  { v: '/video/reel-23124.mp4', tag: 'Reel' },
  { i: '/img/trio.webp', alt: 'Tomi Mango, Cranberry and Orange cans on a wooden stand under a spotlight' },
  { v: '/video/reel-46114.mp4', tag: 'Reel' },
  { i: '/img/quad.webp', alt: 'Tomi cans with sliced mango, orange and cranberries on colour-blocked backgrounds' },
  { v: '/video/reel-27525.mp4', tag: 'Reel' },
];
$('[data-gallery]').innerHTML = GALLERY.map((g) => `
  <a class="gallery__item" href="${INSTAGRAM}" target="_blank" rel="noopener" data-reveal-item>
    ${g.v
      ? `<video muted loop playsinline preload="metadata" aria-label="Tomi Juice Instagram reel"><source src="${g.v}#t=0.1" type="video/mp4"></video><span class="tag">▶ ${g.tag}</span>`
      : `<img src="${g.i}" alt="${g.alt}" loading="lazy" />`}
  </a>`).join('');
const vio = new IntersectionObserver((entries) => entries.forEach((e) => {
  const v = e.target;
  if (e.isIntersecting && !reducedMotion) v.play().catch(() => {}); else v.pause();
}), { threshold: 0.35 });
$$('.gallery video').forEach((v) => vio.observe(v));

// order builder → Instagram DM
const qty = Object.fromEntries(FLAVORS.map((f) => [f.key, 0]));
$('[data-order-rows]').innerHTML = FLAVORS.map((f) => `
  <div class="orow">
    <span class="pick__can" style="background-image:url(${f.label})"></span>
    <div><div class="orow__name">${f.name}</div><div class="orow__sub">${f.pack} · Sparkling</div></div>
    <div class="stepper" role="group" aria-label="${f.name} quantity">
      <button type="button" data-step="-1" data-k="${f.key}" aria-label="Remove one ${f.name}" disabled>−</button>
      <output data-q="${f.key}" aria-live="polite">0</output>
      <button type="button" data-step="1" data-k="${f.key}" aria-label="Add one ${f.name}">+</button>
    </div>
  </div>`).join('');
const sendBtn = $('[data-order-send]');
function renderOrder() {
  let total = 0;
  for (const f of FLAVORS) {
    total += qty[f.key];
    $(`[data-q="${f.key}"]`).textContent = qty[f.key];
    $(`[data-step="-1"][data-k="${f.key}"]`).disabled = qty[f.key] === 0;
  }
  $('[data-order-total]').textContent = total;
  sendBtn.disabled = total === 0;
}
$('[data-order-rows]').addEventListener('click', (e) => {
  const b = e.target.closest('[data-step]');
  if (!b) return;
  qty[b.dataset.k] = Math.max(0, Math.min(999, qty[b.dataset.k] + +b.dataset.step));
  renderOrder();
});
$('[data-order]').addEventListener('submit', async (e) => {
  e.preventDefault();
  const lines = FLAVORS.filter((f) => qty[f.key]).map((f) => `• ${f.name} (${f.pack}) × ${qty[f.key]}`);
  const msg = `Hi Tomi! I'd like to order:\n${lines.join('\n')}\nPlease share pricing and delivery details. Thanks!`;
  const note = $('[data-order-note]');
  try { await navigator.clipboard.writeText(msg); note.textContent = 'Order copied — paste it into the Instagram chat that just opened.'; }
  catch { note.textContent = msg; }
  window.open(INSTAGRAM_DM, '_blank', 'noopener');
});
// "Order Mango" buttons in the hero pre-fill one can
$$('[data-order-flavor]').forEach((a) => a.addEventListener('click', () => { qty[a.dataset.orderFlavor] ||= 1; renderOrder(); }));

$('[data-year]').textContent = new Date().getFullYear();

/* ───────────────────────── section motion ───────────────────────── */
function sectionMotion() {
  // statement: word-by-word reveal tied to scroll
  const statement = $('[data-split]');
  const wrap = (txt) => txt.replace(/\S+/g, (w) => `<span class="w">${w}</span>`);
  const html = statement.innerHTML.trim().replace(/\s+/g, ' ').split(/(<em>.*?<\/em>)/).map((part) =>
    part.startsWith('<em>') ? `<em>${wrap(part.slice(4, -5))}</em>` : wrap(part)).join('');
  statement.innerHTML = html;
  if (reducedMotion) return;
  gsap.from($$('.w', statement), {
    opacity: 0.12, stagger: 0.06, ease: 'none',
    scrollTrigger: { trigger: statement, start: 'top 80%', end: 'bottom 45%', scrub: true },
  });
  $$('[data-reveal]').forEach((el) => gsap.from(el, {
    y: 60, autoAlpha: 0, duration: 1.1, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 85%', once: true },
  }));
  ScrollTrigger.batch('[data-reveal-item]', {
    start: 'top 90%', once: true,
    onEnter: (els) => gsap.from(els, { y: 50, autoAlpha: 0, scale: 0.96, stagger: 0.08, duration: 0.9, ease: 'power3.out' }),
  });
  gsap.from('.fcard', {
    y: 90, rotate: (i) => (i - 1) * 3, autoAlpha: 0, stagger: 0.12, duration: 1.2, ease: 'power3.out',
    scrollTrigger: { trigger: '.flavours__grid', start: 'top 82%', once: true },
  });
  gsap.to('[data-parallax] img', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.experience', scrub: true } });
  gsap.fromTo('[data-parallax-alt]', { y: 80 }, { y: -80, ease: 'none', scrollTrigger: { trigger: '.experience', scrub: true } });

  // flavour cards: pointer tilt
  if (window.matchMedia('(pointer: fine)').matches) {
    $$('.fcard').forEach((card) => {
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
      gsap.set(card, { transformPerspective: 900 });
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 10);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 10);
      });
      card.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }
}

/* ───────────────────────── nav ───────────────────────── */
function navMotion() {
  const nav = $('[data-nav]');
  const links = $$('.nav__links a');
  let lastY = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      const pastHero = st && y > st.end - 10;
      nav.classList.toggle('is-solid', pastHero);
      nav.classList.toggle('is-hidden', pastHero && y > lastY && y - lastY > 2);
      lastY = y;
    },
  });
  const sections = ['#top', '#flavours', '#story', '#gallery', '#order'];
  sections.forEach((id, i) => {
    if (id === '#top') return;
    ScrollTrigger.create({
      trigger: id, start: 'top 50%', end: 'bottom 50%',
      onToggle: (self) => {
        const idx = self.isActive ? i : (self.direction < 0 && i === 1 ? 0 : -1);
        if (idx >= 0) links.forEach((l, j) => l.classList.toggle('is-active', j === idx));
      },
    });
  });
  // smooth anchor scrolling that respects the pin
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2 || a.dataset.gotoCard !== undefined) return;
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    gsap.to(window, { scrollTo: { y: target, offsetY: id === '#top' ? 0 : 0 }, duration: reducedMotion ? 0 : 1.2, ease: 'power2.inOut' });
  }));
}

/* ───────────────────────── the can follows you down the page ───────────────────────── */
function canJourney() {
  const maxScroll = () => ScrollTrigger.maxScroll(window);
  // 1 · as the hero releases, the can glides from centre stage into the side rail
  gsap.to(state, { trail: 1, ease: 'none', scrollTrigger: { trigger: '#intro', start: 'top bottom', end: 'top 15%', scrub: true } });
  // 2 · it keeps turning with the scroll — every half-turn shows the next flavour.
  //     Ends on a whole number of half-turns so a label faces the camera for the pour.
  gsap.to(state, {
    pageSpin: Math.PI * 7 - 0.14, ease: 'none',
    scrollTrigger: { trigger: '#intro', start: 'top bottom', end: maxScroll, scrub: reducedMotion ? true : 1.2 },
  });
  // 3 · at the footer it moves to centre, tips over and pours into the footer
  gsap.to(state, {
    pour: 1, ease: 'none',
    scrollTrigger: { trigger: '.footer__pour', start: 'top 80%', end: maxScroll, scrub: reducedMotion ? true : 1 },
  });
}

/* ───────────────────────── boot ───────────────────────── */
buildTimeline();
if (three) canJourney();
sectionMotion();
navMotion();
syncUI();

let lastNarrow = isNarrow();
window.addEventListener('resize', () => {
  const n = isNarrow();
  if (n !== lastNarrow && three) { three.rebuildFor(n); lastNarrow = n; }
});
if (three) three.ready.then(() => ScrollTrigger.refresh());
if (import.meta.env.DEV) {
  window.__tomi = { three, tl, st, state, intro, gsap };
  ScrollTrigger.addEventListener("refresh", () => { document.documentElement.dataset.pin = `${st.start},${st.end}`; });
  document.documentElement.dataset.pin = `${st.start},${st.end}`;
}
window.addEventListener('load', () => ScrollTrigger.refresh());
