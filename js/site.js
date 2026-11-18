/* pranitkumar.net — shared script for every page.

   Visitor notification beacon (unchanged behavior from the previous site):
   IP-based location only, no browser Geolocation API, no permission prompt.
   Posts once per browser session to the visit-notify Netlify function,
   which emails the site owner. Fails silently and never affects the page. */
var VISIT_NOTIFY_ENDPOINT = "/.netlify/functions/visit-notify";
(function () {
  try {
    if (sessionStorage.getItem("pk_visit_notified")) return;
    sessionStorage.setItem("pk_visit_notified", "1");
    fetch("https://ipapi.co/json/")
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; })
      .then(function (geo) {
        geo = geo || {};
        var payload = {
          timestamp: new Date().toISOString(),
          pageUrl: window.location.href,
          referrer: document.referrer || "",
          userAgent: navigator.userAgent || "",
          ip: geo.ip || "",
          country: geo.country_name || geo.country || "",
          region: geo.region || "",
          city: geo.city || ""
        };
        return fetch(VISIT_NOTIFY_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true
        });
      })
      .catch(function () { /* silent */ });
  } catch (e) { /* silent */ }
})();

/* Hero star field. Stars drift and twinkle, then gather into a bar chart,
   then a trend line, before dissolving back into the sky. Two meshed gears
   turn continuously beside the portrait. Pauses when
   the hero is off-screen or the tab is hidden; reduced-motion users get a
   still star field. */
