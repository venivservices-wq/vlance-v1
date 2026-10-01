/* ─── Vlance — main JS ─── */

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
      const spd   = config.speed || 100;
      // Centring shift, in px: land the target card in the middle of the
      // viewport rather than flush against its left edge. `centreOffset()` was
      // only ever assigned to an unused local in refresh(), so `center` did
      // nothing and the active card always sat in the leftmost slot. Only the
      // snap targets move — the tween layout below is untouched — and the loop
      // wraps the preceding card in on the left to fill the freed slot.
      const totalDur = totalW / spd;
      const wrapTime = t => ((t % totalDur) + totalDur) % totalDur;
      items.forEach((el, i) => {
        const xPct = xPcts[i];
        const rawX = xPct / 100 * widths[i];
        const left = el.offsetLeft + rawX - startX + gaps[0];
        const right = left + widths[i] * gsap.getProperty(el, 'scaleX');
        tl.to(el, { xPercent: snap((rawX - right) / widths[i] * 100), duration: right / (config.speed || 100) }, 0)
          .fromTo(el, { xPercent: snap((rawX - right + totalW) / widths[i] * 100) },
            { xPercent: xPct, duration: (rawX - right + totalW - rawX) / (config.speed || 100), immediateRender: false }, right / (config.speed || 100))
          .add('label' + i, left / (config.speed || 100));
        // Wrapped here rather than left negative: toIdx() routes out-of-range
        // targets through gsap.utils.wrap(0, 1), which would collapse a
        // negative time into 0–1s instead of the end of the timeline.
        times[i] = wrapTime((left - (center ? parentEl.offsetWidth / 2 - widths[i] / 2 : 0)) / spd);
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

    // Two wrappers, because a single gsap.utils.wrap(0, 1) was being used for
    // both progress (0–1) and timeline *times* (0–duration). The 0–1 range is
    // right for progress but quietly collapsed any time past one second into
    // the first second of the loop — it only ever looked correct because the
    // first card's snap time happened to land under 1s.
    const wrapProg = gsap.utils.wrap(0, 1);
    const wrapTime = t => gsap.utils.wrap(0, tl.duration())(t);
    const toIdx  = (idx, vars) => {
      vars      = vars || {};
      const cur = tl.current();
      if (Math.abs(idx - cur) > length / 2) idx += idx > cur ? -length : length;
      const t = (tl.times || [])[((idx % length) + length) % length];
      if (t === undefined) return;
      let target = t;
      if (target > tl.time() !== idx > cur && idx !== cur) target += tl.duration() * (idx > cur ? 1 : -1);
      if (target < 0 || target > tl.duration()) vars.modifiers = { time: wrapTime };
      lastIndex  = ((idx % length) + length) % length;
      vars.overwrite = true;
      gsap.killTweensOf(draggable);
      return vars.duration === 0 ? tl.time(wrapTime(target)) : tl.tweenTo(target, vars);
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
      // Drag offset has to come from Draggable's own startX/x pair. This read
      // (startX2 - proxy.x) instead, mixing in the press-init correction that
      // belongs to snap() — harmless on the very first press, when Draggable's
      // x is still 0, but from the second press on it threw the progress off
      // and every later drag snapped straight back to the current card.
      const updateProg = () => tl.progress(wrapProg(startProg + (draggable.startX - draggable.x) * ratio));
      const settle     = () => tl.closestIndex(true);
      draggable = Draggable.create(proxy, {
        trigger:          items[0].parentNode,
        type:             'x',
        overshootTolerance: 0,
        inertia:          true,
        // Cards are video players, and Draggable skips presses that land on
        // "clickable" elements (<video> among them) unless told otherwise — so
        // a grab starting on the video itself, i.e. almost anywhere on a card,
        // would never begin a drag. minimumMovement keeps a stationary tap a
        // click, so the player's own controls still respond.
        dragClickables:   true,
        minimumMovement:  6,
        // Only applied when the caller asks, so desktop keeps Draggable's
        // defaults. These have to be passed at creation: Draggable reads them
        // once in its constructor, which is why the Object.assign onto
        // .vars afterwards never actually took effect.
        ...(config.dragResistance  != null ? { dragResistance:  config.dragResistance  } : {}),
        ...(config.throwResistance != null ? { throwResistance: config.throwResistance } : {}),
        ...(config.maxDuration     != null ? { maxDuration:     config.maxDuration     } : {}),
        ...(config.minDuration     != null ? { minDuration:     config.minDuration     } : {}),
        snap(x) {
          // proxy.x2 was undefined on a plain div, so a barely-moved press
          // returned NaN and killed the snap. startX2 is the press-init offset.
          if (Math.abs(startProg / -ratio - this.x) < 10) return snap2 + startX2;
          const r = -(x * ratio * tl.duration());
          const w = wrapTime(r);
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

      // Rotated side cards swing below the centered card's bounding box (the
      // fan pivot sits far under the cards), so a height based on the
      // unrotated card (H) is too short and the last stretch of every side
      // card gets left outside listEl's box. Measure actual rendered edges —
      // but only of the cards actually in view; off-screen ones sit at much
      // steeper angles and would inflate the height far more than needed.
      const syncHeight = () => {
        const top = listEl.getBoundingClientRect().top;
        let maxBottom = 0;
        slides.forEach(s => {
          if (s.getAttribute('data-gsap-slider-item-status') === 'not-active') return;
          maxBottom = Math.max(maxBottom, s.getBoundingClientRect().bottom - top);
        });
        listEl.style.height = maxBottom + 'px';
      };
      window.addEventListener('resize', syncHeight);

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
        } else if (v === 'prev' || v === 'next') {
          btn.onclick = () => {
            gsap.killTweensOf(proxy);
            const cur    = getIdx();
            const target = mod(Math.round(cur) + (v === 'next' ? 1 : -1), total);
            const dest   = -(cur + wrapDiff(target, cur, total)) * step;
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
      syncHeight();
      return;
    }

    // ── Horizontal loop layout ──
    // Touch used to go through GSAP's Draggable + InertiaPlugin, same as
    // desktop, just with heavier resistance dialed in. Two problems with
    // that in practice: (1) InertiaPlugin estimates release velocity from
    // recent pointer samples, and the very first drag of a page load has
    // too few of them — an erratic estimate could fling the loop all the
    // way around before settling back near card 1, which is exactly the
    // "goes fast and janky, scrolls through everything, lands back on 1"
    // bug. (2) updateProg() maps drag distance to progress using a ratio
    // over the FULL loop width (every card, not just one), so with heavy
    // resistance on top, a whole screen-width swipe barely dented the
    // progress needed to reach the next card.
    // Mobile now skips Draggable entirely and instead treats a swipe as a
    // simple, discrete "go to next/previous card" gesture — the same
    // toIndex() the arrow buttons already use, so it's exactly one card
    // per swipe no matter how far or fast you drag. Desktop keeps the
    // free-drag behavior, untouched.
    const isTouch = window.innerWidth <= 768;
    const loop = horizontalLoop(slides, {
      draggable:    !isTouch,
      snap:         1,
      paused:       true,
      center:       centered ? collection : false,
      paddingRight: gap,
      onChange(el, idx) { setActive(idx, slides.length); },
    });
    if (!isTouch && loop && loop.draggable) {
      Object.assign(loop.draggable.vars, {
        maxDuration:     1,
        minDuration:     0.5,
        dragResistance:  0.025,
        throwResistance: 2000,
      });
    }
    loop && loop.toIndex(0, { duration: 0 });
    setActive(0, slides.length);

    if (isTouch && loop && collection) {
      const SWIPE_PX = 30; // minimum horizontal travel to count as an intentional swipe
      let startX = 0, startY = 0, axis = null;

      const touchStart = e => {
        const t = e.touches[0];
        startX = t.clientX;
        startY = t.clientY;
        axis = null;
      };
      const touchMove = e => {
        const t = e.touches[0];
        if (axis === null) {
          const dx = t.clientX - startX;
          const dy = t.clientY - startY;
          if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; // ignore jitter
          axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        }
        // Horizontal gesture: own it so the page doesn't scroll along with it.
        // Vertical: do nothing and let the page scroll normally (touch-action:
        // pan-y on .gsap-slider__list handles the rest).
        if (axis === 'x') e.preventDefault();
      };
      const touchEnd = e => {
        if (axis !== 'x') return;
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) < SWIPE_PX) return; // too small to count as a swipe
        const opts = { duration: DURATION, ease: EASE };
        dx < 0 ? loop.next(opts) : loop.previous(opts);
      };

      collection.addEventListener('touchstart', touchStart, { passive: true });
      collection.addEventListener('touchmove',  touchMove,  { passive: false });
      collection.addEventListener('touchend',   touchEnd,   { passive: true });
    }

    controls.forEach(btn => {
      btn.disabled = false;
      const v = btn.getAttribute('data-gsap-slider-control');
      if (/^\d+$/.test(v)) {
        const idx = Math.max(0, Math.min(slides.length - 1, parseInt(v, 10) - 1));
        btn.onclick = () => loop && loop.toIndex(idx, { duration: DURATION, ease: EASE });
      } else if (v === 'prev' || v === 'next') {
        // Only numeric controls were wired here, so the prev/next arrows this
        // layout actually ships with were inert — the rotate branch above
        // handles them, this one never did.
        btn.onclick = () => {
          if (!loop) return;
          const opts = { duration: DURATION, ease: EASE };
          v === 'next' ? loop.next(opts) : loop.previous(opts);
        };
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
  // fromTo with immediateRender:false, not from(): a `from` tween records its
  // end state by reading the element, and ScrollTrigger.refresh() (fired on
  // window load once the Wistia players size themselves) makes it re-read —
  // by then the tween's own start values are sitting inline, so it captured
  // opacity:0 and animated 0 → 0, leaving the whole slider permanently blank.
  // Spelling both ends out explicitly means there is nothing to misread.
  if (collection) {
    tl.fromTo(collection,
      { opacity: 0, y: 60 },
      { opacity: 1, y: 0, duration: 0.95, ease: 'power3.out', immediateRender: false },
      0.25);  // absolute: starts at t=0.25s regardless of text timing
  }

  if (cards.length) {
    tl.fromTo(cards,
      { opacity: 0, scale: 0.88, filter: 'blur(10px)' },
      {
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
        duration: 0.72,
        ease: 'power3.out',
        immediateRender: false,
        // Hand opacity/filter back to the stylesheet so the active/inview
        // dimming rules aren't outranked by leftover inline values.
        clearProps: 'opacity,filter'
      },
      0.45);  // absolute: starts at t=0.45s — cards visible almost immediately
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



// ─── UGC cloud parallax (clouds drift, red bg stays stationary) ──────────────
function initUGCClouds() {
  const section = document.querySelector('.vl-ugc-section');
  if (!section || typeof ScrollTrigger === 'undefined') return;

  const isMobile = window.innerWidth <= 768;
  // Desktop clouds are <g> nested inside the shared #ugc-svg canvas (SVG
  // user-unit transforms); mobile clouds are standalone root <svg> elements
  // positioned by CSS (plain CSS-pixel transforms) — different coordinate
  // systems, so their drift amounts are tuned separately.
  const cloudRight = isMobile
    ? document.querySelector('.vl-ugc-cloud--right')
    : document.getElementById('ugc-cloud-right');
  const cloudLeft = isMobile
    ? document.querySelector('.vl-ugc-cloud--left')
    : document.getElementById('ugc-cloud-left');
  if (!cloudRight || !cloudLeft) return;

  const trig = { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 1.5 };
  const [rightFrom, rightTo] = isMobile ? [35, -50] : [160, -240];
  const [leftFrom, leftTo]   = isMobile ? [25, -40] : [130, -200];

  gsap.fromTo(cloudRight, { y: rightFrom }, { y: rightTo, ease: 'none', scrollTrigger: trig });
  gsap.fromTo(cloudLeft,  { y: leftFrom },  { y: leftTo,  ease: 'none', scrollTrigger: trig });
}

// ─── Client roster helpers (clients.js) ────────────────────────────────────
// Everything below that needs client photos/names/handles reads them from
// window.VLANCE_CLIENTS (see clients.js) instead of hand-written markup —
// the hero badge pool, the carousel cards and the "Trusted by N+" count all
// come from that one list.

// Paths in clients.js are plain, human-editable strings (e.g. "png/clients/
// chico pfp.png"); encode them for use in a src/href attribute.
function encodeClientPhoto(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

// One <a> (clickable, has a profile url) or <div> (no url yet) client card,
// used by buildClientsCarousel().
function buildClientCard(client) {
  const el = document.createElement(client.url ? 'a' : 'div');
  el.className = 'vl-clients-card';
  if (client.url) {
    el.href = client.url;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
  }

  const frame = document.createElement('div');
  frame.className = 'vl-clients-card__frame';
  const img = document.createElement('img');
  img.className = 'vl-clients-card__photo';
  img.src = encodeClientPhoto(client.photo);
  img.alt = client.name;
  img.loading = 'lazy';
  frame.appendChild(img);

  const body = document.createElement('div');
  body.className = 'vl-clients-card__body';
  const name = document.createElement('p');
  name.className = 'vl-clients-card__name';
  name.textContent = client.name;
  body.appendChild(name);
  if (client.handle) {
    const handle = document.createElement('p');
    handle.className = 'vl-clients-card__handle';
    handle.textContent = client.handle;
    body.appendChild(handle);
  }

  el.appendChild(frame);
  el.appendChild(body);
  return el;
}

// How many copies of the client list each carousel row repeats to fill a
// seamless loop (see the "Row is N duplicated sets" comment in
// initClientsRow below — both need to agree on this number).
const CLIENTS_CAROUSEL_REPEATS = 3;

// Builds the two carousel rows from clients.js. Deliberately has no GSAP
// dependency and runs unconditionally in the boot sequence, so the wall of
// faces still renders even if the GSAP CDN fails to load; initClientsCarousel()
// below layers the auto-scroll/drag motion on top once GSAP is ready.
function buildClientsCarousel() {
  const carousel = document.querySelector('.vl-clients-carousel');
  const clients  = window.VLANCE_CLIENTS;
  if (!carousel || !Array.isArray(clients) || !clients.length) return;

  const topTrack    = carousel.querySelector('.vl-clients-track--top');
  const bottomTrack = carousel.querySelector('.vl-clients-track--bottom');
  if (!topTrack || !bottomTrack) return;

  // Row 2 gets the same clients, rotated so the two rows never line up as
  // identical columns (a shared order would repeat every client in the same
  // position in both rows).
  const rotate = (arr, by) => arr.slice(by).concat(arr.slice(0, by));
  const rowOrders = [clients, rotate(clients, Math.floor(clients.length / 2) + 1)];

  [topTrack, bottomTrack].forEach((track, i) => {
    track.innerHTML = '';
    for (let r = 0; r < CLIENTS_CAROUSEL_REPEATS; r++) {
      rowOrders[i].forEach(client => track.appendChild(buildClientCard(client)));
    }
  });
}

// ─── Contact-section client circles ────────────────────────────────────────
// A curated set of round avatars in the contact CTA, between the heading and
// the action buttons — same clients.js data as the carousel. Capped well
// under the full roster (this is a quiet decorative row, not another wall of
// faces) and alternates a slight vertical stagger + rotation per slot (CSS
// nth-child, see .vlance-contact-avatar) for a loose "scattered" arrangement
// instead of a flat, rigid line.
function buildContactClientCircles() {
  const wrap    = document.querySelector('.vlance-contact-clients');
  const clients = window.VLANCE_CLIENTS;
  if (!wrap || !Array.isArray(clients) || !clients.length) return;

  const CONTACT_AVATAR_COUNT = 12;
  // Evenly sampled across the whole list (not just the first 12), so the mix
  // of longtime clients and newest additions both show up here.
  const step = Math.max(1, Math.floor(clients.length / CONTACT_AVATAR_COUNT));
  const picks = [];
  for (let i = 0; i < clients.length && picks.length < CONTACT_AVATAR_COUNT; i += step) {
    picks.push(clients[i]);
  }

  wrap.innerHTML = '';
  picks.forEach(client => {
    const img = document.createElement('img');
    img.className = 'vlance-contact-avatar';
    img.src = encodeClientPhoto(client.avatar || client.photo); // "avatar" = the img 2 photo for the small circles
    img.alt = '';
    img.loading = 'lazy';
    wrap.appendChild(img);
  });

  // "Trusted by N+ other creators" — N is the full roster, not just the circles shown above.
  const label = document.querySelector('.vlance-contact-clients-label');
  if (label) label.textContent = `Trusted by ${clients.length}+ other creators`;
}

// ─── "Trusted by N+ creators" — count comes straight from clients.js ──────
function initCreatorCount() {
  const clients = window.VLANCE_CLIENTS;
  if (!Array.isArray(clients) || !clients.length) return;
  const count = clients.length;

  // Hero badge: compact single-line pill, plain text.
  const badgeLabel = document.querySelector('.vl-trusted__label');
  if (badgeLabel) badgeLabel.textContent = `Trusted by ${count}+ creators`;

  // Header stat (next to "Built Around TikTok Shop Creators."): two lines,
  // right-aligned, matching the layout the heading also breaks onto.
  const statLabel = document.querySelector('.vl-clients-stat__label');
  if (statLabel) statLabel.innerHTML = `Trusted by<br>${count}+ creators`;
}

// ─── Trusted-by badge: cycle the avatars through a larger pool ────────────────
// Only 4 faces are on screen at once, but the pool (clients.js) is bigger, so
// one slot at a time swaps to a face that isn't currently showing. Each swap
// is a vertical slide inside the slot's circle (old face slides up and out,
// new one slides in from below), and it pauses while the badge is off-screen.
function initTrustedAvatars() {
  const badge = document.querySelector('.vl-trusted');
  if (!badge || typeof gsap === 'undefined') return;

  const slotEls = Array.from(badge.querySelectorAll('.vl-trusted__slot'));
  const current = slotEls.map(el => el.querySelector('img'));
  if (!current.length || current.some(img => !img)) return;

  const pool = (window.VLANCE_CLIENTS || []).map(c => ({ src: encodeClientPhoto(c.avatar || c.photo), alt: c.name }));
  // Nothing to rotate through if the pool can't beat what's already shown
  if (pool.length <= slotEls.length) return;

  // Someone who's asked for less motion gets the static badge
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Preload the off-screen faces so a swapped-in avatar never flashes blank
  pool.forEach(p => { const img = new Image(); img.src = p.src; });

  // Pool index currently displayed in each slot
  const shown = current.map(img => {
    const i = pool.findIndex(p => img.getAttribute('src') === p.src);
    return i === -1 ? 0 : i;
  });

  const SWAP_EVERY = 2200; // ms between swaps
  const FIRST_SWAP = 900;  // ms — after the hero entrance has settled
  let turn = 0;            // round-robin, so every slot gets its turn
  let visible = true;

  const swap = () => {
    if (!visible || document.hidden) return;
    const slot = turn++ % slotEls.length;

    // Only faces that aren't on screen, so the same creator never shows twice
    const candidates = pool.map((_, i) => i).filter(i => shown.indexOf(i) === -1);
    if (!candidates.length) return;

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const old  = current[slot];
    const next = old.cloneNode();
    next.alt = pool[pick].alt || '';
    current[slot] = next;
    shown[slot] = pick;

    // Parked fully below the circle (yPercent > 100 covers the scale-up too)
    // before it's in the DOM, and only slid up once the photo has decoded —
    // so it never appears half-loaded at the bottom of the circle.
    gsap.set(next, { yPercent: 120, scale: 1.1 });
    next.src = pool[pick].src;
    const play = () => {
      slotEls[slot].appendChild(next);
      gsap.timeline({ onComplete: () => old.remove() })
        .to(old,  { yPercent: -120, scale: 0.9, duration: 0.8, ease: 'expo.inOut' }, 0)
        .to(next, { yPercent: 0,    scale: 1,   duration: 0.8, ease: 'expo.inOut' }, 0);
    };
    (next.decode ? next.decode() : Promise.resolve()).then(play, play);
  };

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(badge);
  }

  setTimeout(() => {
    swap();
    setInterval(swap, SWAP_EVERY);
  }, FIRST_SWAP);
}

// ─── Client carousel: auto-scroll + drag to go faster ─────────────────────────
// Two rows, each running independently in its own direction (data-dir="-1"
// scrolls left, "1" scrolls right). Each row drags on its own.
function initClientsCarousel() {
  const carousel = document.querySelector('.vl-clients-carousel');
  if (!carousel || typeof gsap === 'undefined') return;
  carousel.querySelectorAll('.vl-clients-track').forEach(initClientsRow);
}

function initClientsRow(track) {
  const dir = Number(track.dataset.dir) || -1;

  const SPEED = 40; // px/sec auto-scroll
  let x        = 0;
  let loopW    = 0;
  let dragging = false;
  let lastX    = 0;

  // Track is CLIENTS_CAROUSEL_REPEATS duplicated sets of cards, built by
  // buildClientsCarousel(); one set's width is exactly one seamless loop.
  const measure = () => { loopW = track.scrollWidth / CLIENTS_CAROUSEL_REPEATS; };
  measure();
  window.addEventListener('resize', measure);

  const wrap = () => {
    if (loopW <= 0) return;
    x = ((x % loopW) + loopW) % loopW - loopW; // keep in (-loopW, 0]
  };

  // Stagger the rows by half a card so the two rows sit in a brick pattern
  // instead of sharing columns — cards are then never exactly stacked on one
  // another, which is what would make a repeated client obvious.
  if (track.dataset.stagger === 'half') {
    const card = track.querySelector('.vl-clients-card');
    if (card) x -= card.offsetWidth / 2;
    wrap();
  }

  gsap.ticker.add((time, deltaTime) => {
    if (!dragging) {
      x += dir * SPEED * (deltaTime / 1000);
      wrap();
      gsap.set(track, { x });
    }
  });

  // Cards are <a> links now (TikTok profiles) — a plain click still needs to
  // navigate, but a drag that happens to end over a card must not. Track
  // total displacement from press and swallow the click only if it moved.
  let pressX = 0;
  let dragged = false;

  const start = clientX => {
    dragging = true;
    dragged  = false;
    pressX   = clientX;
    lastX    = clientX;
    track.classList.add('is-dragging');
  };
  const move = clientX => {
    if (!dragging) return;
    if (Math.abs(clientX - pressX) > 5) dragged = true;
    x += clientX - lastX;
    lastX = clientX;
    wrap();
    gsap.set(track, { x });
  };
  const end = () => {
    dragging = false;
    track.classList.remove('is-dragging');
  };

  // Touch: axis-locked, so a single gesture commits to EITHER dragging the
  // carousel OR scrolling the page, never both at once. Previously every
  // touch dragged the track sideways AND scrolled the page vertically at
  // the same time — that's what made it feel laggy/fighting-you on mobile.
  // touch-action: pan-y on .vl-clients-track (vlance.css) keeps the browser
  // from also trying to handle either axis natively while this decides.
  let axis   = null; // null until the gesture commits: 'x' (carousel) or 'y' (page)
  let startX = 0;
  let startY = 0;

  const touchStart = e => {
    const t = e.touches[0];
    start(t.clientX);
    startX = t.clientX;
    startY = t.clientY;
    axis = null;
  };
  const touchMove = e => {
    const t = e.touches[0];
    if (axis === null) {
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; // ignore jitter
      axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (axis === 'y') { end(); return; } // hand this gesture to the page entirely
    }
    if (axis !== 'x') return;
    e.preventDefault(); // own the gesture now — stop the page moving with it
    move(t.clientX);
  };

  track.addEventListener('touchstart', touchStart, { passive: true });
  track.addEventListener('touchmove',  touchMove,  { passive: false });
  track.addEventListener('touchend',    end);
  track.addEventListener('touchcancel', end);

  track.addEventListener('mousedown', e => { start(e.clientX); e.preventDefault(); });
  window.addEventListener('mousemove', e => move(e.clientX));
  window.addEventListener('mouseup',   end);

  track.addEventListener('click', e => {
    if (dragged) { e.preventDefault(); e.stopPropagation(); }
  }, true);
}

// ─── Footer video marquee: same clips as "Our Work", continuous auto-scroll ───
function initFooterVideoMarquee() {
  const track = document.querySelector('.vlance-footer-videos__track');
  if (!track || typeof gsap === 'undefined') return;

  const SPEED = 25; // px/sec — slower than the client carousel, this is background texture
  let x     = 0;
  let loopW = 0;

  // Track is 6 duplicated sets of the 4 clips (see markup comment); one
  // set's width is exactly one seamless loop. Needs enough sets that at
  // least (N-1) sets' worth of width covers the widest realistic viewport —
  // otherwise the track runs out of video before reaching the edge and a
  // gap becomes visible partway through the scroll cycle.
  const measure = () => { loopW = track.scrollWidth / 6; };
  measure();
  window.addEventListener('resize', measure);

  gsap.ticker.add((time, deltaTime) => {
    if (loopW <= 0) return;
    x -= SPEED * (deltaTime / 1000);
    x = ((x % loopW) + loopW) % loopW - loopW; // keep in (-loopW, 0]
    gsap.set(track, { x });
  });
}

// ─── FAQ accordion ──────────────────────────────────────────────────────────
// Interaction modeled on the Evander Media reference: click a question,
// its answer expands and every other open answer closes. Rebuilt cleanly
// here rather than ported as-is — the reference mixed an inline `.style.
// height` write with a CSS `max-height` transition, which only "worked" by
// coincidence (a fixed max-height guess big enough for its own short
// answers). This drives max-height from the real scrollHeight instead, so
// it animates correctly no matter how long an answer is.
function initFaqAccordion() {
  const items = document.querySelectorAll('.vl-faq-item');
  if (!items.length) return;

  items.forEach(item => {
    const toggle = item.querySelector('.vl-faq-toggle');
    const answer = item.querySelector('.vl-faq-answer');
    if (!toggle || !answer) return;

    toggle.addEventListener('click', () => {
      const opening = !item.classList.contains('is-open');
      const topBefore = item.getBoundingClientRect().top;

      items.forEach(other => {
        if (other === item || !other.classList.contains('is-open')) return;
        other.classList.remove('is-open');
        other.querySelector('.vl-faq-toggle')?.setAttribute('aria-expanded', 'false');
        const otherAnswer = other.querySelector('.vl-faq-answer');
        if (!otherAnswer) return;
        // An open answer ABOVE the tapped one would shrink and drag the
        // tapped question up off screen as it animates — close that one
        // instantly instead, then correct the scroll below.
        const above = other.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING;
        if (above) {
          otherAnswer.style.transition = 'none';
          otherAnswer.style.maxHeight = '';
          void otherAnswer.offsetHeight;
          otherAnswer.style.transition = '';
        } else {
          otherAnswer.style.maxHeight = '';
        }
      });

      // Put the tapped question back exactly where the finger was.
      const shift = item.getBoundingClientRect().top - topBefore;
      if (shift) window.scrollBy({ top: shift, behavior: 'instant' });

      item.classList.toggle('is-open', opening);
      toggle.setAttribute('aria-expanded', String(opening));
      answer.style.maxHeight = opening ? answer.scrollHeight + 'px' : '';
    });
  });
}

// ─── Pricing: 20 / 50 / 100 / 150 credit switch ──────────────────────────────
// Each option button holds its own data-credits / data-price; this just
// copies them into the card.
function initPricingPlans() {
  document.querySelectorAll('[data-pricing-plans]').forEach(card => {
    const opts = card.querySelectorAll('.vl-price-opt');
    const price = card.querySelector('[data-plan-price]');
    const credits = card.querySelector('[data-plan-credits]');

    opts.forEach(opt => {
      opt.addEventListener('click', () => {
        opts.forEach(o => {
          o.classList.toggle('is-active', o === opt);
          o.setAttribute('aria-selected', String(o === opt));
        });
        if (price) price.textContent = opt.dataset.price;
        if (credits) credits.textContent = opt.dataset.credits;
      });
    });
  });
}

// ─── Comparison table (phones): switch which column is shown ─────────────────
function initCompareSwitch() {
  const table = document.querySelector('.vl-compare-table');
  const opts = document.querySelectorAll('.vl-compare-opt');
  if (!table || !opts.length) return;
  opts.forEach(opt => {
    opt.addEventListener('click', () => {
      opts.forEach(o => {
        o.classList.toggle('is-active', o === opt);
        o.setAttribute('aria-selected', String(o === opt));
      });
      table.dataset.col = opt.dataset.col;
    });
  });
}

// ─── Perks bands scroll reveal ────────────────────────────────────────────────
const PERKS_STACK_EFFECT_ENABLED = true;

function initPerksAnimation() {
  const bands = document.querySelectorAll('.vl-perk-band');
  if (!bands.length || typeof ScrollTrigger === 'undefined') return;

  const isMobile = window.innerWidth <= 768;
  // How far into the next band's entrance before the current one starts
  // blurring away. 'top bottom' (old value) fired the instant the next band's
  // top merely touched the screen's bottom edge — barely any reading time
  // before the blur kicked in. Delaying to 'center'/'bottom' means much more
  // of the next band has to scroll into view first. Mobile gets the longest
  // reading window since scroll gestures cover more of the page at once there.
  const blurStart = isMobile ? 'bottom bottom' : 'center bottom';

  const progressEl   = document.querySelector('.vl-perks-progress');
  const progressDots = document.querySelectorAll('.vl-perk-dot');

  // ── Show/hide progress dots while section is active ───────────────────────
  if (progressEl) {
    ScrollTrigger.create({
      trigger: '.vl-perks-section',
      start: 'top center',
      end: 'bottom center',
      onEnter:     () => progressEl.classList.add('is-visible'),
      onLeave:     () => progressEl.classList.remove('is-visible'),
      onEnterBack: () => progressEl.classList.add('is-visible'),
      onLeaveBack: () => progressEl.classList.remove('is-visible'),
    });
  }

  function setActiveDot(i) {
    progressDots.forEach((d, j) => d.classList.toggle('is-active', j === i));
    if (progressEl) progressEl.classList.toggle('on-dark', bands[i]?.classList.contains('vl-perk-band--dark'));
  }

  // ── Per-band scroll lock + stack + blur ────────────────────────────────────
  bands.forEach((band, i) => {
    const title = band.querySelector('.vl-perk-title');
    const sub   = band.querySelector('.vl-perk-sub');
    const img   = band.querySelector('.vl-perk-img');

    // Activate progress dot when band locks to top
    ScrollTrigger.create({
      trigger: band,
      start: 'top top+=1',
      end: 'bottom top',
      onEnter:     () => setActiveDot(i),
      onEnterBack: () => setActiveDot(i),
    });

    // Blur-out + scale-up as next band slides over this one — the feature
    // image blurs along with the text.
    if (PERKS_STACK_EFFECT_ENABLED && i < bands.length - 1) {
      const st = () => ({ trigger: bands[i + 1], start: blurStart, end: 'top top', scrub: 0.8 });

      const text = [title, sub].filter(Boolean);
      if (text.length) {
        gsap.to(text, {
          filter: 'blur(16px)', opacity: 0.18, scale: 1.06, ease: 'power1.in',
          scrollTrigger: st()
        });
      }

      // The image goes all the way to 0 rather than resting at 0.18 like the
      // text: a blurred 18%-opacity photo doesn't read as "faded back", it
      // reads as a grey smudge, and it stays visible through the wave notches
      // of the red band stacked over it once this band is buried.
      if (img) {
        gsap.to(img, {
          filter: 'blur(16px)', opacity: 0, scale: 1.06, ease: 'power1.in',
          scrollTrigger: st()
        });
      }
    }
  });

}

// ─── Contact + Footer scroll animations ───────────────────────────────────────
function initContactFooterAnimations() {
  if (typeof ScrollTrigger === 'undefined') return;

  // Contact buttons are revealed at the end of the pin timeline in initContactReveal

  // ── Footer ────────────────────────────────────────────────────────────────
  const footer = document.querySelector('.vlance-footer');
  if (footer) {
    const logo     = footer.querySelector('.vlance-footer-logo');
    const copy     = footer.querySelector('.vlance-footer-inner .eyebrow');
    const navLinks = footer.querySelectorAll('.vlance-footer-nav a');
    const videos   = footer.querySelector('.vlance-footer-videos');

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: footer,
        start: 'top 90%',
        end: 'bottom top',
        toggleActions: 'play none play reverse'
      }
    });

    // Just a fade — the marquee is already in continuous motion once it's
    // visible, so it doesn't need its own entrance flourish on top of that.
    if (videos) {
      tl.from(videos, { opacity: 0, duration: 0.5, ease: 'power2.out' });
    }

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


// ─── FAQ → contact colour hand-off ──────────────────────────────────────
// Scrubs the red dome at the foot of the FAQ section up out of the contact
// section, so the panel colour gives way to brand red as the section arrives
// rather than meeting it at a hard edge. Scaled on the Y axis only, from a
// bottom origin, so it reads as the red rising rather than sliding in.
function initContactTransition() {
  if (typeof ScrollTrigger === 'undefined') return;

  const swell   = document.querySelector('.vl-red-swell');
  const contact = document.querySelector('.vlance-contact-section');
  if (!swell || !contact) return;

  // Reduced motion still needs the colour hand-off, just not the movement.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(swell, { scaleY: 1 });
    return;
  }

  gsap.fromTo(swell,
    { scaleY: 0.05 },
    {
      scaleY: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: contact,
        start: 'top bottom',   // contact section first touches the viewport
        end:   'top 62%',      // fully risen before it settles
        scrub: 1
      }
    }
  );
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

  // Mobile: the UGC section is tall (portrait), so the default end point spreads
  // the fill over a long scroll. Pull the end in and tighten the per-word
  // stagger so the whole thing fills in over noticeably less scrolling.
  const isMobile = window.innerWidth <= 768;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.vl-ugc-section',
      start: isMobile ? 'top 82%' : 'top 75%',
      end:   isMobile ? 'center 62%' : 'bottom 60%',
      scrub: 0.8
    }
  });

  const step = isMobile ? 0.11 : 0.18;
  units.forEach((unit, i) => {
    tl.to(unit, { opacity: 1, ease: 'power1.out', duration: 0.4 }, i * step);
  });
}


// ─── SVG background parallax ──────────────────────────────────────────────────
function initSvgParallax() {
  if (typeof ScrollTrigger === 'undefined') return;



  // Monkey — floats up slightly as hero scrolls away
  const monkey = document.querySelector('.vl-monkey-wrap');
  if (monkey) {
    gsap.to(monkey, {
      yPercent: -25,
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1.5
      }
    });
  }

  // Work section background — drifts up as section scrolls
  const workBck = document.querySelector('.vl-work-section-bck');
  if (workBck) {
    gsap.to(workBck, {
      yPercent: -15,
      ease: 'none',
      scrollTrigger: {
        trigger: '.product-slider__wrap',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.2
      }
    });
  }


  // Numbers section background SVG
  const statsBck = document.querySelector('.vl-stats-bck');
  if (statsBck) {
    gsap.to(statsBck, {
      yPercent: -15,
      ease: 'none',
      scrollTrigger: {
        trigger: '.vl-stats',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.2
      }
    });
  }

}

// ─── Magnifying glass pans over title + zoom effect ───────────────────────────
function initGlassAnimation() {
  if (typeof ScrollTrigger === 'undefined') return;
  const glassSvg = document.querySelector('#vl-glass-svg');
  const titleH2  = document.querySelector('.product-slider__title .h-l');
  const titleDiv = document.querySelector('.product-slider__title');
  const section  = document.querySelector('.product-slider__wrap');
  if (!glassSvg || !titleH2 || !titleDiv || !section) return;


  // Wrap every character in a span so we can colour them individually
  function wrapChars(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      for (const ch of node.textContent) {
        if (ch === ' ') {
          frag.appendChild(document.createTextNode(' '));
        } else {
          const s = document.createElement('span');
          s.className = 'vl-char';
          s.textContent = ch;
          frag.appendChild(s);
        }
      }
      node.parentNode.replaceChild(frag, node);
    } else {
      Array.from(node.childNodes).forEach(wrapChars);
    }
  }
  wrapChars(titleH2);
  const charSpans = Array.from(titleH2.querySelectorAll('.vl-char'));

  const glassCenter = document.querySelector('#vl-glass-center');
  const G_R_F = 403.5 / 1600;

  function updateCharColors() {
    const svgH = glassSvg.getBoundingClientRect().height;
    const r    = svgH * G_R_F;
    const cr   = glassCenter.getBoundingClientRect();
    const gcx  = (cr.left + cr.right)  / 2;
    const gcy  = (cr.top  + cr.bottom) / 2;

    charSpans.forEach(span => {
      const sr = span.getBoundingClientRect();
      const cy = (sr.top + sr.bottom) / 2;
      // Sample at 25%, 50%, 75% of the letter's width
      const samples = [0.25, 0.5, 0.75].map(t => sr.left + sr.width * t);
      const hits = samples.filter(x => Math.sqrt((x - gcx) ** 2 + (cy - gcy) ** 2) <= r).length;
      span.style.color = hits >= 2 ? '#b91616' : '';
    });
  }

  let anim, st;

  const setup = () => {
    const tr   = titleH2.getBoundingClientRect();
    const svgH = glassSvg.getBoundingClientRect().height;
    const svgW = svgH * (1350 / 1600);
    const max  = Math.max(0, tr.width - svgW);

    if (st)   st.kill();
    if (anim) anim.kill();

    gsap.set(glassSvg, { yPercent: -50, rotation: -20, x: 0 });
    updateCharColors();

    anim = gsap.fromTo(glassSvg,
      { x: 0 },
      { x: max, ease: 'sine.inOut', duration: 1, onUpdate: updateCharColors }
    );

    st = ScrollTrigger.create({
      trigger:   section,
      start:     'top 65%',
      end:       'bottom 40%',
      scrub:     2,
      animation: anim
    });
  };

  requestAnimationFrame(() => requestAnimationFrame(setup));
  window.addEventListener('resize', setup);
}

