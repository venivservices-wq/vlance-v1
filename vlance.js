/* ─── Vlance — main JS ─── */

// ─── Page loader ──────────────────────────────────────────────────────────────
(function () {
  function runLoader() {
    const loader = document.getElementById('vlance-loader');
    if (!loader) return;

    // Hard fallback if GSAP somehow unavailable
    if (typeof gsap === 'undefined') { loader.remove(); return; }

    const icon    = loader.querySelector('.vl-loader__icon');
    const letters = loader.querySelectorAll('.vl-loader__word span');

    const tl = gsap.timeline({ onComplete: function () { loader.remove(); } });

    // 1. Letters sweep up out of the clip container
    tl.to(letters, {
      y: 0,
      duration: 0.7,
      ease: 'power4.out',
      stagger: 0.055
    });

    // 2. Logo icon falls in from above, overlapping letter entrance
    tl.to(icon, {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 0.65,
      ease: 'power3.out'
    }, '<0.05');

    // 4. Hold at full composition
    tl.to({}, { duration: 0.45 });

    // 5. Exit: clip-path collapses the loader upward, site revealed top-to-bottom
    tl.to(loader, {
      clipPath: 'inset(0% 0% 100% 0%)',
      duration: 0.7,
      ease: 'expo.inOut',
      onStart: function () { loader.style.pointerEvents = 'none'; }
    });
  }

  if (document.readyState === 'complete') {
    runLoader();
  } else {
    window.addEventListener('load', runLoader, { once: true });
  }
})();

// ─── Nav toggle ───────────────────────────────────────────────────────────────
const navEl   = document.getElementById('nav');
const toggles = document.querySelectorAll('[data-nav-toggle]');

toggles.forEach(el => {
  el.addEventListener('click', () => {
    const action = el.getAttribute('data-nav-toggle');
    if (action === 'toggle') {
      const isOpen = navEl.getAttribute('data-nav-status') === 'active';
      navEl.setAttribute('data-nav-status', isOpen ? 'not-active' : 'active');
    } else if (action === 'close') {
      navEl.setAttribute('data-nav-status', 'not-active');
    }
  });
});

// Close nav on anchor link click
document.querySelectorAll('[data-nav-close]').forEach(el => {
  el.addEventListener('click', () => {
    navEl.setAttribute('data-nav-status', 'not-active');
  });
});

// ─── Smooth scroll (anchor links) ─────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const id = link.getAttribute('href');
    if (id === '#' || id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});


