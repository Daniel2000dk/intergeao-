(function () {
  "use strict";

  /* ---------- Mobile navigation ---------- */
  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("site-nav");
  var mq = window.matchMedia("(max-width: 940px)");

  function setNav(open) {
    toggle.setAttribute("aria-expanded", String(open));
    nav.setAttribute("data-open", String(open));
  }
  function syncNav() { if (mq.matches) setNav(false); else nav.removeAttribute("data-open"); }
  syncNav();
  mq.addEventListener("change", syncNav);
  toggle.addEventListener("click", function () {
    setNav(toggle.getAttribute("aria-expanded") !== "true");
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a") && mq.matches) setNav(false);
  });

  /* ---------- Hero contour map with survey reticle ---------- */
  var canvas = document.getElementById("hero-contours");
  var hero = canvas && canvas.parentElement;
  var readout = document.getElementById("readout");
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext("2d");
  var base = document.createElement("canvas");
  var bctx = base.getContext("2d");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W = 0, H = 0, dpr = 1;
  var pointer = null;

  // Office position in Rijksdriehoeksstelsel; 1 css px on the map = 0.5 m.
  var RD_X = 131378, RD_Y = 453925, M_PER_PX = 0.5;

  function field(x, y) {
    // Smooth synthetic terrain: two hills, a valley and a gentle slope.
    var h = 0;
    h += 60 * Math.exp(-((x - 0.78) * (x - 0.78) + (y - 0.35) * (y - 0.35)) / 0.05);
    h += 38 * Math.exp(-((x - 0.55) * (x - 0.55) + (y - 0.95) * (y - 0.95)) / 0.04);
    h -= 22 * Math.exp(-((x - 0.25) * (x - 0.25) + (y - 0.6) * (y - 0.6)) / 0.08);
    h += 8 * Math.sin(x * 7.1 + y * 2.3) + 5 * Math.cos(y * 9.4 - x * 3.2);
    h += 18 * x;
    return h;
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function drawContours() {
    var rect = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    canvas.width = base.width = W * dpr;
    canvas.height = base.height = H * dpr;
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.clearRect(0, 0, W, H);

    var cell = 10;
    var cols = Math.ceil(W / cell) + 1, rows = Math.ceil(H / cell) + 1;
    var v = new Float32Array(cols * rows);
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        v[j * cols + i] = field(i * cell / W, j * cell / H);
      }
    }

    var color = cssVar("--contour");
    var step = 4;
    for (var level = -40; level <= 100; level += step) {
      var index = Math.round(level / step) % 5 === 0;
      bctx.beginPath();
      for (j = 0; j < rows - 1; j++) {
        for (i = 0; i < cols - 1; i++) {
          var a = v[j * cols + i], b = v[j * cols + i + 1];
          var c = v[(j + 1) * cols + i + 1], d = v[(j + 1) * cols + i];
          var code = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
          if (code === 0 || code === 15) continue;
          var x = i * cell, y = j * cell;
          var top = [x + cell * (level - a) / (b - a), y];
          var right = [x + cell, y + cell * (level - b) / (c - b)];
          var bottom = [x + cell * (level - d) / (c - d), y + cell];
          var left = [x, y + cell * (level - a) / (d - a)];
          var segs;
          switch (code) {
            case 1: case 14: segs = [left, bottom]; break;
            case 2: case 13: segs = [bottom, right]; break;
            case 3: case 12: segs = [left, right]; break;
            case 4: case 11: segs = [top, right]; break;
            case 6: case 9: segs = [top, bottom]; break;
            case 7: case 8: segs = [left, top]; break;
            case 5: segs = [left, top, bottom, right]; break;
            case 10: segs = [left, bottom, top, right]; break;
          }
          for (var s = 0; s < segs.length; s += 2) {
            bctx.moveTo(segs[s][0], segs[s][1]);
            bctx.lineTo(segs[s + 1][0], segs[s + 1][1]);
          }
        }
      }
      bctx.strokeStyle = color;
      bctx.lineWidth = index ? 1.6 : 0.8; // index contours every fifth line, as on a topographic map
      bctx.stroke();
    }
    render();
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    if (!pointer) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var x = pointer.x, y = pointer.y, r = 22;
    ctx.strokeStyle = cssVar("--signal");
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.moveTo(x - r - 14, y); ctx.lineTo(x - 6, y);
    ctx.moveTo(x + 6, y); ctx.lineTo(x + r + 14, y);
    ctx.moveTo(x, y - r - 14); ctx.lineTo(x, y - 6);
    ctx.moveTo(x, y + 6); ctx.lineTo(x, y + r + 14);
    ctx.stroke();
  }

  function fmt(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    hero.addEventListener("pointermove", function (e) {
      var rect = hero.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      var dx = (pointer.x - W / 2) * M_PER_PX, dy = (H / 2 - pointer.y) * M_PER_PX;
      readout.textContent = "X " + fmt(RD_X + dx) + "   Y " + fmt(RD_Y + dy);
      requestAnimationFrame(render);
    });
    hero.addEventListener("pointerleave", function () {
      pointer = null;
      readout.textContent = "X " + fmt(RD_X) + "   Y " + fmt(RD_Y);
      requestAnimationFrame(render);
    });
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(drawContours, 150);
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", drawContours);
  drawContours();
})();

/* ---------- Contact form: opens the visitor's mail client with a filled-in message ---------- */
(function () {
  "use strict";
  var form = document.getElementById("contact-form");
  var error = document.getElementById("form-error");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var data = new FormData(form);
    var naam = (data.get("naam") || "").trim();
    var email = (data.get("email") || "").trim();
    var bericht = (data.get("bericht") || "").trim();

    var missing = [];
    if (!naam) missing.push("uw naam");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) missing.push("een geldig e-mailadres");
    if (!bericht) missing.push("uw vraag");
    if (missing.length) {
      error.textContent = "Vul nog " + missing.join(", ").replace(/, ([^,]*)$/, " en $1") + " in.";
      error.hidden = false;
      return;
    }
    error.hidden = true;

    var body = [
      "Naam: " + naam,
      "Bedrijf: " + (data.get("bedrijf") || "-"),
      "E-mail: " + email,
      "Telefoon: " + (data.get("telefoon") || "-"),
      "Onderwerp: " + data.get("soort"),
      "",
      bericht
    ].join("\n");
    window.location.href = "mailto:info@intergeo.nl?subject=" +
      encodeURIComponent("Aanvraag: " + data.get("soort")) +
      "&body=" + encodeURIComponent(body);
  });
})();
