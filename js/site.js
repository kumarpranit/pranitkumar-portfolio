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

/* Hero particle network: drifting dots joined by lines. Pauses when the hero
   is off-screen or the tab is hidden, and is skipped for reduced-motion users. */
(function () {
  var canvas = document.getElementById("hero-canvas");
  var hero = document.querySelector(".hero");
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!canvas || !hero || reduced || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, parts = [], visible = true, rafId = null;
  var resize = function () {
    var r = hero.getBoundingClientRect();
    W = canvas.width = Math.floor(r.width);
    H = canvas.height = Math.floor(r.height);
    var n = Math.max(40, Math.min(110, Math.floor(W * H / 13000)));
    parts = [];
    for (var i = 0; i < n; i++) {
      parts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .5, vy: (Math.random() - .5) * .5, r: Math.random() * 2 + 1.1 });
    }
  };
  var frame = function () {
    if (!visible || document.hidden) { rafId = null; return; }
    ctx.clearRect(0, 0, W, H);
    var i, j, p, q, dx, dy, d;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fillStyle = "rgba(47,230,167,.75)"; ctx.fill();
    }
    for (i = 0; i < parts.length; i++) for (j = i + 1; j < parts.length; j++) {
      p = parts[i]; q = parts[j]; dx = p.x - q.x; dy = p.y - q.y; d = Math.sqrt(dx * dx + dy * dy);
      if (d < 140) {
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
        ctx.strokeStyle = "rgba(47,230,167," + (0.28 * (1 - d / 140)).toFixed(3) + ")";
        ctx.lineWidth = 1.1; ctx.stroke();
      }
    }
    rafId = window.requestAnimationFrame(frame);
  };
  var start = function () { if (!rafId) rafId = window.requestAnimationFrame(frame); };
  resize(); start();
  window.addEventListener("resize", resize);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible = e.isIntersecting; if (visible) start(); });
    }, { threshold: 0 }).observe(hero);
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) start(); });
})();