// ─── GSAP Slider (horizontalLoop helper) ──────────────────────────────────────
function horizontalLoop(items, config) {
  let timeline;
  items = gsap.utils.toArray(items);
  config = config || {};
  gsap.context(() => {
    const onChange   = config.onChange;
    let   lastIndex  = 0;
    const tl = gsap.timeline({
      repeat:    config.repeat,
      paused:    config.paused,
      defaults:  { ease: 'none' },
      onUpdate:  onChange && function () {
        const i = tl.closestIndex();
        if (lastIndex !== i) { lastIndex = i; onChange(items[i], i); }
      },
      onReverseComplete: () => tl.totalTime(tl.rawTime() + 100 * tl.duration()),
    });

    const length  = items.length;
    const startX  = items[0].offsetLeft;
    const widths  = [];
    const xPcts   = [];
    const offsets = [];
    const gaps    = [];
    let   totalW  = 0;
    const snap    = config.snap === false ? v => v : gsap.utils.snap(config.snap || 1);
    const center  = config.center;
    const pad     = parseFloat(config.paddingRight) || 0;
    const parentEl = center === true
      ? items[0].parentNode
      : gsap.utils.toArray(center)[0] || items[0].parentNode;

    const measure = () => {
      let prev;
      items.forEach((el, i) => {
        widths[i]  = parseFloat(gsap.getProperty(el, 'width', 'px'));
        xPcts[i]   = snap(parseFloat(gsap.getProperty(el, 'x', 'px')) / widths[i] * 100 + gsap.getProperty(el, 'xPercent'));
        const rect = el.getBoundingClientRect();
        gaps[i]    = rect.left - (i ? prev.right : parentEl.getBoundingClientRect().left);
        prev       = rect;
      });
      gsap.set(items, { xPercent: i => xPcts[i] });
      totalW = items[length - 1].offsetLeft + xPcts[length - 1] / 100 * widths[length - 1]
             - startX + gaps[0] + items[length - 1].offsetWidth * gsap.getProperty(items[length - 1], 'scaleX') + pad;
    };

    const centreOffset = () => center
      ? tl.duration() * (parentEl.offsetWidth / 2) / totalW
      : 0;

    const findNearest = (arr, val, dur) => {
      let dist = 1e10, idx = 0;
      arr.forEach((v, i) => {
        let d = Math.abs(v - val);
        if (d > dur / 2) d = dur - d;
        if (d < dist) { dist = d; idx = i; }
      });
      return idx;
    };

    const build = () => {
      tl.clear();
      const times = [];
      let offset0;
      items.forEach((el, i) => {
        const xPct = xPcts[i];
        const rawX = xPct / 100 * widths[i];
        const left = el.offsetLeft + rawX - startX + gaps[0];
        const right = left + widths[i] * gsap.getProperty(el, 'scaleX');
        tl.to(el, { xPercent: snap((rawX - right) / widths[i] * 100), duration: right / (config.speed || 100) }, 0)
          .fromTo(el, { xPercent: snap((rawX - right + totalW) / widths[i] * 100) },
            { xPercent: xPct, duration: (rawX - right + totalW - rawX) / (config.speed || 100), immediateRender: false }, right / (config.speed || 100))
          .add('label' + i, left / (config.speed || 100));
        times[i] = left / (config.speed || 100);
        if (!i) offset0 = left / (config.speed || 100);
      });
      tl.times = times;
    };

    const refresh = full => {
      const prog = tl.progress();
      tl.progress(0, true);
      measure();
      if (full) build();
      const co = centreOffset();
      tl.progress(prog, true);
    };

    measure();
    build();

    const wrap   = gsap.utils.wrap(0, 1);
    const toIdx  = (idx, vars) => {
      vars      = vars || {};
      const cur = tl.current();
      if (Math.abs(idx - cur) > length / 2) idx += idx > cur ? -length : length;
      const t = (tl.times || [])[((idx % length) + length) % length];
      if (t === undefined) return;
      let target = t;
      if (target > tl.time() !== idx > cur && idx !== cur) target += tl.duration() * (idx > cur ? 1 : -1);
      if (target < 0 || target > tl.duration()) vars.modifiers = { time: wrap };
      lastIndex  = ((idx % length) + length) % length;
      vars.overwrite = true;
      gsap.killTweensOf(draggable);
      return vars.duration === 0 ? tl.time(wrap(target)) : tl.tweenTo(target, vars);
    };

    tl.toIndex    = toIdx;
    tl.closestIndex = force => {
      const i = findNearest(tl.times || [], tl.time(), tl.duration());
      if (force) { lastIndex = i; }
      return i;
    };
    tl.current    = () => lastIndex;
    tl.next       = vars => toIdx(tl.current() + 1, vars);
    tl.previous   = vars => toIdx(tl.current() - 1, vars);
    tl.progress(1, true).progress(0, true);
    if (config.reversed) { tl.vars.onReverseComplete(); tl.reverse(); }

    let draggable;
    if (config.draggable && typeof Draggable !== 'undefined') {
      const proxy = document.createElement('div');
      let   startProg, startX2, ratio, snap2, throwing;
      const updateProg = () => tl.progress(wrap(startProg + (startX2 - proxy.x) * ratio));
      const settle     = () => tl.closestIndex(true);
      draggable = Draggable.create(proxy, {
        trigger:          items[0].parentNode,
        type:             'x',
        overshootTolerance: 0,
        inertia:          true,
        snap(x) {
          if (Math.abs(startProg / -ratio - proxy.x) < 10) return snap2 + proxy.x2;
          const r = -(x * ratio * tl.duration());
          const w = wrap(r);
          const nearest = tl.times ? tl.times[findNearest(tl.times, w, tl.duration())] : 0;
          const diff = nearest - w;
          snap2 = (r + (Math.abs(diff) > tl.duration() / 2 ? diff < 0 ? tl.duration() : -tl.duration() : diff)) / tl.duration() / -ratio;
          return snap2;
        },
        onPressInit() {
          const x2 = this.x;
          gsap.killTweensOf(tl);
          throwing = false;
          startProg = tl.progress();
          refresh();
          ratio    = 1 / totalW;
          startX2  = startProg / -ratio - x2;
          gsap.set(proxy, { x: startProg / -ratio });
        },
        onDrag: updateProg,
        onThrowUpdate: updateProg,
        onRelease() { settle(); throwing = this.isThrowing; },
        onThrowComplete: settle,
      })[0];
      tl.draggable = draggable;
    }
    timeline = tl;
    window.addEventListener('resize', () => refresh(true));
    refresh(true);
  });
  return timeline;
}

