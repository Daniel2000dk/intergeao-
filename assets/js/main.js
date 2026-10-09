(function () {
  "use strict";

  /* ---------- Mobiel menu ---------- */
  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    var mq = window.matchMedia("(max-width: 940px)");
    var setNav = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      nav.setAttribute("data-open", String(open));
    };
    var syncNav = function () { if (mq.matches) setNav(false); else nav.removeAttribute("data-open"); };
    syncNav();
    mq.addEventListener("change", syncNav);
    toggle.addEventListener("click", function () {
      setNav(toggle.getAttribute("aria-expanded") !== "true");
    });
  }

  /* ---------- Hoogtelijnen in de hero (alleen homepage) ---------- */
  var canvas = document.getElementById("hero-contours");
  if (canvas && canvas.getContext) {
    var hero = canvas.parentElement;
    var ctx = canvas.getContext("2d");

    var field = function (x, y) {
      var h = 0;
      h += 60 * Math.exp(-((x - 0.8) * (x - 0.8) + (y - 0.35) * (y - 0.35)) / 0.05);
      h += 38 * Math.exp(-((x - 0.58) * (x - 0.58) + (y - 0.95) * (y - 0.95)) / 0.04);
      h -= 22 * Math.exp(-((x - 0.25) * (x - 0.25) + (y - 0.6) * (y - 0.6)) / 0.08);
      h += 8 * Math.sin(x * 7.1 + y * 2.3) + 5 * Math.cos(y * 9.4 - x * 3.2);
      return h + 18 * x;
    };

    var draw = function () {
      var rect = hero.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var W = Math.max(1, Math.round(rect.width)), H = Math.max(1, Math.round(rect.height));
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      var cell = 10, cols = Math.ceil(W / cell) + 1, rows = Math.ceil(H / cell) + 1;
      var v = new Float32Array(cols * rows), i, j;
      for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) v[j * cols + i] = field(i * cell / W, j * cell / H);

      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--contour").trim();
      for (var level = -40, n = 0; level <= 100; level += 4, n++) {
        ctx.beginPath();
        for (j = 0; j < rows - 1; j++) {
          for (i = 0; i < cols - 1; i++) {
            var a = v[j * cols + i], b = v[j * cols + i + 1], c = v[(j + 1) * cols + i + 1], d = v[(j + 1) * cols + i];
            var code = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
            if (code === 0 || code === 15) continue;
            var x = i * cell, y = j * cell;
            var T = [x + cell * (level - a) / (b - a), y], R = [x + cell, y + cell * (level - b) / (c - b)];
            var B = [x + cell * (level - d) / (c - d), y + cell], L = [x, y + cell * (level - a) / (d - a)];
            var s = { 1: [L, B], 14: [L, B], 2: [B, R], 13: [B, R], 3: [L, R], 12: [L, R], 4: [T, R], 11: [T, R],
                      6: [T, B], 9: [T, B], 7: [L, T], 8: [L, T], 5: [L, T, B, R], 10: [L, B, T, R] }[code];
            for (var k = 0; k < s.length; k += 2) { ctx.moveTo(s[k][0], s[k][1]); ctx.lineTo(s[k + 1][0], s[k + 1][1]); }
          }
        }
        ctx.lineWidth = n % 5 === 0 ? 1.6 : 0.8; // elke vijfde lijn dikker, zoals op een topografische kaart
        ctx.stroke();
      }
    };

    var t;
    window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(draw, 150); });
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
    draw();
  }

  /* ---------- Contactformulier: opent het e-mailprogramma met een ingevuld bericht ---------- */
  var form = document.getElementById("contact-form");
  if (form) {
    var error = document.getElementById("form-error");
    var select = document.getElementById("f-soort");
    var preset = new URLSearchParams(window.location.search).get("onderwerp");
    if (preset) {
      for (var o = 0; o < select.options.length; o++) {
        if (select.options[o].text === preset) select.selectedIndex = o;
      }
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var naam = String(data.get("naam") || "").trim();
      var email = String(data.get("email") || "").trim();
      var bericht = String(data.get("bericht") || "").trim();

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
  }
})();