// ─── Hero cloud parallax ──────────────────────────────────────────────────────
function initClouds() {
  const isMobile = window.innerWidth <= 768;
  const suffix = isMobile ? 'mobile' : 'desktop';
  const cloudRight = document.getElementById(`hero-cloud-right--${suffix}`);
  const cloudLeft  = document.getElementById(`hero-cloud-left--${suffix}`);
  if (!cloudRight || !cloudLeft || typeof ScrollTrigger === 'undefined') return;

  const trig = { trigger: '#hero', start: 'top top', end: 'bottom top' };
  // Start pushed further down (below the visible crop, so no bottom edge shows
  // on load) and drift upward as the hero scrolls past. Mobile's viewBox is
  // ~0.28x the scale of desktop's, so its offsets are scaled down to match.
  const [rightFrom, rightTo] = isMobile ? [70, -45] : [220, -160];
  const [leftFrom, leftTo]   = isMobile ? [55, -30]  : [170, -100];

  // Right cloud moves faster (feels closer); left cloud slower (feels further away)
  gsap.fromTo(cloudRight, { y: rightFrom }, { y: rightTo, ease: 'none', scrollTrigger: { ...trig, scrub: 1 } });
  gsap.fromTo(cloudLeft,  { y: leftFrom },  { y: leftTo,  ease: 'none', scrollTrigger: { ...trig, scrub: 1.8 } });
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
        scaleY: 0,
        duration: 0.06,
        ease: 'power3.in',
        transformOrigin: 'center',
        overwrite: true,
        onComplete() {
          gsap.to(blinkEls, {
            scaleY: 1,
            duration: 0.1,
            ease: 'power2.out',
            transformOrigin: 'center',
            overwrite: true,
            onComplete() {
              gsap.set(blinkEls, { clearProps: 'scaleY,transformOrigin' });
              scheduleBlink();
            }
          });
        }
      });
    }, delay);
  }
  scheduleBlink();
}