// ─── GSAP Osmo Slider ─────────────────────────────────────────────────────────
function initOsmoSlider() {
  const DURATION = 1.5;
  const EASE     = 'expo.out';

  document.querySelectorAll('[data-gsap-slider-init]').forEach(wrap => {
    const collection = wrap.querySelector('[data-gsap-slider-collection]');
    const listEl     = wrap.querySelector('[data-gsap-slider-list]');
    const slides     = Array.from(wrap.querySelectorAll('[data-gsap-slider-item]'));
    const controls   = Array.from(wrap.querySelectorAll('[data-gsap-slider-control]'));
    if (!slides.length) return;

    const rotate = parseFloat(wrap.getAttribute('data-gsap-slider-rotate')) || 0;
    const style  = getComputedStyle(wrap);
    const status = style.getPropertyValue('--slider-status').trim();
    let   spv    = parseFloat(style.getPropertyValue('--slider-spv'));

    const rect = slides[0].getBoundingClientRect();
    const gap  = parseFloat(getComputedStyle(slides[0]).marginRight) || 0;
    const W    = rect.width;
    const H    = rect.height;
    const step = rotate > 0 ? W : W + gap;

    if (isNaN(spv)) spv = collection.clientWidth / (W + gap);
    const visible = Math.max(1, Math.min(spv, slides.length));
    const shown   = Math.ceil(visible);

    if (!(status === 'on' && visible < slides.length)) {
      wrap.removeAttribute('data-gsap-drag-status');
      return;
    }
    wrap.setAttribute('data-gsap-drag-status', 'grab');

    const mod       = (v, n) => ((v % n) + n) % n;
    const centered  = wrap.getAttribute('data-gsap-slider-center') === 'true';

    // Update active/inview status and control highlights
    const setActive = (idx, total) => {
      const half = Math.floor((shown - 1) / 2);
      const rest = shown - 1 - half;
      slides.forEach(s => s.setAttribute('data-gsap-slider-item-status', 'not-active'));
      slides[mod(idx, total)].setAttribute('data-gsap-slider-item-status', 'active');
      for (let i = 1; i <= rest; i++)
        slides[mod(idx + i, total)].setAttribute('data-gsap-slider-item-status', 'inview');
      for (let i = 1; i <= half; i++)
        slides[mod(idx - i, total)].setAttribute('data-gsap-slider-item-status', 'inview');

      controls.forEach(btn => {
        const v = btn.getAttribute('data-gsap-slider-control');
        if (/^\d+$/.test(v)) {
          const n = Math.max(0, Math.min(total - 1, parseInt(v, 10) - 1));
          btn.setAttribute('data-gsap-slider-control-status', n === mod(idx, total) ? 'active' : 'not-active');
        }
      });
    };

    // ── Rotating fan layout (data-gsap-slider-rotate > 0) ──
    if (rotate > 0) {
      const total = slides.length;
      gsap.set(slides, { clearProps: 'position,top,left,marginRight,transform' });
      slides.forEach(s => s.removeAttribute('data-gsap-slider-item-status'));
      listEl.style.position = 'relative';
      listEl.style.height   = H + 'px';
      slides.forEach(s => gsap.set(s, { xPercent: -50 }));

      const setters = slides.map(s => gsap.quickSetter(s, 'rotate', 'deg'));
      const proxy   = document.createElement('div');
      gsap.set(proxy, { x: 0 });

      const getIdx   = () => -gsap.getProperty(proxy, 'x') / step;
      const wrapDiff = (v, cur, n) => v - (cur - Math.round((cur - v) / n) * n);

      const render = () => {
        const idx = getIdx();
        setters.forEach((set, i) => set(wrapDiff(i, idx, total) * rotate));

        const active = mod(Math.round(idx), total);
        const h2     = Math.floor((shown - 1) / 2);
        const r2     = shown - 1 - h2;
        slides.forEach(s => s.setAttribute('data-gsap-slider-item-status', 'not-active'));
        slides[active].setAttribute('data-gsap-slider-item-status', 'active');
        for (let i = 1; i <= r2; i++)
          slides[mod(active + i, total)].setAttribute('data-gsap-slider-item-status', 'inview');
        for (let i = 1; i <= h2; i++)
          slides[mod(active - i, total)].setAttribute('data-gsap-slider-item-status', 'inview');

        controls.forEach(btn => {
          const v = btn.getAttribute('data-gsap-slider-control');
          if (/^\d+$/.test(v)) {
            const n = Math.max(0, Math.min(total - 1, parseInt(v, 10) - 1));
            btn.setAttribute('data-gsap-slider-control-status', n === active ? 'active' : 'not-active');
          }
        });
      };

      controls.forEach(btn => {
        btn.disabled = false;
        const v = btn.getAttribute('data-gsap-slider-control');
        if (/^\d+$/.test(v)) {
          const target = Math.max(0, Math.min(total - 1, parseInt(v, 10) - 1));
          btn.onclick = () => {
            gsap.killTweensOf(proxy);
            const cur = getIdx();
            const dest = -(cur + wrapDiff(target, cur, total)) * step;
            gsap.to(proxy, { x: dest, duration: DURATION, ease: EASE, onUpdate: render });
          };
        }
      });

      wrap._sliderDraggable = Draggable.create(proxy, {
        type:            'x',
        trigger:         collection,
        inertia:         true,
        maxDuration:     1,
        minDuration:     0.5,
        dragResistance:  0.025,
        throwResistance: 2000,
        bounds:          null,
        edgeResistance:  0,
        snap:            x => Math.round(x / step) * step,
        onDrag:          render,
        onThrowUpdate:   render,
        onThrowComplete: render,
        onPress:         () => wrap.setAttribute('data-gsap-drag-status', 'grabbing'),
        onDragStart:     () => wrap.setAttribute('data-gsap-drag-status', 'grabbing'),
        onRelease:       () => wrap.setAttribute('data-gsap-drag-status', 'grab'),
        onThrowComplete: () => wrap.setAttribute('data-gsap-drag-status', 'grab'),
      })[0];

      render();
      return;
    }

    // ── Horizontal loop layout ──
    const loop = horizontalLoop(slides, {
      draggable:    true,
      snap:         1,
      paused:       true,
      center:       centered ? collection : false,
      paddingRight: gap,
      onChange(el, idx) { setActive(idx, slides.length); },
    });
    if (loop && loop.draggable) {
      Object.assign(loop.draggable.vars, {
        maxDuration:     1,
        minDuration:     0.5,
        dragResistance:  0.025,
        throwResistance: 2000,
      });
    }
    loop && loop.toIndex(0, { duration: 0 });
    setActive(0, slides.length);

    controls.forEach(btn => {
      btn.disabled = false;
      const v = btn.getAttribute('data-gsap-slider-control');
      if (/^\d+$/.test(v)) {
        const idx = Math.max(0, Math.min(slides.length - 1, parseInt(v, 10) - 1));
        btn.onclick = () => loop && loop.toIndex(idx, { duration: DURATION, ease: EASE });
      }
    });
  });
}

