/* TYMO Yemen — HC100 draft (UNPUBLISHED)
   Everything here is enhancement. The page is complete and usable without this file. */
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var conn = navigator.connection || {};
  var lowEnd = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "") ||
               (navigator.deviceMemory && navigator.deviceMemory < 2);
  /* Weak phone or data saver: keep the essentials, drop the extra motion (see .lite in site.css). */
  if (lowEnd) document.documentElement.classList.add("lite");

  /* Footer popups (الموقع, الدوام): tap to open, tap again / outside / Esc to close; one open at a time. */
  var popBtns = [].slice.call(document.querySelectorAll(".pop-btn"));
  var closePops = function (except) {
    popBtns.forEach(function (b) {
      if (b === except) return;
      b.setAttribute("aria-expanded", "false");
      var p = document.getElementById(b.getAttribute("aria-controls")); if (p) p.hidden = true;
    });
  };
  popBtns.forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      var p = document.getElementById(b.getAttribute("aria-controls")), open = b.getAttribute("aria-expanded") === "true";
      closePops(b);
      b.setAttribute("aria-expanded", open ? "false" : "true"); p.hidden = open;
    });
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".foot-pop")) closePops(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePops(); });

  /* ⓘ tips: tap to show / tap anywhere else to hide (phones have no hover) */
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".rate-info");
    document.querySelectorAll(".rate-info.open").forEach(function (x) { if (x !== b) x.classList.remove("open"); });
    if (b) b.classList.toggle("open");
  });

  /* Customer text from assets/content.js: each [data-text="key"] gets its lines as quiet paragraphs. */
  document.querySelectorAll("[data-text]").forEach(function (el) {
    var v = (window.TYMO_TEXT || {})[el.getAttribute("data-text")];
    (Array.isArray(v) ? v : v ? [v] : []).forEach(function (line) {
      var p = document.createElement("p"); p.setAttribute("dir", "rtl"); p.textContent = line; el.appendChild(p);
    });
  });

  /* Motion helper: one soft, decelerating curve for every programmatic slide (≈ ease-out-quart). */
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 4); };
  var glideTo = function (track, to, ms) {
    var from = track.scrollLeft, t0 = performance.now();
    if (track._glide) cancelAnimationFrame(track._glide);
    track.style.scrollSnapType = "none";
    var f = function (now) {
      var p = Math.min(1, (now - t0) / ms);
      track.scrollLeft = from + (to - from) * easeOut(p);
      if (p < 1) track._glide = requestAnimationFrame(f);
      else { track._glide = 0; track.style.scrollSnapType = ""; }
    };
    track._glide = requestAnimationFrame(f);
  };

  /* ---------- 2. Reveal: plays once, the first time she reaches it. Within a section the
     heading, text and content arrive in order, a beat apart. ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if (!reduce && "IntersectionObserver" in window) {
    reveals.forEach(function (el) {
      var n = 0, p = el.previousElementSibling;
      while (p && p.classList.contains("reveal") && n < 3) { n++; p = p.previousElementSibling; }
      if (n) el.style.setProperty("--d", (n * 0.11) + "s");
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- 2b. Tabs: sliding highlight, soft panel change, arrow keys ---------- */
  document.querySelectorAll("[data-tabs]").forEach(function (box) {
    var list = box.querySelector("[role=tablist]");
    var tabs = [].slice.call(list.querySelectorAll("[role=tab]"));
    var pick = function (i, focus) {
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute("aria-selected", on);
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
        if (on && focus) t.focus();
      });
      list.style.setProperty("--i", i);
    };
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { pick(i); });
      t.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault(); pick((i + 1) % tabs.length, true);
        }
      });
    });
    pick(0);
  });

  /* ---------- 2b'. Hair types: one button each, one before/after slider.
     Only the chosen pair is loaded, and only once the slider is near the screen. ---------- */
  document.querySelectorAll("[data-hair]").forEach(function (box) {
    var list = box.querySelector("[role=tablist]");
    var tabs = [].slice.call(list.querySelectorAll("[role=tab]"));
    var cmp = box.parentNode.querySelector(".compare");
    var before = cmp.querySelector(".before"), after = cmp.querySelector(".after");
    var range = cmp.querySelector(".compare-range");
    var current = 0, near = false;
    var show = function (i) {
      before.style.backgroundImage = "url(" + tabs[i].getAttribute("data-before") + ")";
      after.style.backgroundImage = "url(" + tabs[i].getAttribute("data-after") + ")";
      range.value = 50; cmp.style.setProperty("--x", "50%");
    };
    var pick = function (i, focus) {
      current = i;
      tabs.forEach(function (t, k) {
        t.setAttribute("aria-selected", k === i); t.tabIndex = k === i ? 0 : -1;
        if (k === i && focus) t.focus();
      });
      list.style.setProperty("--i", i);
      if (!near) return;
      if (reduce) { show(i); return; }
      /* Crossfade: load the new pair first, lay a copy of the old pair on top, swap underneath,
         then fade the copy away. No blank moment. */
      var load = function (src) { return new Promise(function (ok) { var im = new Image(); im.onload = im.onerror = ok; im.src = src; }); };
      Promise.all([load(tabs[i].getAttribute("data-before")), load(tabs[i].getAttribute("data-after"))]).then(function () {
        if (current !== i) return;
        var old = cmp.querySelector(".compare-ghost"); if (old) old.remove();
        var ghost = document.createElement("div");
        ghost.className = "compare-ghost"; ghost.setAttribute("aria-hidden", "true");
        ghost.appendChild(before.cloneNode(false)); ghost.appendChild(after.cloneNode(false));
        ghost.style.setProperty("--x", cmp.style.getPropertyValue("--x") || "50%");
        cmp.insertBefore(ghost, range);
        show(i);
        requestAnimationFrame(function () { requestAnimationFrame(function () { ghost.classList.add("out"); }); });
        setTimeout(function () { ghost.remove(); }, 1000);
      });
    };
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { pick(i); });
      t.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") { e.preventDefault(); pick((i + 1) % tabs.length, true); }
        if (e.key === "ArrowRight") { e.preventDefault(); pick((i + tabs.length - 1) % tabs.length, true); }
      });
    });
    var arm = function () { near = true; show(current); };
    if ("IntersectionObserver" in window) {
      var hio = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { arm(); hio.disconnect(); }
      }, { rootMargin: "600px 0px" });
      hio.observe(cmp);
    } else { arm(); }
  });

  /* ---------- 2b''. Videos (3E): play by themselves, muted and looping, only while centred and on screen.
     Our own small controls only: play/pause, a seek bar, mute. No download, no full screen,
     no picture-in-picture, no browser menu (owner, 18 Nov).
     If she pauses a video herself, it stays paused — scrolling or swiping never restarts it.
     Reduce-motion and data-saver: poster until tapped. ---------- */
  var ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 5h3v14h-3zM13.5 5h3v14h-3z"/></svg>',
    muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="ln" d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="ln" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>'
  };
  var makeVideo = function (a) {
    var box = document.createElement("div");
    box.className = "reel-item video slide";
    var v = document.createElement("video");
    v.src = a.getAttribute("href"); v.poster = (a.querySelector("img") || {}).src || "";
    v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.preload = "metadata";
    v.disablePictureInPicture = true; v.disableRemotePlayback = true;
    v.setAttribute("controlsList", "nodownload nofullscreen noremoteplayback noplaybackrate");
    v.setAttribute("aria-label", a.getAttribute("aria-label"));
    v.addEventListener("contextmenu", function (e) { e.preventDefault(); });   /* no "save video" menu */
    var bar = document.createElement("div");
    bar.className = "vc"; bar.setAttribute("dir", "ltr");
    bar.innerHTML = '<button type="button" class="vc-btn vc-play"></button>' +
      '<input class="vc-seek" type="range" min="0" max="1000" value="0" aria-label="تقديم الفيديو">' +
      '<button type="button" class="vc-btn vc-mute"></button>';
    box.appendChild(v); box.appendChild(bar);
    a.replaceWith(box);
    var bPlay = bar.querySelector(".vc-play"), bMute = bar.querySelector(".vc-mute"), seek = bar.querySelector(".vc-seek"), seeking = false;
    var paintBar = function () {
      bPlay.innerHTML = v.paused ? ICON.play : ICON.pause;
      bPlay.setAttribute("aria-label", v.paused ? "تشغيل الفيديو" : "إيقاف الفيديو");
      bMute.innerHTML = v.muted ? ICON.muted : ICON.sound;
      bMute.setAttribute("aria-label", v.muted ? "تشغيل الصوت" : "كتم الصوت");
    };
    v._userPaused = false; v._center = true; v._onScreen = !!(reduce || lowEnd);
    v._sync = function () {
      if (v._userPaused || !v._center || !v._onScreen) { v.pause(); return; }
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    };
    bPlay.addEventListener("click", function () {
      if (v.paused) { v._userPaused = false; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else { v._userPaused = true; v.pause(); }                 /* her choice: stays paused */
    });
    bMute.addEventListener("click", function () { v.muted = !v.muted; });
    seek.addEventListener("input", function () { seeking = true; if (v.duration) v.currentTime = seek.value / 1000 * v.duration; });
    seek.addEventListener("change", function () { seeking = false; });
    v.addEventListener("timeupdate", function () { if (!seeking && v.duration) seek.value = Math.round(v.currentTime / v.duration * 1000); });
    ["play", "pause", "volumechange"].forEach(function (ev) { v.addEventListener(ev, paintBar); });
    /* the controls must not start a strip drag */
    ["pointerdown", "touchstart"].forEach(function (ev) { bar.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
    paintBar();
    return v;
  };
  document.querySelectorAll("[data-video]").forEach(function (a) {
    if (reduce || lowEnd || !("IntersectionObserver" in window)) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var v = makeVideo(a); var p = v.play(); if (p && p.catch) p.catch(function () {});
      });
      return;
    }
    /* plays only while it is the centre video (2e coverflow) AND at least half of it is on screen */
    var player = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target._onScreen = e.isIntersecting && e.intersectionRatio >= 0.5; e.target._sync(); });
    }, { threshold: [0, 0.5] });
    /* first time the strip comes near: swap the poster link for a real video */
    var near = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      near.disconnect();
      player.observe(makeVideo(a));
    }, { rootMargin: "300px 0px" });
    near.observe(a);
  });

  /* ---------- 2b'''. Colour choice tags the Order links (the page works without this) ---------- */
  document.addEventListener("change", function (e) {
    if (e.target.name !== "colour") return;
    var c = e.target.getAttribute("data-code");
    document.querySelectorAll('[data-track="order-click"]').forEach(function (l) { l.setAttribute("data-product", c); });
  });

  /* ---------- 2c. Strips: iPhone-style sliding for finger, mouse, pen and touchpad (same feel everywhere).
     Follows the hand 1:1, keeps gliding after a flick and slows down naturally, settles softly
     on the nearest card, and stretches with resistance at the ends, then springs back.
     Full-width photos (2A, 6A) move exactly one photo per swipe.
     Fingers: horizontal moves are ours (CSS touch-action: pan-y); vertical moves still scroll the page. ---------- */
  document.querySelectorAll(".carousel .track, .creator-row, .soon-grid").forEach(function (s) {
    var rtl = getComputedStyle(s).direction === "rtl";
    var paging = !!s.closest(".gallery, .mini, .reel, .brand-reel");        /* one photo / one video at a time */
    var down = false, moved = false, x0 = 0, l0 = 0, over = 0, samples = [], pid = null, lastX = 0;
    var bounds = function () { var m = s.scrollWidth - s.clientWidth; return rtl ? [-m, 0] : [0, m]; };
    /* Apple's rubber-band curve: the further past the end, the harder it pulls back */
    var band = function (x, w) { return (1 - 1 / ((Math.abs(x) * 0.55 / w) + 1)) * w * (x < 0 ? -1 : 1); };
    var snaps = function () {
      var tr = s.getBoundingClientRect(), pad = parseFloat(getComputedStyle(s).scrollPaddingInlineStart) || 0;
      var sl = s.scrollLeft, b = bounds();
      return [].map.call(s.children, function (c) {
        var r = c.getBoundingClientRect(), t;
        if (getComputedStyle(c).scrollSnapAlign.indexOf("center") > -1) {
          t = sl + ((r.left + r.right) / 2 - (tr.left + tr.right) / 2);      /* centred items (3E coverflow) */
        } else {
          t = rtl ? sl + (r.right - (tr.right - pad)) : sl + (r.left - (tr.left + pad));
        }
        return Math.max(b[0], Math.min(b[1], t));
      });
    };
    s.addEventListener("pointerdown", function (e) {
      /* Fingers are left to the phone's own sliding (runs off the main thread = smooth on real phones).
         18 Nov: handling touch here in JS made sliding lag on real phones. */
      if (e.pointerType === "touch") return;
      if (down || e.button !== 0 || s.scrollWidth <= s.clientWidth + 1) return;
      if (s._glide) { cancelAnimationFrame(s._glide); s._glide = 0; }
      down = true; moved = false; over = 0; x0 = lastX = e.clientX; l0 = s.scrollLeft; pid = e.pointerId;
      samples = [{ t: e.timeStamp, x: e.clientX }];
      s.style.scrollSnapType = "none"; s.style.transition = "none";
      if (e.pointerType !== "touch") e.preventDefault();      /* no image ghost-drag or text selection */
    });
    window.addEventListener("pointermove", function (e) {
      if (!down || e.pointerId !== pid) return;
      lastX = e.clientX;
      var dx = e.clientX - x0;
      if (!moved && Math.abs(dx) > 4) { moved = true; s.classList.add("dragging"); }
      var want = l0 - dx, b = bounds(), at = Math.max(b[0], Math.min(b[1], want));
      s.scrollLeft = at;
      over = want - at;
      s.style.transform = over ? "translate3d(" + (-band(over, s.clientWidth)).toFixed(1) + "px,0,0)" : "";
      samples.push({ t: e.timeStamp, x: e.clientX });
      if (samples.length > 8) samples.shift();
    });
    var release = function (e) {
      if (!down || e.pointerId !== pid) return;
      down = false; s.classList.remove("dragging");
      /* the page took over for a vertical scroll: just settle where we are, no flick */
      var cx = e.type === "pointercancel" ? lastX : e.clientX;
      if (e.type === "pointercancel" && !moved) { s.style.scrollSnapType = ""; s.style.transform = ""; return; }
      if (over) {                                             /* pulled past the end: spring back */
        s.style.transition = "transform .6s cubic-bezier(.22,1,.36,1)";
        s.style.transform = ""; over = 0; s.style.scrollSnapType = "";
        return;
      }
      var now = e.timeStamp, first = samples[0];
      for (var k = samples.length - 1; k >= 0; k--) { if (now - samples[k].t > 100) { first = samples[k]; break; } }
      var v = -(cx - first.x) / Math.max(16, now - first.t);
      var pts = snaps(), best = pts.length ? pts[0] : s.scrollLeft;
      if (paging && pts.length > 1) {
        /* Full-width photos: one photo per swipe, like the iPhone Photos app.
           A short or slow drag springs back; a clear drag or flick moves exactly one photo. */
        var home = 0;
        pts.forEach(function (p, j) { if (Math.abs(p - l0) < Math.abs(pts[home] - l0)) home = j; });
        var moved_ = s.scrollLeft - l0, fwd = (pts[1] - pts[0]) > 0 ? 1 : -1;
        /* light touch: ~10% of the width or a gentle flick is enough (was 18% / 0.35 — felt stiff) */
        var go = (Math.abs(moved_) > s.clientWidth * 0.1 || Math.abs(v) > 0.2) ? ((moved_ || v) * fwd > 0 ? 1 : -1) : 0;
        best = pts[Math.max(0, Math.min(pts.length - 1, home + go))];
        glideTo(s, best, Math.max(380, Math.min(620, Math.abs(best - s.scrollLeft) * 1.6)));
        return;
      }
      /* Card strips: flick speed → a gentle coast → settle on the nearest card there */
      var coast = s.scrollLeft + v * 300;                    /* yesterday's feel — owner liked it (restored 18 Nov) */
      pts.forEach(function (p) { if (Math.abs(p - coast) < Math.abs(best - coast)) best = p; });
      var dist = Math.abs(best - s.scrollLeft);
      glideTo(s, best, Math.max(650, Math.min(1300, 560 + dist * 0.9)));
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    s.addEventListener("click", function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);

    /* Touchpad two-finger swipes.
       2A/6A (full-width photos): left to the browser — its own snapping (scroll-snap-stop) gives one photo per swipe.
       Card strips (3E, 2F, 5B, 9B): iOS feel. Follows the fingers 1:1 including the pad's own coasting,
       stretches with resistance past either end and springs back, then settles softly on the nearest card.
       Never ignores a swipe: every new movement takes over immediately. */
    if (!paging) {
      var wOver = 0, wEnd = 0;
      s.addEventListener("wheel", function (e) {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || s.scrollWidth <= s.clientWidth + 1) return;
        e.preventDefault();
        if (s._glide) { cancelAnimationFrame(s._glide); s._glide = 0; }
        s.style.scrollSnapType = "none"; s.style.transition = "none";
        var dx = e.deltaMode === 1 ? e.deltaX * 32 : e.deltaX, b = bounds();
        if (wOver !== 0) {                                      /* already stretched past an end */
          var prev = wOver; wOver += dx;
          if ((wOver < 0) !== (prev < 0) || wOver === 0) { s.scrollLeft += wOver; wOver = 0; }   /* came back inside */
        } else {
          var want = s.scrollLeft + dx, at = Math.max(b[0], Math.min(b[1], want));
          s.scrollLeft = at; wOver = want - at;
        }
        s.style.transform = wOver ? "translate3d(" + (-band(wOver, s.clientWidth)).toFixed(1) + "px,0,0)" : "";
        clearTimeout(wEnd);
        wEnd = setTimeout(function () {                         /* fingers lifted and coasting ended */
          if (wOver) {
            s.style.transition = "transform .6s cubic-bezier(.22,1,.36,1)";
            s.style.transform = ""; wOver = 0; s.style.scrollSnapType = "";
            return;
          }
          var p = snaps(), best = p.length ? p[0] : s.scrollLeft;
          p.forEach(function (q) { if (Math.abs(q - s.scrollLeft) < Math.abs(best - s.scrollLeft)) best = q; });
          glideTo(s, best, Math.max(500, Math.min(900, 400 + Math.abs(best - s.scrollLeft) * 0.8)));
        }, 140);
      }, { passive: false });
    }
  });

  /* ---------- 2e. 3E coverflow: the centre video is big, the ones beside it shrink to 70% and fade.
     Starts with the first video centred. Only the centre video plays (see 2b''). Tap a side one to centre it. ---------- */
  document.querySelectorAll(".reel .track").forEach(function (s) {
    var SIDE = 0.7, FADE = 0.45;
    var items = function () { return [].slice.call(s.children); };
    var centre = function () {                               /* side padding so the first and last can sit in the middle */
      var first = s.children[0]; if (!first) return;
      var pad = Math.max(0, (s.clientWidth - first.offsetWidth) / 2);
      s.style.paddingInline = pad + "px";
    };
    var paint = function () {
      var tr = s.getBoundingClientRect(), mid = (tr.left + tr.right) / 2, best = null, bestD = 1e9;
      items().forEach(function (it) {
        var r = it.getBoundingClientRect(), w = it.offsetWidth + 8;
        var d = Math.min(1, Math.abs((r.left + r.right) / 2 - mid) / w);
        it.style.transform = reduce ? "" : "scale(" + (1 - (1 - SIDE) * d).toFixed(3) + ")";
        it.style.opacity = (1 - FADE * d).toFixed(3);
        /* (centre shadow tried 18 Nov and removed: the strip clips it — size + fade are enough) */
        if (d < bestD) { bestD = d; best = it; }
      });
      items().forEach(function (it) {
        var on = it === best;
        it.classList.toggle("is-center", on);
        var vid = it.tagName === "VIDEO" ? it : it.querySelector("video");
        if (vid && vid._sync) { vid._center = on; vid._sync(); }
      });
    };
    var tick = 0;
    s.addEventListener("scroll", function () { if (!tick) tick = requestAnimationFrame(function () { tick = 0; paint(); }); }, { passive: true });
    window.addEventListener("resize", function () { centre(); paint(); });
    /* a video replacing its poster link changes the children: repaint */
    new MutationObserver(function () { paint(); }).observe(s, { childList: true });
    /* tap a side item: glide it to the centre instead of opening it */
    s.addEventListener("click", function (e) {
      var it = e.target.closest(".reel-item");
      if (!it || it.classList.contains("is-center")) return;
      e.preventDefault(); e.stopPropagation();
      var tr = s.getBoundingClientRect(), r = it.getBoundingClientRect();
      glideTo(s, s.scrollLeft + ((r.left + r.right) / 2 - (tr.left + tr.right) / 2), 600);
    }, true);
    centre();
    /* start on the second item, so there is something on both sides (owner, 18 Nov) */
    var start = s.children[1] || s.children[0];
    if (start) {
      var tr0 = s.getBoundingClientRect(), r0 = start.getBoundingClientRect();
      s.style.scrollSnapType = "none";
      s.scrollLeft += (r0.left + r0.right) / 2 - (tr0.left + tr0.right) / 2;
      s.offsetWidth; s.style.scrollSnapType = "";
    }
    paint();
  });

  /* ---------- 2f. Slide hint under 3E and 6A: a thin line with a small thumb showing
     where she is — a quiet sign that the strip can be swiped. Updates as it moves. ---------- */
  document.querySelectorAll(".reel .track, .mini .track").forEach(function (s) {
    var real = function () { return [].filter.call(s.children, function (c) { return !c.classList.contains("clone"); }); };
    var n = real().length;
    if (n < 2) return;
    var hint = document.createElement("div");
    hint.className = "slide-hint"; hint.setAttribute("aria-hidden", "true");
    hint.style.setProperty("--n", n);
    hint.appendChild(document.createElement("span"));
    s.parentNode.insertBefore(hint, s.nextSibling);
    var loop = !!s.closest("[data-loop]");
    var update = function () {
      var kids = s.children, step = kids.length > 1 ? Math.abs(kids[1].offsetLeft - kids[0].offsetLeft) : s.clientWidth;
      var tr = s.getBoundingClientRect(), mid = (tr.left + tr.right) / 2, best = 0, bd = 1e9;
      [].forEach.call(kids, function (c, j) { var r = c.getBoundingClientRect(), d = Math.abs((r.left + r.right) / 2 - mid); if (d < bd) { bd = d; best = j; } });
      var i = loop ? ((best % n) + n) % n : Math.min(n - 1, best);
      hint.style.setProperty("--i", i);
    };
    var t = 0;
    s.addEventListener("scroll", function () { if (!t) t = requestAnimationFrame(function () { t = 0; update(); }); }, { passive: true });
    window.addEventListener("resize", update);
    requestAnimationFrame(function () { requestAnimationFrame(update); });
  });

  /* 2d (gliding wheel scroll) removed 17 Nov review: it replaced native scrolling on computers. */

  /* ---------- 3. Sticky dock appears after the hero ---------- */
  var dock = document.querySelector(".dock");
  var hero = document.querySelector(".hero");
  if (dock && hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      dock.classList.toggle("show", !entries[0].isIntersecting);
    }, { threshold: 0.15 }).observe(hero);
  } else if (dock) { dock.classList.add("show"); }

  /* ---------- 4. Before / after slider ---------- */
  document.querySelectorAll(".compare").forEach(function (c) {
    var r = c.querySelector(".compare-range");
    if (!r) return;
    var set = function () { c.style.setProperty("--x", r.value + "%"); };
    r.addEventListener("input", set); set();
    /* One quiet hint, the first time the slider is well in view: the handle glides a little
       each way and comes back. Stops at once if she touches it. Never under reduce-motion. */
    if (reduce || !("IntersectionObserver" in window)) return;
    var touched = false;
    ["pointerdown", "input", "keydown"].forEach(function (ev) { r.addEventListener(ev, function () { touched = true; }); });
    var hint = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      hint.disconnect();
      setTimeout(function () {
        if (touched) return;
        var t0 = performance.now(), D = 2600;
        var f = function (now) {
          if (touched) { set(); return; }
          var p = Math.min(1, (now - t0) / D);
          var e = 0.5 - 0.5 * Math.cos(Math.PI * p);          /* ease in-out */
          c.style.setProperty("--x", (50 + Math.sin(e * Math.PI * 2) * 12).toFixed(2) + "%");
          if (p < 1) requestAnimationFrame(f); else set();
        };
        requestAnimationFrame(f);
      }, 500);
    }, { threshold: 0.6 });
    hint.observe(c);
  });

  /* ---------- 4b. FAQ: answers slide open and closed instead of snapping ---------- */
  if (!reduce && Element.prototype.animate) {
    document.querySelectorAll(".faq details").forEach(function (d) {
      var s = d.querySelector("summary"), anim = null;
      var opts = { duration: 520, easing: "cubic-bezier(.22,1,.36,1)" };
      s.addEventListener("click", function (e) {
        e.preventDefault();
        var start = d.offsetHeight;                           /* measured before cancelling, so a reversal never jumps */
        if (anim) anim.cancel();
        d.style.overflow = "hidden";
        var closing = d.open && !d.classList.contains("closing");
        if (!closing) {
          d.classList.remove("closing");
          d.open = true;
          anim = d.animate({ height: [start + "px", d.offsetHeight + "px"] }, opts);
        } else {
          d.classList.add("closing");
          anim = d.animate({ height: [start + "px", s.offsetHeight + "px"] }, opts);
        }
        var a = anim, done = false;
        var end = function () {
          if (done || anim !== a) return;
          done = true; anim = null;
          if (closing) d.open = false;
          d.style.overflow = ""; d.classList.remove("closing");
        };
        a.onfinish = end;
        /* Safety net: if the phone pauses animations, finish anyway so an answer is never stuck half-open. */
        setTimeout(function () { if (anim === a) { a.cancel(); end(); } }, opts.duration + 200);
      });
    });
  }

  /* ---------- 5. Carousels: native swipe, dots, and autoplay that waits while she touches,
     hovers or focuses it, when it is off screen, when the tab is hidden, and never under reduce-motion. ---------- */
  /* Pause / play button for any carousel that moves by itself (WCAG 2.2.2). */
  var addPause = function (c) {
    var state = { stopped: false };
    var pb = document.createElement("button");
    pb.type = "button"; pb.className = "auto-toggle";
    var label = function () {
      pb.setAttribute("aria-label", state.stopped ? "تشغيل الصور" : "إيقاف الصور");
      pb.setAttribute("aria-pressed", state.stopped ? "true" : "false");
    };
    label();
    pb.addEventListener("click", function () { state.stopped = !state.stopped; label(); });
    c.appendChild(pb);
    return state;
  };

  /* Opening banner: photos crossfade with a slow, settling zoom instead of sliding sideways.
     Swipe and dots still work. Weak phones and reduce-motion keep the plain sliding banner. */
  var fadeBanner = function (c) {
    var track = c.querySelector(".track");
    var slides = [].slice.call(track.children);
    var dots = [].slice.call(c.querySelectorAll(".dots [role=tab]"));
    var n = slides.length, i = 0, last = Date.now(), visible = true;
    c.classList.add("fade");
    var show = function (k) {
      last = Date.now();                                      /* each photo gets its full time, even after a swipe */
      var prev = slides[i];
      i = ((k % n) + n) % n;
      if (prev !== slides[i]) {
        prev.classList.add("was");
        setTimeout(function () { prev.classList.remove("was"); }, 1900);
      }
      slides.forEach(function (s, j) {
        s.classList.toggle("is-on", j === i);
        s.setAttribute("aria-hidden", j === i ? "false" : "true");
      });
      dots.forEach(function (d, j) { d.setAttribute("aria-selected", j === i ? "true" : "false"); });
      var next = slides[(i + 1) % n].querySelector("img");
      if (next) next.loading = "eager";                      /* the next photo is ready before its turn */
    };
    /* Touching, swiping, hovering or tapping a dot never stops the slideshow (owner's choice, 17 Nov).
       A swipe or dot just restarts the timer from that photo. Only the pause button stops it. */
    dots.forEach(function (d, j) { d.addEventListener("click", function () { show(j); }); });
    var x0 = null;
    track.addEventListener("pointerdown", function (e) { x0 = e.clientX; });
    track.addEventListener("pointerup", function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) show(i + (dx > 0 ? 1 : -1));    /* RTL: drag right = next */
    });
    show(0);
    var ms = +c.getAttribute("data-auto");
    if (!ms) return;
    var pause = addPause(c);
    if ("IntersectionObserver" in window)
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0.35 }).observe(c);
    setInterval(function () {
      if (pause.stopped || !visible || document.hidden || Date.now() - last < ms) return;
      show(i + 1);
    }, 250);
  };

  document.querySelectorAll(".carousel").forEach(function (c) {
    var track = c.querySelector(".track");
    if (!track) return;
    if (c.classList.contains("banner") && !reduce && !lowEnd) { fadeBanner(c); return; }
    var orig = [].slice.call(track.children);
    var n = orig.length;
    var loop = c.hasAttribute("data-loop") && n > 1;
    if (loop) {
      /* Endless loop: one copy of the slides before and after the real ones. When she stops
         on a copy, the view jumps silently to the same picture in the real set — never rewinds. */
      var mk = function (s) { var k = s.cloneNode(true); k.setAttribute("aria-hidden", "true"); k.classList.add("clone");
        [].forEach.call(k.querySelectorAll("img"), function (im) { im.removeAttribute("loading"); im.alt = ""; }); return k; };
      orig.forEach(function (s) { track.appendChild(mk(s)); });
      for (var q = n - 1; q >= 0; q--) track.insertBefore(mk(orig[q]), track.firstChild);
    }
    var slides = [].slice.call(track.children);
    var dots = [].slice.call(c.querySelectorAll(".dots [role=tab]"));
    var rtl = getComputedStyle(track).direction === "rtl";
    var sign = rtl ? -1 : 1;
    var held = 0;
    var hold = function () { held = Date.now() + 6000; };
    var step = function () {
      return slides.length > 1 ? Math.abs(slides[1].offsetLeft - slides[0].offsetLeft) : track.clientWidth;
    };
    var idx = function () { return Math.round(Math.abs(track.scrollLeft) / step()); };
    var last = function () { return Math.max(0, Math.round((track.scrollWidth - track.clientWidth) / step())); };
    var jump = function (i) {
      track.style.scrollSnapType = "none"; track.style.scrollBehavior = "auto";
      track.scrollLeft = sign * i * step();
      track.offsetWidth;
      track.style.scrollSnapType = ""; track.style.scrollBehavior = "";
    };
    var go = function (i) {
      if (reduce) { jump(i); return; }
      glideTo(track, sign * i * step(), 1100);                /* slow, soft glide instead of the browser's quick scroll */
    };
    var mark = function () {
      var i = idx(), real = loop ? ((i % n) + n) % n : i;
      dots.forEach(function (d, k) { d.setAttribute("aria-selected", k === real ? "true" : "false"); });
      slides.forEach(function (s, k) { s.classList.toggle("is-on", k === i); });
    };
    if (loop) {
      requestAnimationFrame(function () { jump(n); mark(); });
      window.addEventListener("resize", function () { jump(n + (((idx() % n) + n) % n)); });
    }
    var tick = 0, settle = 0;
    track.addEventListener("scroll", function () {
      if (!tick) tick = requestAnimationFrame(function () { tick = 0; mark(); });
      if (loop) {
        clearTimeout(settle);
        settle = setTimeout(function () {
          var i = idx();
          if (i < n) jump(i + n); else if (i >= 2 * n) jump(i - n);
        }, 140);
      }
    }, { passive: true });
    dots.forEach(function (d, k) { d.addEventListener("click", function () { hold(); go(loop ? n + k : k); }); });
    mark();
    var ms = +c.getAttribute("data-auto");
    if (!ms || reduce || !("IntersectionObserver" in window)) return;
    var visible = false;
    var pause = addPause(c);
    ["pointerdown", "touchstart", "wheel", "focusin", "keydown"].forEach(function (ev) {
      track.addEventListener(ev, hold, { passive: true });
    });
    c.addEventListener("mouseenter", function () { held = Infinity; });
    c.addEventListener("mouseleave", function () { held = Date.now() + 1500; });
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0.35 }).observe(c);
    setInterval(function () {
      if (pause.stopped || !visible || document.hidden || Date.now() < held) return;
      var i = idx() + 1;
      go(loop ? i : (i > last() ? 0 : i));
    }, ms);
  });

  /* ---------- 6. Scroll motion: the pink glow sways with the page (bounded), and the opening
     photos move a little slower than the page. Transform only; one frame per scroll. ---------- */
  if (!reduce && !lowEnd) {
    var glow = document.querySelector(".page-glow");
    var px = [].slice.call(document.querySelectorAll("[data-parallax]"));
    var ticking = false;
    var frame = function () {
      ticking = false;
      var y = window.scrollY, vh = window.innerHeight;
      if (glow) glow.style.transform = "translate3d(0," + (Math.sin(y / 700) * 48).toFixed(1) + "px,0)";
      for (var i = 0; i < px.length; i++) {
        var r = px[i].parentNode.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        px[i].style.setProperty("--py", (Math.min(y, vh) * 0.08).toFixed(1) + "px");
      }
    };
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }, { passive: true });
    frame();
  }
})();