// ─── Contact flags wave ───────────────────────────────────────────────────────
function initContactFlags() {
  const flags = document.querySelector('.vl-contact-flags');
  if (!flags) return;

  // Establish base state: vertically centred + 30° clockwise tilt
  gsap.set(flags, { yPercent: -50, rotation: 30, transformOrigin: 'center bottom' });

  // Wave: oscillates ±7° around the 30° base
  gsap.fromTo(flags,
    { rotation: 23 },
    { rotation: 37, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }
  );

  // Skew for billowing feel
  gsap.fromTo(flags,
    { skewX: -4 },
    { skewX: 4, duration: 1.9, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.5 }
  );
}


// ─── Contact monkey ───────────────────────────────────────────────────────────
function initContactMonkey() {
  const wrap = document.querySelector('.vl-contact-monkey');
  if (!wrap) return;
  const svg = wrap.querySelector('svg');
  if (!svg) return;

  const lIn  = svg.querySelector('#cm-leye-in');
  const rIn  = svg.querySelector('#cm-reye-in');
  const lOut = svg.querySelector('#cm-leye-out');
  const rOut = svg.querySelector('#cm-reye-out');
  if (!lIn || !rIn) return;

  const LC = { x: 701.188, y: 507.938 };
  const RC = { x: 980.19,  y: 506.938 };
  const MAX_TRAVEL = 26;

  // Align monkey center with the heading's vertical center
  const section = wrap.closest('.vlance-contact-section');
  const heading = section && section.querySelector('.h-l');
  gsap.set(wrap, { yPercent: -50, rotation: -120 });
  function alignMonkey() {
    if (!section || !heading) return;
    const secRect  = section.getBoundingClientRect();
    const headRect = heading.getBoundingClientRect();
    const relTop   = headRect.top - secRect.top + headRect.height / 2;
    gsap.set(wrap, { top: relTop });
  }
  alignMonkey();
  window.addEventListener('resize', alignMonkey);

  // Subtle left/right sway (peek in and out from right edge)
  gsap.to(wrap, {
    x: 14,
    duration: 3.2,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1
  });

  // Gentle lean
  gsap.to(wrap, {
    rotation: -123,
    duration: 16,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1
  });

  // Eye tracking
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

  // Random blink
  const blinkEls = [lOut, lIn, rOut, rIn].filter(Boolean);
  function scheduleBlink() {
    const delay = 1600 + Math.random() * 4200;
    setTimeout(() => {
      gsap.to(blinkEls, {
        scaleY: 0,
        duration: 0.06,
        ease: 'power3.in',
        transformOrigin: 'center',
        overwrite: true,
        onComplete() {
          gsap.to(blinkEls, {
            scaleY: 1,
            duration: 0.1,
            ease: 'power2.out',
            transformOrigin: 'center',
            overwrite: true,
            onComplete() {
              gsap.set(blinkEls, { clearProps: 'scaleY,transformOrigin' });
              scheduleBlink();
            }
          });
        }
      });
    }, delay);
  }
  scheduleBlink();
}