// ─── CSS marquee (under-nav bar) ──────────────────────────────────────────────
function initCSSMarquee() {
  document.querySelectorAll('[data-css-marquee]').forEach(wrap => {
    const dur = wrap.getAttribute('style')?.match(/animation-duration:\s*([\d.]+s)/)?.[1] || '30s';
    wrap.querySelectorAll('[data-css-marquee-list]').forEach(list => {
      list.style.animationDuration = dur;
    });
  });
}

// ─── Mute toggle ──────────────────────────────────────────────────────────────
function initMuteButtons() {
  document.querySelectorAll('.vlance-mute-btn').forEach(btn => {
    const card  = btn.closest('.vlance-video-card');
    const video = card && card.querySelector('.vlance-video-bg');
    if (!video) return;

    const iconMuted   = btn.querySelector('.vlance-icon-muted');
    const iconUnmuted = btn.querySelector('.vlance-icon-unmuted');

    btn.addEventListener('click', e => {
      e.stopPropagation();
      video.muted = !video.muted;
      iconMuted.style.display   = video.muted ? '' : 'none';
      iconUnmuted.style.display = video.muted ? 'none' : '';
    });
  });
}

// ─── Auto-mute inactive slider cards ──────────────────────────────────────────
function initAutoMute() {
  const list = document.querySelector('[data-gsap-slider-list]');
  if (!list) return;

  function muteInactive() {
    list.querySelectorAll('[data-gsap-slider-item]').forEach(item => {
      if (item.getAttribute('data-gsap-slider-item-status') !== 'active') {
        const video = item.querySelector('.vlance-video-bg');
        if (video && !video.muted) {
          video.muted = true;
          const btn         = item.querySelector('.vlance-mute-btn');
          const iconMuted   = btn && btn.querySelector('.vlance-icon-muted');
          const iconUnmuted = btn && btn.querySelector('.vlance-icon-unmuted');
          if (iconMuted)   iconMuted.style.display   = '';
          if (iconUnmuted) iconUnmuted.style.display = 'none';
        }
      }
    });
  }

  new MutationObserver(muteInactive).observe(list, {
    subtree: true,
    attributeFilter: ['data-gsap-slider-item-status']
  });
}