(function () {
  var canvas = document.getElementById("hero-canvas");
  var hero = document.querySelector(".hero");
  if (!canvas || !hero || !canvas.getContext) return;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, dpr = 1, stars = [], region = null, visible = true, rafId = null, t0 = 0;
  var COLORS = ["255,255,255", "255,255,255", "255,255,255", "190,215,255", "255,214,150", "255,176,96"];
  var SHAPES = ["bars", "line"];
  var gears = [];
  var HOLD_SKY = 4200, MORPH = 1700, HOLD_SHAPE = 3600, CYCLE = HOLD_SKY + MORPH + HOLD_SHAPE + MORPH;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function gauss() { return (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2; }
  function ease(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

  function shapeRegion() {
    var hr = hero.getBoundingClientRect();
    var fig = hero.querySelector(".hero-figure");
    if (fig && W > 860) {
      /* The portrait sits in a small frame. Charts form in the space under
         the frame, and the gears turn beside its top corner. */
      var img = fig.querySelector("img") || fig, r = img.getBoundingClientRect();
      var fx = r.left - hr.left, fy = r.top - hr.top;
      var led = hero.querySelector(".ledger"), ledTop = led ? led.getBoundingClientRect().top - hr.top : H;
      var x1 = Math.min(W - 24, fx + r.width + 10), x0 = Math.max(W * .5, x1 - Math.max(r.width + 70, 300));
      var y0 = fy + r.height + 30, y1 = Math.max(y0 + 60, Math.min(y0 + 170, ledTop - 34));
      var R1 = 40, R2 = R1 * 8 / 12, tip = R1 * .13 + 4, gy = fy + 58;
      var gxR = fx + r.width + R1 + tip + 16;
      if (gxR + (R1 + R2) * Math.cos(.87) + R2 + tip <= W - 14) setGears(gxR, gy, R1, .87);
      else setGears(fx - R1 - tip - 16, gy, R1, 2.35);
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    }
    setGears(W - 60, 46, 23, 2.45);
    return { x: W * .48, y: 104, w: W * .46, h: 100 };
  }

  /* Two meshed gears: 12 and 8 teeth, pitch radii in the same ratio. */
  function setGears(cx, cy, R1, phi) {
    var R2 = R1 * 8 / 12;
    gears = [
      { cx: cx, cy: cy, R: R1, n: 12, phi: phi },
      { cx: cx + (R1 + R2) * Math.cos(phi), cy: cy + (R1 + R2) * Math.sin(phi), R: R2, n: 8, phi: phi }
    ];
  }

  function gearRadius(g, a, depth) {
    var u = ((a * g.n / 6.2832) % 1 + 1) % 1;           /* position within one tooth */
    var k = u < .12 ? u / .12 : u < .5 ? 1 : u < .62 ? 1 - (u - .5) / .12 : 0;
    return g.R - depth / 2 + depth * k;
  }

  function drawGears(sec) {
    if (!gears.length) return;
    var big = gears[0], small = gears[1], depth = big.R * .26;
    var rot1 = reduced ? 0 : sec * .35;
    /* opposite direction, speed scaled by the tooth ratio, phased so teeth interleave */
    var rot2 = Math.PI + big.phi - (rot1 - big.phi) * big.n / small.n + Math.PI / small.n;
    var set = [[big, rot1], [small, rot2]];
    for (var gi = 0; gi < 2; gi++) {
      var g = set[gi][0], rot = set[gi][1], steps = g.n * 24, i, a, rr;
      ctx.beginPath();
      for (i = 0; i <= steps; i++) {
        a = i / steps * 6.2832; rr = gearRadius(g, a, depth);
        var px = g.cx + Math.cos(a + rot) * rr, py = g.cy + Math.sin(a + rot) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(190,215,255,.08)"; ctx.fill();
      ctx.strokeStyle = "rgba(210,228,255,.5)"; ctx.lineWidth = 1; ctx.stroke();
      /* star dots along the outline */
      for (i = 0; i < steps; i += 2) {
        a = i / steps * 6.2832; rr = gearRadius(g, a, depth);
        var tw = .6 + .4 * Math.sin(sec * 1.7 + i * 1.9 + gi);
        ctx.fillStyle = (i % 10 === 0 ? "rgba(255,255,255," : "rgba(255,214,150,") + tw.toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(g.cx + Math.cos(a + rot) * rr, g.cy + Math.sin(a + rot) * rr, i % 10 === 0 ? 1.5 : 1, 0, 6.2832); ctx.fill();
      }
      /* hub and spokes */
      ctx.strokeStyle = "rgba(210,228,255,.55)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R * .32, 0, 6.2832); ctx.stroke();
      ctx.beginPath(); ctx.arc(g.cx, g.cy, g.R * .62, 0, 6.2832); ctx.strokeStyle = "rgba(210,228,255,.26)"; ctx.stroke();
      var spokes = gi === 0 ? 6 : 4;
      ctx.strokeStyle = "rgba(210,228,255,.36)";
      for (i = 0; i < spokes; i++) {
        a = rot + i / spokes * 6.2832;
        ctx.beginPath();
        ctx.moveTo(g.cx + Math.cos(a) * g.R * .32, g.cy + Math.sin(a) * g.R * .32);
        ctx.lineTo(g.cx + Math.cos(a) * g.R * .62, g.cy + Math.sin(a) * g.R * .62);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.beginPath(); ctx.arc(g.cx, g.cy, 1.8, 0, 6.2832); ctx.fill();
    }
  }

  function targetFor(shape, i, n) {
    var R = region, u = Math.random(), v = Math.random();
    if (shape === "bars") {
      var heights = [.28, .44, .38, .6, .52, .8, 1], total = 0, k;
      for (k = 0; k < heights.length; k++) total += heights[k];
      var pick = u * total, b = 0;
      while (b < heights.length - 1 && pick > heights[b]) { pick -= heights[b]; b++; }
      var slot = R.w / heights.length, bw = slot * .5;
      return { x: R.x + b * slot + (slot - bw) / 2 + v * bw, y: R.y + R.h - Math.random() * heights[b] * R.h };
    }
    if (shape === "line") {
      var pts = [[0, .78], [.18, .6], [.36, .68], [.56, .4], [.76, .46], [1, .1]];
      if (i % 5 === 0) {
        var q = pts[Math.floor(Math.random() * pts.length)];
        return { x: R.x + q[0] * R.w + gauss() * 7, y: R.y + q[1] * R.h + gauss() * 7 };
      }
      if (i % 9 === 1) return { x: R.x + u * R.w, y: R.y + R.h + gauss() * 1.5 };
      var seg = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1))), f = u * (pts.length - 1) - seg;
      return { x: R.x + (pts[seg][0] + (pts[seg + 1][0] - pts[seg][0]) * f) * R.w + gauss() * 3,
               y: R.y + (pts[seg][1] + (pts[seg + 1][1] - pts[seg][1]) * f) * R.h + gauss() * 3 };
    }
    return { x: R.x + u * R.w, y: R.y + v * R.h };
  }

  function build() {
    var r = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.floor(r.width); H = Math.floor(r.height);
    canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    region = shapeRegion();
    var n = Math.max(320, Math.min(1300, Math.floor(W * H / 1100)));
    var skyH = H - 8, ccx = region.x + region.w * .5, ccy = region.y + region.h * .1;
    stars = [];
    for (var i = 0; i < n; i++) {
      var inCluster = i < n * .62, s = {};
      if (inCluster) { s.hx = ccx + gauss() * region.w * .7; s.hy = ccy + gauss() * region.h * 1.3; }
      else { s.hx = Math.random() * W; s.hy = Math.random() * skyH; }
      s.hy = Math.max(4, Math.min(skyH, s.hy));
      s.join = inCluster;
      s.r = Math.random() < .1 ? rnd(1.6, 2.5) : rnd(.6, 1.4);
      s.a = rnd(.45, 1); s.tw = rnd(.4, 1.6); s.ph = rnd(0, 6.28);
      s.dx = rnd(4, 14); s.dy = rnd(4, 14); s.sp = rnd(.05, .16); s.depth = rnd(.02, .1);
      s.c = COLORS[Math.floor(Math.random() * COLORS.length)];
      s.delay = Math.random() * .35;
      s.t = {};
      if (s.join) for (var k = 0; k < SHAPES.length; k++) s.t[SHAPES[k]] = targetFor(SHAPES[k], i, n);
      stars.push(s);
    }
  }

  function draw(now) {
    var t = Math.max(0, now - t0), cyc = Math.floor(t / CYCLE), local = t - cyc * CYCLE;
    var shape = SHAPES[cyc % SHAPES.length], p = 0;
    if (local > HOLD_SKY) p = Math.min(1, (local - HOLD_SKY) / MORPH);
    if (local > HOLD_SKY + MORPH + HOLD_SHAPE) p = 1 - Math.min(1, (local - HOLD_SKY - MORPH - HOLD_SHAPE) / MORPH);
    if (reduced) p = 0;
    var sec = now / 1000, scroll = window.pageYOffset || 0;
    ctx.clearRect(0, 0, W, H);
    var face = region.face;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var x = s.hx + Math.sin(sec * s.sp + s.ph) * s.dx;
      var y = s.hy + Math.cos(sec * s.sp * .8 + s.ph) * s.dy - scroll * s.depth;
      var alpha = s.a * (.62 + .38 * Math.sin(sec * s.tw + s.ph)), rad = s.r;
      if (s.join && p > 0) {
        var q = ease(Math.max(0, Math.min(1, (p - s.delay * (1 - p)) / (1 - s.delay * (1 - p)))));
        var tg = s.t[shape];
        x += (tg.x + Math.sin(sec * 1.3 + s.ph) * 1.2 - x) * q;
        y += (tg.y + Math.cos(sec * 1.1 + s.ph) * 1.2 - y) * q;
        alpha = Math.min(1, alpha + .45 * q); rad = s.r * (1 + .35 * q);
      }
      if (y < -4 || y > H + 4) continue;
      if (face) { var ex = (x - face.cx) / face.rx, ey = (y - face.cy) / face.ry; if (ex * ex + ey * ey < 1) continue; }
      ctx.fillStyle = "rgba(" + s.c + "," + alpha.toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.2832); ctx.fill();
    }
    drawGears(sec);
  }

  function frame(now) {
    if (!visible || document.hidden) { rafId = null; return; }
    draw(now);
    rafId = window.requestAnimationFrame(frame);
  }
  function start() { if (!rafId && !reduced) rafId = window.requestAnimationFrame(frame); }

  build(); t0 = performance.now();
  if (reduced) { draw(t0); } else { start(); }
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { build(); if (reduced) draw(performance.now()); }, 150);
  });
  window.addEventListener("load", function () { build(); if (reduced) draw(performance.now()); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible = e.isIntersecting; if (visible) start(); });
    }, { threshold: 0 }).observe(hero);
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) start(); });
})();