// ─── Work slider: square video corners on mobile ─────────────────────────────
// <wistia-player> rounds its own chrome by 12px inside a shadow root, so no
// page-level rule can reach it — the only way in is a <style> appended to that
// shadow root once the element has upgraded.
function initSquareVideoCorners() {
  if (window.innerWidth > 768) return;

  const players = document.querySelectorAll('.product-slider wistia-player');
  if (!players.length) return;

  // .w-vulcan-v2 is the full-size player surface and carries an INLINE 9px
  // radius, which is what stayed visible at the top of each card after the
  // first pass — the bottom corners were simply hidden under the dark
  // .vlance-video-overlay gradient. !important in a shadow-root stylesheet
  // still outranks an inline style, so this reaches it.
  const CSS = '.w-chrome,.w-video-wrapper,.w-bottom-bar,.w-vulcan-v2,' +
              'video,img,canvas{border-radius:0 !important}';
  const inject = player => {
    const root = player.shadowRoot;
    if (!root) return false;                                  // not upgraded yet
    if (root.querySelector('style[data-vl-square]')) return true;
    const style = document.createElement('style');
    style.setAttribute('data-vl-square', '');
    style.textContent = CSS;
    root.appendChild(style);
    return true;
  };

  players.forEach(player => {
    if (inject(player)) return;
    // The player attaches its shadow root asynchronously once Wistia's script
    // has loaded, so poll for a short window rather than giving up here.
    let tries = 0;
    const id = setInterval(() => {
      if (inject(player) || ++tries > 40) clearInterval(id);
    }, 250);
  });
}