// ─── Services section scroll animations ───────────────────────────────────────
function initServiceAnimations() {
  const section    = document.getElementById('services');
  if (!section || typeof ScrollTrigger === 'undefined') return;

  const title      = section.querySelector('.product-slider__title .h-l');
  const desc       = section.querySelector('.product-slider__text');
  const navBtns    = section.querySelectorAll('.product-slider__nav .button');
  const paths      = section.querySelectorAll('.vl-slider-track path');
  const dots       = section.querySelectorAll('.vl-slider-track circle');
  const ticks      = section.querySelectorAll('.vl-slider-track line');
  const collection = section.querySelector('[data-gsap-slider-collection]');
  const cards      = section.querySelectorAll('.vlance-video-card');

  // Prime arc paths for stroke draw-on
  paths.forEach(p => {
    const len = p.getTotalLength ? p.getTotalLength() : 1200;
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
  });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top 90%',   // fires as section just enters the bottom of viewport
      end: 'bottom top',  // reverse only once section is fully above viewport
      toggleActions: 'play none play reverse'
    }
  });

  // ── Text ──────────────────────────────────────────────────────────────────
  tl.from(title, {
    filter: 'blur(22px)',
    opacity: 0,
    y: 32,
    duration: 1.0,
    ease: 'power3.out'
  });

  tl.from(desc, {
    opacity: 0,
    y: 14,
    duration: 0.65,
    ease: 'power3.out'
  }, '-=0.65');

  // ── SVG track ─────────────────────────────────────────────────────────────
  tl.to(paths, {
    strokeDashoffset: 0,
    duration: 1.4,
    ease: 'power2.inOut',
    stagger: 0.2
  }, '-=0.5');

  tl.from(ticks, {
    opacity: 0,
    duration: 0.25,
    ease: 'power2.out',
    stagger: 0.04
  }, '-=1.1');

  tl.from(dots, {
    attr: { r: 0 },
    opacity: 0,
    duration: 0.35,
    ease: 'back.out(2.5)',
    stagger: 0.07
  }, '-=0.55');

  // Nav buttons are excluded from GSAP — always visible (CSS handles them)

  // ── Videos — absolute position so they start early, parallel to text ─────
  if (collection) {
    tl.from(collection, {
      opacity: 0,
      y: 60,
      duration: 0.95,
      ease: 'power3.out'
    }, 0.25);   // absolute: starts at t=0.25s regardless of text timing
  }

  if (cards.length) {
    tl.from(cards, {
      opacity: 0,
      scale: 0.88,
      filter: 'blur(10px)',
      duration: 0.72,
      ease: 'power3.out'
    }, 0.45);   // absolute: starts at t=0.45s — cards visible almost immediately
  }
}

// ─── Stats section scroll animations ──────────────────────────────────────────
function initStatsAnimations() {
  const section = document.getElementById('stats');
  if (!section || typeof ScrollTrigger === 'undefined') return;

  const eyebrow = section.querySelector('.vl-stats__eyebrow');
  const cards   = Array.from(section.querySelectorAll('.vl-stat-card'));
  const counts  = Array.from(section.querySelectorAll('.vl-stat-count'));

  // ── Count-up / count-down ─────────────────────────────────────────────────
  function countEl(el, dir) {
    const to     = parseFloat(el.dataset.to);
    const suffix = el.dataset.suffix || '';
    const comma  = el.dataset.comma === 'true';
    const proxy  = { val: dir === 'up' ? 0 : to };
    gsap.killTweensOf(proxy);
    gsap.to(proxy, {
      val: dir === 'up' ? to : 0,
      duration: dir === 'up' ? (to > 100 ? 1.1 : 0.55) : 0.28,
      ease: dir === 'up' ? 'power2.out' : 'power2.in',
      overwrite: true,
      onUpdate() {
        const n = Math.round(proxy.val);
        el.textContent = (comma ? n.toLocaleString('en-US') : n) + suffix;
      },
      onComplete() {
        el.textContent = dir === 'up'
          ? (comma ? to.toLocaleString('en-US') : to) + suffix
          : '0' + suffix;
      }
    });
  }

  // ── Visual reveal: cards slide in from alternating sides ─────────────────
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: 'top 80%',
      end: 'bottom top',
      toggleActions: 'play none play reverse'
    }
  });

  if (eyebrow) {
    tl.from(eyebrow, { opacity: 0, y: 12, duration: 0.5, ease: 'power3.out' });
  }

  cards.forEach((card, i) => {
    tl.from(card, {
      opacity: 0,
      x: i % 2 === 1 ? 70 : -70,
      duration: 0.8,
      ease: 'power3.out'
    }, (eyebrow ? 0.35 : 0) + i * 0.45);
  });

  // ── Count-up: single section trigger so all counts finish before contact ──
  ScrollTrigger.create({
    trigger: section,
    start: 'top 65%',
    onEnter:     () => counts.forEach(c => countEl(c, 'up')),
    onEnterBack: () => counts.forEach(c => countEl(c, 'up')),
    onLeaveBack: () => counts.forEach(c => countEl(c, 'down'))
  });
}


// ─── Contact + Footer scroll animations ───────────────────────────────────────
function initContactFooterAnimations() {
  if (typeof ScrollTrigger === 'undefined') return;

  // Contact buttons are revealed at the end of the pin timeline in initContactReveal

  // ── Footer ────────────────────────────────────────────────────────────────
  const footer = document.querySelector('.vlance-footer');
  if (footer) {
    const wordmark = footer.querySelector('.vlance-footer-wordmark');
    const logo     = footer.querySelector('.vlance-footer-logo');
    const copy     = footer.querySelector('.vlance-footer-inner .eyebrow');
    const navLinks = footer.querySelectorAll('.vlance-footer-nav a');

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: footer,
        start: 'top 90%',
        end: 'bottom top',
        toggleActions: 'play none play reverse'
      }
    });

    const footerItems = [logo, copy, ...navLinks].filter(Boolean);
    if (footerItems.length) {
      tl.from(footerItems, {
        opacity: 0,
        y: 14,
        duration: 0.55,
        ease: 'power3.out',
        stagger: 0.09
      });
    }
  }
}


// ─── Hero description word-by-word reveal ─────────────────────────────────────
function initHeroDesc() {
  const desc = document.querySelector('.home-hero__description-p');
  if (!desc) return;

  // Split text nodes into individual word <span>s, preserve highlight spans
  const nodes = Array.from(desc.childNodes);
  desc.innerHTML = '';
  let hasContent = false;

  nodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const words = node.textContent.split(/\s+/).filter(Boolean);
      words.forEach(word => {
        if (hasContent) desc.appendChild(document.createTextNode(' '));
        const s = document.createElement('span');
        s.className = 'vl-word';
        s.textContent = word;
        desc.appendChild(s);
        hasContent = true;
      });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (hasContent) desc.appendChild(document.createTextNode(' '));
      desc.appendChild(node);
      hasContent = true;
    }
  });

  // Every animatable unit: individual words + highlight spans
  const units = Array.from(desc.querySelectorAll('.vl-word, .home-hero__description-highlight'));
  gsap.set(units, { opacity: 0.15 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: '55% top',
      scrub: 1.6
    }
  });

  units.forEach((unit, i) => {
    tl.to(unit, { opacity: 1, ease: 'power1.out', duration: 0.6 }, i * 0.28);
  });
}


// ─── Cloud parallax ───────────────────────────────────────────────────────────
function initClouds() {
  const c1 = document.querySelector('.vl-cloud-1');
  const c2 = document.querySelector('.vl-cloud-2');
  if (!c1 || !c2) return;

  // Cloud 1 moves faster (feels closer); cloud 2 slower (feels further away)
  gsap.to(c1, {
    y: -180,
    ease: 'none',
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 1
    }
  });

  gsap.to(c2, {
    y: -90,
    ease: 'none',
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 1.8
    }
  });
}