// ─── Contact: word-by-word entrance (no pin — plays once on scroll-in) ───────
function initContactReveal() {
  const contact = document.querySelector('.vlance-contact-section');
  if (!contact || typeof ScrollTrigger === 'undefined') return;

  // Mobile shows the heading and buttons outright — no fade-in on scroll.
  if (window.innerWidth <= 768) return;

  // Two separate <h2> lines ("Stop editing." / "Start posting."), not one
  // <br>-joined heading — querySelectorAll so both get word-split and both
  // take part in the same staggered reveal.
  const headings = Array.from(contact.querySelectorAll('.h-l'));
  if (!headings.length) return;

  const wordEls = [];
  headings.forEach(heading => {
    const words = heading.textContent.trim().split(/\s+/);
    heading.innerHTML = words
      .map(w => `<span class="vl-reveal-word">${w}</span>`)
      .join(' ');
    wordEls.push(...heading.querySelectorAll('.vl-reveal-word'));
  });
  const buttons = Array.from(contact.querySelectorAll('.vlance-contact-icon-btn, .vlance-contact-btn'));
  const clients = contact.querySelector('.vlance-contact-clients-wrap');

  gsap.set(wordEls, { opacity: 0, y: 60 });
  if (clients) gsap.set(clients, { opacity: 0, y: 14 });
  gsap.set(buttons, { opacity: 0 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: contact,
      start: 'top 75%',
      toggleActions: 'play none none none',
    }
  });

  wordEls.forEach((word, i) => {
    tl.to(word, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, i * 0.35);
  });

  tl.to(buttons, { opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.1 }, '>-0.1');
  if (clients) tl.to(clients, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, '>-0.15');
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