// ─── Monkey peek ──────────────────────────────────────────────────────────────
function initMonkey() {
  const wrap   = document.querySelector('.vl-monkey-wrap');
  const svg    = document.querySelector('.vl-monkey-svg');
  if (!wrap || !svg) return;

  const lIn  = svg.querySelector('#mk-leye-in');
  const rIn  = svg.querySelector('#mk-reye-in');
  const lOut = svg.querySelector('#mk-leye-out');
  const rOut = svg.querySelector('#mk-reye-out');
  if (!lIn || !rIn) return;

  const LC = { x: 701.188, y: 507.938 };
  const RC = { x: 980.19,  y: 506.938 };
  const MAX_TRAVEL = 26;

  // ── Orient: 160° = upside-down + 20° angle, pivot at head top ──────────
  // Body swings above the screen edge; face hangs down into the hero corner.
  gsap.set(wrap, { rotation: 160, transformOrigin: '50% 20%' });

  // ── Float (y travels in parent space, combines with rotation above) ──────
  gsap.to(wrap, {
    y: -14,
    duration: 3.6,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1
  });

  // ── Sway: oscillate ±3° around 160° ──────────────────────────────────────
  gsap.to(wrap, {
    rotation: 157,
    duration: 5.1,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1
  });

  // ── Eye tracking via getScreenCTM — correct even when element is rotated ─
  function movePupils(clientX, clientY) {
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt  = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const sp = pt.matrixTransform(ctm.inverse());

    [{ el: lIn, c: LC }, { el: rIn, c: RC }].forEach(({ el, c }) => {
      const dx   = sp.x - c.x;
      const dy   = sp.y - c.y;
      const dist = Math.hypot(dx, dy) || 1;
      const t    = Math.min(dist, MAX_TRAVEL) / dist;
      gsap.to(el, {
        attr: { cx: c.x + dx * t, cy: c.y + dy * t },
        duration: 0.2,
        ease: 'power2.out',
        overwrite: true
      });
    });
  }

  document.addEventListener('mousemove', e => movePupils(e.clientX, e.clientY));

  document.addEventListener('mouseleave', () => {
    [{ el: lIn, c: LC }, { el: rIn, c: RC }].forEach(({ el, c }) => {
      gsap.to(el, { attr: { cx: c.x, cy: c.y }, duration: 0.5, ease: 'power2.out' });
    });
  });

  // ── Random blink ─────────────────────────────────────────────────────────
  const blinkEls = [lOut, lIn, rOut, rIn].filter(Boolean);

  function scheduleBlink() {
    const delay = 1600 + Math.random() * 4200;
    setTimeout(() => {
      gsap.to(blinkEls, {
        scaleY: 0.06,
        duration: 0.07,
        ease: 'power3.in',
        transformOrigin: '50% 50%',
        onComplete() {
          gsap.to(blinkEls, {
            scaleY: 1,
            duration: 0.13,
            ease: 'power2.out',
            transformOrigin: '50% 50%',
            onComplete: scheduleBlink
          });
        }
      });
    }, delay);
  }
  scheduleBlink();
}


// ─── Blue guy ─────────────────────────────────────────────────────────────────
function initBlueGuy() {
  const wrap = document.querySelector('.vl-blueguy-wrap');
  const svg  = document.querySelector('.vl-blueguy-svg');
  if (!wrap || !svg) return;

  const lIn  = svg.querySelector('#bg-leye-in');
  const rIn  = svg.querySelector('#bg-reye-in');
  const lOut = svg.querySelector('#bg-leye-out');
  const rOut = svg.querySelector('#bg-reye-out');
  if (!lIn || !rIn) return;

  // Pupil centers in SVG coords
  const LC = { x: 579,      y: 588 };
  const RC = { x: 1026.998, y: 588 };
  // Max travel: outer r 180 − inner r 97 = 83 SVG units
  const MAX_TRAVEL = 70;

  // ── Right-side up, gentle sway from base ────────────────────────────────
  gsap.set(wrap, { rotation: 0, transformOrigin: 'bottom center' });

  // Float
  gsap.to(wrap, {
    y: -14,
    duration: 3.8,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1
  });

  // Sway
  gsap.to(wrap, {
    rotation: 2.5,
    duration: 4.6,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1
  });

  // ── Eye tracking ─────────────────────────────────────────────────────────
  function movePupils(clientX, clientY) {
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const sp = pt.matrixTransform(ctm.inverse());

    [{ el: lIn, c: LC }, { el: rIn, c: RC }].forEach(({ el, c }) => {
      const dx   = sp.x - c.x;
      const dy   = sp.y - c.y;
      const dist = Math.hypot(dx, dy) || 1;
      const t    = Math.min(dist, MAX_TRAVEL) / dist;
      gsap.to(el, {
        attr: { cx: c.x + dx * t, cy: c.y + dy * t },
        duration: 0.2,
        ease: 'power2.out',
        overwrite: true
      });
    });
  }

  document.addEventListener('mousemove', e => movePupils(e.clientX, e.clientY));

  document.addEventListener('mouseleave', () => {
    [{ el: lIn, c: LC }, { el: rIn, c: RC }].forEach(({ el, c }) => {
      gsap.to(el, { attr: { cx: c.x, cy: c.y }, duration: 0.5, ease: 'power2.out' });
    });
  });

  // ── Random blink ─────────────────────────────────────────────────────────
  const blinkEls = [lOut, lIn, rOut, rIn].filter(Boolean);

  function scheduleBlink() {
    const delay = 2000 + Math.random() * 4500;
    setTimeout(() => {
      gsap.to(blinkEls, {
        scaleY: 0.06,
        duration: 0.07,
        ease: 'power3.in',
        transformOrigin: '50% 50%',
        onComplete() {
          gsap.to(blinkEls, {
            scaleY: 1,
            duration: 0.13,
            ease: 'power2.out',
            transformOrigin: '50% 50%',
            onComplete: scheduleBlink
          });
        }
      });
    }, delay);
  }
  scheduleBlink();
}