// ─── Nav: 3 visible pills + ← → arrow navigation ─────────────────────────────
function initNavScroll() {
  const nav = document.querySelector('.product-slider__nav');
  if (!nav || window.innerWidth > 768) return;

  const buttons = Array.from(nav.querySelectorAll('[data-gsap-slider-control]'));
  const n = buttons.length;
  if (n < 2) return;

  const mod = i => ((i % n) + n) % n;
  let ai = Math.max(0, buttons.findIndex(b =>
    b.getAttribute('data-gsap-slider-control-status') === 'active'));

  // Build arrow row above the hidden nav
  const row = document.createElement('div');
  row.className = 'vl-nav-row';
  nav.parentNode.insertBefore(row, nav);

  function makeArrow(dir) {
    const btn = document.createElement('button');
    btn.className = 'vl-nav-arrow';
    btn.setAttribute('aria-label', dir === 'prev' ? 'Previous' : 'Next');
    btn.innerHTML = dir === 'prev'
      ? '<svg width="10" height="16" viewBox="0 0 10 16" fill="none"><path d="M9 1L1 8l8 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg width="10" height="16" viewBox="0 0 10 16" fill="none"><path d="M1 1l8 7-8 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return btn;
  }

  const prevBtn = makeArrow('prev');
  const nextBtn = makeArrow('next');
  row.appendChild(prevBtn);
  row.appendChild(nextBtn);

  prevBtn.addEventListener('click', () => {
    ai = mod(ai - 1);
    buttons[ai].click();
  });

  nextBtn.addEventListener('click', () => {
    ai = mod(ai + 1);
    buttons[ai].click();
  });

  // Keep ai in sync if slider changes via other means
  new MutationObserver(() => {
    const newAi = buttons.findIndex(b =>
      b.getAttribute('data-gsap-slider-control-status') === 'active');
    if (newAi >= 0) ai = newAi;
  }).observe(nav, {
    attributes: true, attributeFilter: ['data-gsap-slider-control-status'], subtree: true
  });
}

// ─── Hero timeline panel: fill each lane with clips ──────────────────────────
// Fixed, hand-tuned widths (in rem) rather than random, so the panel looks the
// same on every load. A negative number is an empty gap. Every lane is padded
// to the same LOOP length (a multiple of the 4rem ruler tile) and written
// twice, so all lanes scroll at one speed and the CSS -50% loop is seamless.
function buildHeroTimeline() {
  const timeline = document.querySelector('.vl-hero-timeline');
  if (!timeline) return;

  const CLIP_GAP = 0.3; // rem between neighbouring clips
  const PATTERNS = {
    video: [9, 5.5, 12, 7, 4.5, 10, 6.5, 14, 8, 5, 11],
    text:  [-3, 5, -7, 7.5, -4, 4, -9, 6, -6, 5, -8],
    audio: [24, 13, -2, 19, 27, -3, 17],
  };
  const SELECTED = 2;   // video clip shown "selected"
  const RED_TEXT = [3]; // text clips filled red

  const photos = (window.VLANCE_CLIENTS || []).map(c => encodeClientPhoto(c.photo));

  const lengthOf = p => p.reduce((sum, w) => sum + Math.abs(w) + (w > 0 ? CLIP_GAP : 0), 0);
  const longest = Math.max(...Object.values(PATTERNS).map(lengthOf));
  const LOOP = Math.ceil(longest / 4) * 4;

  const gap = w => {
    const el = document.createElement('span');
    el.className = 'vl-tl-gap';
    el.style.width = w + 'rem';
    return el;
  };

  timeline.querySelectorAll('.vl-tl-track[data-kind]').forEach(track => {
    const kind = track.dataset.kind;
    const pattern = PATTERNS[kind];
    if (!pattern) return;
    const frag = document.createDocumentFragment();
    let photo = 5; // start a few faces in, away from the hero cards' faces

    for (let copy = 0; copy < 2; copy++) {
      pattern.forEach((w, i) => {
        if (w < 0) { frag.appendChild(gap(-w)); return; }
        const clip = document.createElement('span');
        clip.className = 'vl-tl-clip';
        clip.style.width = w + 'rem';
        if (kind === 'video') {
          if (photos.length) clip.style.backgroundImage = `url("${photos[photo++ % photos.length]}")`;
          if (i === SELECTED) clip.classList.add('is-selected');
        }
        if (kind === 'text' && RED_TEXT.includes(i)) clip.classList.add('is-red');
        frag.appendChild(clip);
        frag.appendChild(gap(CLIP_GAP));
      });
      frag.appendChild(gap(LOOP - lengthOf(pattern)));
    }
    track.appendChild(frag);
  });

  const ruler = timeline.querySelector('.vl-tl-ruler');
  if (ruler) ruler.style.width = LOOP * 2 + 'rem';
}