// ─── Contact: pinned word-by-word reveal ──────────────────────────────────────
function initContactReveal() {
  const contact = document.querySelector('.vlance-contact-section');
  if (!contact || typeof ScrollTrigger === 'undefined') return;

  const heading = contact.querySelector('.h-l');
  if (!heading) return;

  // Split "Ready? Set. Go!" into individual word spans
  const words = heading.textContent.trim().split(/\s+/);
  heading.innerHTML = words
    .map(w => `<span class="vl-reveal-word">${w}</span>`)
    .join(' ');
  const wordEls = Array.from(heading.querySelectorAll('.vl-reveal-word'));

  const buttons = Array.from(contact.querySelectorAll('.vlance-contact-icon-btn, .vlance-contact-btn'));

  gsap.set(wordEls, { opacity: 0, y: 60 });
  gsap.set(buttons, { opacity: 0 });

  let done = false;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: contact,
      start: 'top top',
      end: '+=750',
      pin: true,
      pinSpacing: true,
      scrub: 0.8,
      invalidateOnRefresh: true,
      onLeave: () => {
        if (done) return;
        done = true;

        // Lock words + buttons permanently so CSS !important beats any future scrub
        wordEls.forEach(w => w.classList.add('vl-contact-word-revealed'));
        buttons.forEach(btn => btn.classList.add('vl-contact-btn-revealed'));

        // Kill the pin so it never re-pins on scroll-back.
        // kill(false) removes the GSAP pin spacer, shrinking the page by 750px.
        // The user's scroll position stays put, so they land naturally mid-way
        // into the footer — no empty gap, no forced scroll-back.
        tl.scrollTrigger.kill(false);
      },
    }
  });

  wordEls.forEach((word, i) => {
    tl.to(word, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, i * 0.55);
  });

  // Buttons are NOT part of the scrub — they reveal permanently via onLeave above.
  // Keeping them out of the scrub means scrub-reversal can never hide them again.
}


// ─── Star parallax ────────────────────────────────────────────────────────────
function initStarParallax() {
  const stars = document.querySelectorAll('.vl-star');
  if (!stars.length || typeof ScrollTrigger === 'undefined') return;

  // Each star gets a unique y travel and rotation — varied scrub speeds add depth
  const configs = [
    { yEnd: -130, rotEnd:  48, scrub: 1.2 },
    { yEnd:  -70, rotEnd: -62, scrub: 1.9 },
    { yEnd: -105, rotEnd:  75, scrub: 1.4 },
    { yEnd:  -55, rotEnd: -40, scrub: 2.1 },
    { yEnd:  -90, rotEnd:  58, scrub: 1.6 },
    { yEnd:  -65, rotEnd: -85, scrub: 1.3 },
    { yEnd:  -80, rotEnd:  42, scrub: 1.8 },
    { yEnd:  -45, rotEnd: -55, scrub: 2.3 },
  ];

  stars.forEach((star, i) => {
    const cfg     = configs[i % configs.length];
    const section = star.closest('section, footer') || document.body;

    gsap.fromTo(star,
      { y: 0, rotation: 0 },
      {
        y:        cfg.yEnd,
        rotation: cfg.rotEnd,
        ease:     'none',
        scrollTrigger: {
          trigger: section,
          start:   'top bottom',
          end:     'bottom top',
          scrub:   cfg.scrub,
        }
      }
    );
  });
}


// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCSSMarquee();
  initMuteButtons();
  initAutoMute();
  if (typeof gsap !== 'undefined' && typeof Draggable !== 'undefined') {
    gsap.registerPlugin(Draggable, InertiaPlugin, ScrollTrigger);
    ScrollTrigger.config({ limitCallbacks: true, syncInterval: 40 });
    initOsmoSlider();
    initServiceAnimations();
    initStatsAnimations();
    initContactFooterAnimations();
    initHeroDesc();
    initClouds();
    initMonkey();
    initBlueGuy();
    initContactReveal();
    initStarParallax();
  }
});

// Re-measure everything once fonts and images are fully loaded so pin
// spacers and scroll triggers use the correct final layout dimensions.
window.addEventListener('load', () => {
  if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
});