// ─── Hero entrance: headline lines → copy/CTA/badge, then the
//     floating creator cards pop in around the edges ─────────────────────────
function initHeroEntrance() {
  if (typeof gsap === 'undefined') return;
  const hero = document.querySelector('.home-hero');
  if (!hero) return;

  const lines   = Array.from(hero.querySelectorAll('.vl-ht-line'));
  const rest    = ['.vl-hero-cta', '.vl-trusted']
    .map(sel => hero.querySelector(sel)).filter(Boolean);
  const cards   = Array.from(hero.querySelectorAll('.vl-hero-card'))
    .filter(c => getComputedStyle(c).display !== 'none');

  gsap.set(rest, { opacity: 0, y: 18 });
  gsap.set(lines, { opacity: 0, y: 46 });
  gsap.set(cards, { opacity: 0, scale: 0.85, y: 30 });

  const tl = gsap.timeline({ delay: 0.15 });
  tl.to(lines, { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out', stagger: 0.09 }, 0);
  tl.to(rest, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.08 }, '-=0.45');
  tl.to(cards, { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: 'back.out(1.6)', stagger: 0.08 }, 0.35);
}

// ─── Generic scroll reveal: [data-reveal] fades/slides up, [data-reveal-group]
//     staggers its direct children — one mechanism reused across sections ─────
function initScrollReveal() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  document.querySelectorAll('[data-reveal]').forEach(el => {
    gsap.set(el, { opacity: 0, y: 36 });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      onEnter:     () => gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }),
      onEnterBack: () => gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }),
    });
  });

  document.querySelectorAll('[data-reveal-group]').forEach(group => {
    const items = Array.from(group.children);
    if (!items.length) return;
    gsap.set(items, { opacity: 0, y: 30 });
    ScrollTrigger.create({
      trigger: group,
      start: 'top 85%',
      onEnter:     () => gsap.to(items, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 }),
      onEnterBack: () => gsap.to(items, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 }),
    });
  });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const isMobile = window.innerWidth <= 768;

  // No GSAP dependency, so these run regardless of whether the CDN below
  // loads — the client wall, its live count, the contact-section avatars,
  // and the FAQ accordion shouldn't depend on it.
  buildClientsCarousel();
  buildContactClientCircles();
  buildHeroTimeline();
  initCreatorCount();
  initFaqAccordion();
  initPricingPlans();
  initCompareSwitch();

  initCSSMarquee();
  initMuteButtons();
  initAutoMute();
  if (typeof gsap !== 'undefined' && typeof Draggable !== 'undefined') {
    gsap.registerPlugin(Draggable, InertiaPlugin, ScrollTrigger);
    ScrollTrigger.config({ limitCallbacks: true, syncInterval: 40 });
    initOsmoSlider();
    initNavScroll(); // must run after initOsmoSlider so slider listeners attach first
    initHeroDesc();
    initSvgParallax();
    initGlassAnimation();
    initClouds();
    initMonkey();
    initContactMonkey();
    initContactFlags();
    initStarParallax();
    initContactFooterAnimations();
    initContactTransition();
    initContactReveal();
    initPerksAnimation();
    initUGCClouds();
    initTrustedAvatars();
    initClientsCarousel();
    initFooterVideoMarquee();
    initSquareVideoCorners();  // no-ops above the mobile breakpoint
    initHeroEntrance();
    initScrollReveal();
    if (!isMobile) {
      initServiceAnimations();
      initStatsAnimations();
    }
  }
});

// Re-measure everything once fonts and images are fully loaded so pin
// spacers and scroll triggers use the correct final layout dimensions.
window.addEventListener('load', () => {
  if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
});
