// Genereert alle HTML-pagina's, sitemap.xml en robots.txt in de projectmap.
// Gebruik: node scripts/build.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, SERVICES, PROJECTS, CLIENTS } from "./content.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TODAY = new Date().toISOString().slice(0, 10);
const written = [];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const service = (slug) => SERVICES.find((s) => s.slug === slug);
const project = (slug) => PROJECTS.find((p) => p.slug === slug);

/* ---------- Structured data ---------- */
const ORG_ID = SITE.url + "/#organisatie";
const orgSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": ORG_ID,
  name: SITE.name,
  legalName: SITE.legalName,
  url: SITE.url + "/",
  logo: SITE.url + "/assets/img/favicon.svg",
  image: SITE.url + SITE.ogImage,
  telephone: SITE.phoneIntl,
  email: SITE.email,
  foundingDate: SITE.founded,
  description: "Landmeetkundig bureau voor maatvoering, detailmetingen, deformatiemetingen, waterpassingen, DTM-metingen en industriële metingen.",
  address: {
    "@type": "PostalAddress",
    streetAddress: SITE.street,
    postalCode: SITE.postcode,
    addressLocality: SITE.city,
    addressRegion: "Utrecht",
    addressCountry: "NL",
  },
  geo: { "@type": "GeoCoordinates", latitude: SITE.lat, longitude: SITE.lng },
  areaServed: { "@type": "Country", name: "Nederland" },
  knowsAbout: SERVICES.map((s) => s.name),
};

function breadcrumbSchema(crumbs) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: SITE.url + path,
    })),
  };
}

/* ---------- Layout ---------- */
const NAV = [
  ["Diensten", "/diensten"],
  ["Voor aannemers", "/voor-aannemers"],
  ["Projecten", "/projecten"],
  ["Over ons", "/over-ons"],
  ["Werken bij", "/werken-bij"],
];

function header(path) {
  const links = NAV.map(([label, href]) => {
    const current = path === href || path.startsWith(href + "/");
    return `<a href="${href}"${current ? ' aria-current="page"' : ""}>${label}</a>`;
  }).join("\n        ");
  return `<header class="site-header">
    <div class="wrap header-inner">
      <a class="brand" href="/" aria-label="${SITE.name}, naar de homepage">
        <svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r="13" fill="none" stroke="currentColor" stroke-width="2.5"/>
          <path d="M20 2v12M20 26v12M2 20h12M26 20h12" stroke="currentColor" stroke-width="2.5"/>
          <circle cx="20" cy="20" r="3" fill="var(--orange)"/>
        </svg>
        <span class="brand-name">Intergeo<small>landmeetkunde</small></span>
      </a>
      <button class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="site-nav">
        <span class="nav-toggle-bars" aria-hidden="true"></span>
        <span>Menu</span>
      </button>
      <nav class="site-nav" id="site-nav" aria-label="Hoofdmenu">
        ${links}
        <a class="btn btn-small" href="/contact"${path === "/contact" ? ' aria-current="page"' : ""}>Contact</a>
      </nav>
    </div>
  </header>`;
}

function footer() {
  const serviceLinks = SERVICES.map((s) => `<li><a href="/diensten/${s.slug}">${s.name}</a></li>`).join("");
  return `<footer class="site-footer">
    <div class="wrap footer-grid">
      <div class="footer-col">
        <p class="footer-brand">${SITE.name}</p>
        <address>
          ${SITE.street}<br>${SITE.postcode} ${SITE.city}<br>
          <a href="tel:${SITE.phoneIntl}">${SITE.phone}</a><br>
          <a href="mailto:${SITE.email}">${SITE.email}</a>
        </address>
      </div>
      <nav class="footer-col" aria-label="Diensten">
        <p class="footer-title">Diensten</p>
        <ul>${serviceLinks}</ul>
      </nav>
      <nav class="footer-col" aria-label="Bedrijf">
        <p class="footer-title">Intergeo</p>
        <ul>
          <li><a href="/voor-aannemers">Voor aannemers</a></li>
          <li><a href="/projecten">Projecten</a></li>
          <li><a href="/over-ons">Over ons</a></li>
          <li><a href="/werken-bij">Werken bij</a></li>
          <li><a href="/contact">Contact en route</a></li>
        </ul>
      </nav>
    </div>
    <div class="wrap footer-bottom">
      <span>© ${new Date().getFullYear()} ${SITE.legalName}</span>
      <span class="mono">RD ${SITE.rd}</span>
    </div>
  </footer>`;
}

function breadcrumbsHtml(crumbs) {
  if (crumbs.length < 2) return "";
  const items = crumbs.map(([name, path], i) =>
    i === crumbs.length - 1
      ? `<li aria-current="page">${name}</li>`
      : `<li><a href="${path}">${name}</a></li>`
  ).join("");
  return `<nav class="crumbs" aria-label="Kruimelpad"><ol>${items}</ol></nav>`;
}

function page({ path, file, title, description, body, crumbs = [["Home", "/"]], schemas = [], noindex = false }) {
  const canonical = SITE.url + (path === "/" ? "/" : path);
  const fullTitle = path === "/" ? title : `${title} | ${SITE.name}`;
  const ld = [orgSchema, ...(crumbs.length > 1 ? [breadcrumbSchema(crumbs)] : []), ...schemas]
    .map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join("\n  ");
  const html = `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(description)}">
  ${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${canonical}">`}
  <meta property="og:type" content="website">
  <meta property="og:locale" content="nl_NL">
  <meta property="og:site_name" content="${SITE.name}">
  <meta property="og:title" content="${esc(fullTitle)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${SITE.url}${SITE.ogImage}">
  <meta name="theme-color" content="#15262b">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..850&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
  <link rel="stylesheet" href="/assets/css/style.css">
  ${ld}
</head>
<body>
  <a class="skip" href="#inhoud">Direct naar de inhoud</a>
  ${header(path)}
  <main id="inhoud">
    ${breadcrumbsHtml(crumbs)}
${body}
  </main>
  ${footer()}
  <script src="/assets/js/main.js" defer></script>
</body>
</html>
`;
  const out = join(ROOT, file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  if (!noindex) written.push(path);
}

/* ---------- Shared blocks ---------- */
function img(src, alt, { w, h, cls = "", eager = false } = {}) {
  return `<img src="/assets/img/${src}" alt="${esc(alt)}"${w ? ` width="${w}" height="${h}"` : ""}${cls ? ` class="${cls}"` : ""} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'}>`;
}

function serviceCard(s) {
  return `<a class="card service-card tone-${s.tone}" href="/diensten/${s.slug}">
          <h3>${s.name}</h3>
          <p>${s.short}</p>
          <span class="card-more" aria-hidden="true">Meer over ${s.name.toLowerCase()} →</span>
        </a>`;
}

const helpCard = `<div class="help-card">
          <h3>Welke meting heeft u nodig?</h3>
          <p>Twijfelt u? Beschrijf uw project en wij adviseren over de juiste meetmethode.</p>
          <a class="btn btn-small" href="/contact">Vraag advies</a>
        </div>`;

function projectCard(p, { headingLevel = 3 } = {}) {
  const s = service(p.service);
  return `<article class="card project-card" id="${p.slug}">
          <figure class="project-img${p.imageContain ? " contain" : ""}">${img(p.image, p.imageAlt)}</figure>
          <div class="project-body">
            <p class="project-meta"><a class="tag tone-${s.tone}" href="/diensten/${s.slug}">${p.kind}</a><span>${p.place}</span></p>
            <h${headingLevel}>${p.name}</h${headingLevel}>
            <p>${p.text}</p>
          </div>
        </article>`;
}

function ctaBand(title = "Iets laten meten?", text = "Vertel ons wat er gemeten moet worden. Wij denken graag mee over de aanpak en sturen u een offerte.") {
  return `
    <section class="cta-band">
      <div class="wrap cta-inner">
        <div>
          <h2>${title}</h2>
          <p>${text}</p>
        </div>
        <div class="cta-actions">
          <a class="btn" href="/contact">Offerte aanvragen</a>
          <a class="btn btn-ghost" href="tel:${SITE.phoneIntl}">Bel ${SITE.phone}</a>
        </div>
      </div>
    </section>`;
}

/* ---------- Home ---------- */
page({
  path: "/",
  file: "index.html",
  title: "Intergeo landmeetkunde | Maatvoering en landmeten in De Meern",
  description: "Landmeetkundig bureau in De Meern sinds 1972. Maatvoering, detailmetingen, deformatiemetingen en waterpassingen voor aannemers, ontwikkelaars en overheden.",
  crumbs: [["Home", "/"]],
  body: `
    <section class="hero">
      <canvas class="hero-contours" id="hero-contours" aria-hidden="true"></canvas>
      <div class="wrap hero-inner">
        <p class="eyebrow">Landmeetkundig bureau in De Meern, sinds 1972</p>
        <h1>De onmisbare schakel tussen plan en realisatie</h1>
        <p class="lead">Wij zetten uw ontwerp nauwkeurig uit, meten bestaande situaties in en bewaken zettingen tijdens de bouw.</p>
        <div class="actions">
          <a class="btn" href="/contact">Offerte aanvragen</a>
          <a class="btn btn-ghost" href="/diensten">Bekijk onze diensten</a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <h2>Wat wij voor u meten</h2>
          <p>Zeven specialismen, van de eerste rooilijn tot de laatste controlemeting.</p>
        </div>
        <div class="grid grid-services">
        ${SERVICES.map(serviceCard).join("\n        ")}
        ${helpCard}
        </div>
      </div>
    </section>

    <section class="section section-tint">
      <div class="wrap grid grid-2">
        <div class="audience tone-blue">
          <p class="eyebrow">Nieuwe opdrachtgever</p>
          <h2>Eerst kennismaken?</h2>
          <p>Bel of mail ons met uw vraag. Wij kijken wat er nodig is, adviseren over de meetmethode en sturen een heldere offerte.</p>
          <a class="btn" href="/contact">Neem contact op</a>
        </div>
        <div class="audience tone-orange">
          <p class="eyebrow">Vaste aannemer</p>
          <h2>Uw vaste landmeter op de bouwplaats</h2>
          <p>Eén aanspreekpunt dat uw projecten en uitvoerders kent, snel ter plaatse en met vaste afspraken voor terugkerend werk.</p>
          <a class="btn" href="/voor-aannemers">Werken met Intergeo</a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="section-head section-head-row">
          <h2>Uit ons werk</h2>
          <a class="link-arrow" href="/projecten">Alle projecten →</a>
        </div>
        <div class="grid grid-3">
        ${["six-flags-holland", "betuweroute", "circuit-zandvoort"].map((s) => projectCard(project(s))).join("\n        ")}
        </div>
      </div>
    </section>

    <section class="section section-tint">
      <div class="wrap split">
        <figure class="portrait">
          ${img("john-koopmans.jpg", "Oprichter John Koopmans tussen een total station en een waterpasinstrument", { w: 295, h: 234 })}
          <figcaption>Oprichter ing. John Koopmans</figcaption>
        </figure>
        <div class="stack">
          <p class="eyebrow">Over Intergeo</p>
          <h2>Ruim 50 jaar landmeten vanuit De Meern</h2>
          <p>Intergeo is in 1972 opgericht en is nog altijd een klein, persoonlijk familiebedrijf. Wij werken voor aannemers, projectontwikkelaars, architecten, adviesbureaus, overheden en particulieren.</p>
          <a class="link-arrow" href="/over-ons">Meer over ons →</a>
        </div>
      </div>
    </section>
${ctaBand()}`,
});

/* ---------- Diensten overzicht ---------- */
page({
  path: "/diensten",
  file: "diensten/index.html",
  title: "Diensten",
  description: "Overzicht van de landmeetkundige diensten van Intergeo: maatvoering, deformatiemetingen, detailmetingen, waterpassingen, DTM-metingen, industriële en speciale metingen.",
  crumbs: [["Home", "/"], ["Diensten", "/diensten"]],
  body: `
    <section class="page-head">
      <div class="wrap stack">
        <h1>Onze diensten</h1>
        <p class="lead">Van de eerste rooilijn tot de laatste controlemeting. Wij leveren de meetgegevens analoog of digitaal, in het formaat dat u gebruikt.</p>
      </div>
    </section>
    <section class="section section-flush-top">
      <div class="wrap grid grid-services">
        ${SERVICES.map(serviceCard).join("\n        ")}
        ${helpCard}
      </div>
    </section>
${ctaBand()}`,
});

/* ---------- Dienstpagina's ---------- */
for (const s of SERVICES) {
  const sections = s.sections.map((sec) => {
    let inner = "";
    if (sec.steps) {
      inner = `<ol class="steps">${sec.steps.map(([t, d], i) => `
            <li><span class="step-n">${i + 1}</span><div><h3>${t}</h3><p>${d}</p></div></li>`).join("")}
          </ol>`;
    } else if (sec.list) {
      inner = `<ul class="checks">${sec.list.map((l) => `<li>${l}</li>`).join("")}</ul>`;
    } else {
      inner = `<p>${sec.text}</p>`;
    }
    return `<div class="stack"><h2 class="h-small">${sec.title}</h2>${inner}</div>`;
  }).join("\n          ");

  const others = SERVICES.filter((o) => o.slug !== s.slug)
    .map((o) => `<li><a class="tag tone-${o.tone}" href="/diensten/${o.slug}">${o.name}</a></li>`).join("");

  page({
    path: `/diensten/${s.slug}`,
    file: `diensten/${s.slug}.html`,
    title: s.metaTitle,
    description: s.metaDescription,
    crumbs: [["Home", "/"], ["Diensten", "/diensten"], [s.name, `/diensten/${s.slug}`]],
    schemas: [{
      "@context": "https://schema.org",
      "@type": "Service",
      name: s.name,
      serviceType: s.name,
      description: s.metaDescription,
      provider: { "@id": ORG_ID },
      areaServed: { "@type": "Country", name: "Nederland" },
      url: `${SITE.url}/diensten/${s.slug}`,
    }],
    body: `
    <section class="page-head tone-${s.tone}">
      <div class="wrap stack">
        <p class="eyebrow">Dienst</p>
        <h1>${s.name}</h1>
        <p class="lead">${s.intro}</p>
      </div>
    </section>

    <section class="section">
      <div class="wrap split split-aside">
        <div class="stack stack-lg">
          ${sections}
        </div>
        <aside class="stack">
          <figure class="aside-img${s.imageContain ? " contain" : ""}">${img(s.image, s.imageAlt)}</figure>
          <div class="card quote-box tone-${s.tone}">
            <h2 class="h-small">Offerte voor ${s.name.toLowerCase()}</h2>
            <p>Stuur ons de tekening of omschrijving. U hoort snel wat de mogelijkheden zijn.</p>
            <a class="btn" href="/contact?onderwerp=${encodeURIComponent(s.name)}">Offerte aanvragen</a>
            <p class="small">Of bel <a href="tel:${SITE.phoneIntl}">${SITE.phone}</a></p>
          </div>
        </aside>
      </div>
    </section>

    <section class="section section-tint">
      <div class="wrap">
        <div class="section-head"><h2>Projecten</h2></div>
        <div class="grid grid-2">
        ${s.projects.map((p) => projectCard(project(p))).join("\n        ")}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="wrap stack">
        <h2 class="h-small">Andere diensten</h2>
        <ul class="tag-list">${others}</ul>
      </div>
    </section>
${ctaBand()}`,
  });
}

/* ---------- Voor aannemers ---------- */
page({
  path: "/voor-aannemers",
  file: "voor-aannemers.html",
  title: "Landmeter voor aannemers",
  description: "Een vaste landmeter voor uw bouwprojecten. Intergeo verzorgt maatvoering en zettingsmetingen voor aannemers, met één aanspreekpunt en vaste afspraken.",
  crumbs: [["Home", "/"], ["Voor aannemers", "/voor-aannemers"]],
  body: `
    <section class="page-head tone-orange">
      <div class="wrap stack">
        <p class="eyebrow">Voor aannemers</p>
        <h1>Uw vaste landmeter op de bouwplaats</h1>
        <p class="lead">Wij kennen de manier van werken van onze vaste opdrachtgevers en denken mee met de uitvoering. Klopt iets niet met de tekening, dan hoort u dat direct.</p>
      </div>
    </section>

    <section class="section">
      <div class="wrap grid grid-4">
        <div class="card feature tone-orange"><h2 class="h-small">Eén aanspreekpunt</h2><p>U belt met iemand die uw projecten en uitvoerders kent.</p></div>
        <div class="card feature tone-blue"><h2 class="h-small">Snel ter plaatse</h2><p>Vanuit De Meern zijn wij via de A2 en A12 snel bij u op de bouwplaats.</p></div>
        <div class="card feature tone-green"><h2 class="h-small">Gegevens zoals u ze wilt</h2><p>Meetresultaten en rapportages in het formaat dat aansluit op uw werkwijze.</p></div>
        <div class="card feature tone-plum"><h2 class="h-small">Vaste afspraken</h2><p>Voor terugkerend werk maken wij afspraken over planning en tarieven.</p></div>
      </div>
    </section>

    <section class="section section-tint">
      <div class="wrap stack">
        <h2>Zo loopt de maatvoering van een bouwproject</h2>
        <ol class="steps steps-row">
          <li><span class="step-n">1</span><div><h3>Rooilijnen verklikken</h3><p>Uitgangspunten vastleggen buiten de bouwput, zodat het heien ze niet verstoort.</p></div></li>
          <li><span class="step-n">2</span><div><h3>Palenplan uitzetten</h3><p>Elke paal op de juiste plek, gecontroleerd en vastgelegd.</p></div></li>
          <li><span class="step-n">3</span><div><h3>Stramienen</h3><p>Een vast referentiekader voor uw uitvoerders.</p></div></li>
          <li><span class="step-n">4</span><div><h3>Detailmaatvoering</h3><p>Gevellijnen, kolommen en ankers, verdieping na verdieping.</p></div></li>
        </ol>
        <p>Bouwt u naast bestaande bebouwing? Combineer de maatvoering dan met <a href="/diensten/deformatiemetingen">zettingsmetingen</a>, zodat u schade aan de omgeving voorkomt.</p>
      </div>
    </section>
${ctaBand("Kennismaken?", "Bespreek uw volgende project met ons. Wij komen graag langs op kantoor of de bouwplaats.")}`,
});

/* ---------- Projecten ---------- */
page({
  path: "/projecten",
  file: "projecten.html",
  title: "Projecten",
  description: "Projecten van Intergeo landmeetkunde: maatvoering bij Six Flags Holland en Circuit Zandvoort, deformatiemetingen Betuweroute, bodemsanering Kralingen en meer.",
  crumbs: [["Home", "/"], ["Projecten", "/projecten"]],
  body: `
    <section class="page-head">
      <div class="wrap stack">
        <h1>Projecten</h1>
        <p class="lead">Een greep uit de projecten waaraan wij hebben gemeten, van pretpark tot marinebasis.</p>
      </div>
    </section>
    <section class="section section-flush-top">
      <div class="wrap grid grid-3">
        ${PROJECTS.map((p) => projectCard(p, { headingLevel: 2 })).join("\n        ")}
      </div>
      <div class="wrap clients">
        <h2 class="h-small">Wij werken voor</h2>
        <ul class="tag-list">${CLIENTS.map((c) => `<li><span class="tag">${c}</span></li>`).join("")}</ul>
      </div>
    </section>
${ctaBand()}`,
});

/* ---------- Over ons ---------- */
page({
  path: "/over-ons",
  file: "over-ons.html",
  title: "Over ons",
  description: "Intergeo landmeetkunde is in 1972 opgericht door ing. John Koopmans. Een persoonlijk familiebedrijf in De Meern met ruim 50 jaar vakkennis.",
  crumbs: [["Home", "/"], ["Over ons", "/over-ons"]],
  body: `
    <section class="page-head tone-green">
      <div class="wrap stack">
        <p class="eyebrow">Sinds 1972</p>
        <h1>Landmeters uit een landmetersfamilie</h1>
        <p class="lead">Een klein, persoonlijk bureau met veel vakkennis, dat ook voor ongebruikelijke meetvragen een oplossing vindt.</p>
      </div>
    </section>

    <section class="section">
      <div class="wrap split">
        <div class="stack">
          <h2>Ons verhaal</h2>
          <p>Intergeo is in 1972 opgericht door ing. John Koopmans. Landmeten zat in de familie: zijn vader was bureauchef bij het Kadaster. John hoorde bij de allereerste lichting van de hts-opleiding landmeten en werkte daarna als gemeentelandmeter in Amsterdam.</p>
          <p>Naast het opbouwen van Intergeo werkte hij jarenlang in het buitenland, onder meer in Frankrijk, Ghana, Noord-Afrika, Kenia en Indonesië. Ook gaf hij twintig jaar les in het landmeetkundig onderwijs. Zijn zoon heeft het bureau van hem overgenomen.</p>
          <p>In 2022 bestond Intergeo 50 jaar.</p>
          <p class="small">Bron: interview met John Koopmans in vakblad Geodesia, december 1999.</p>
        </div>
        <figure class="portrait">
          ${img("john-koopmans.jpg", "Oprichter John Koopmans tussen een total station en een waterpasinstrument", { w: 295, h: 234 })}
          <figcaption>Oprichter ing. John Koopmans</figcaption>
        </figure>
      </div>
    </section>

    <section class="section section-tint">
      <div class="wrap split">
        <div class="stack">
          <h2>Waarmee wij meten</h2>
          <dl class="def-list">
            <div><dt>Gemotoriseerd total station</dt><dd>Snel en nauwkeurig voor uitzetwerk en detailmetingen. Zelfzoekend en volgend, ook te gebruiken als one-man station.</dd></div>
            <div><dt>Digitaal waterpasinstrument</dt><dd>Voor snelle en nauwkeurige hoogtemetingen ten opzichte van NAP.</dd></div>
            <div><dt>Eigen meetopstellingen</dt><dd>Statieven en opstellingen op maat voor industriële en speciale metingen.</dd></div>
          </dl>
        </div>
        <figure class="archive">
          <div class="archive-imgs">
            ${img("theodoliet.jpg", "Gravure van een oude theodoliet", { w: 240, h: 320 })}
            ${img("seinen-1943.gif", "Communicatierichtlijnen voor landmeters uit 1943 met handseinen", { w: 642, h: 996 })}
          </div>
          <figcaption><strong>Uit het archief.</strong> Vroeger waren de theodoliet, het optische waterpas en de meetband onze belangrijkste hulpmiddelen. In het veld communiceerde je in 1943 nog met handseinen.</figcaption>
        </figure>
      </div>
    </section>

    <section class="section">
      <div class="wrap stack">
        <h2 class="h-small">Onze opdrachtgevers</h2>
        <ul class="tag-list">${CLIENTS.map((c) => `<li><span class="tag">${c}</span></li>`).join("")}</ul>
      </div>
    </section>
${ctaBand()}`,
});

/* ---------- Werken bij ---------- */
page({
  path: "/werken-bij",
  file: "werken-bij.html",
  title: "Vacature maatvoerder / landmeter",
  description: "Werken bij Intergeo landmeetkunde in De Meern. Wij zoeken een maatvoerder / landmeter voor 32 tot 40 uur per week. Veel afwisseling en een informele werksfeer.",
  crumbs: [["Home", "/"], ["Werken bij", "/werken-bij"]],
  schemas: [{
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: "Maatvoerder / landmeter",
    description: "<p>Maatvoerder / landmeter voor 32 tot 40 uur per week bij Intergeo landmeetkunde in De Meern. Veel afwisseling, informele werksfeer, training en opleidingsmogelijkheden en uitstekende secundaire arbeidsvoorwaarden.</p>",
    datePosted: TODAY,
    employmentType: ["FULL_TIME", "PART_TIME"],
    hiringOrganization: { "@id": ORG_ID, name: SITE.name, sameAs: SITE.url },
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", streetAddress: SITE.street, postalCode: SITE.postcode, addressLocality: SITE.city, addressCountry: "NL" },
    },
  }],
  body: `
    <section class="page-head tone-ochre">
      <div class="wrap stack">
        <p class="eyebrow">Vacature</p>
        <h1>Maatvoerder / landmeter</h1>
        <p class="lead">32 tot 40 uur per week. Wisselende projecten, van bouwplaats tot fabriekshal, in een klein team waar je snel verantwoordelijkheid krijgt.</p>
      </div>
    </section>
    <section class="section">
      <div class="wrap split">
        <div class="stack">
          <h2>Wat wij je bieden</h2>
          <ul class="checks">
            <li>Veel afwisseling in het werk</li>
            <li>Informele werksfeer</li>
            <li>Training en opleidingsmogelijkheden</li>
            <li>Uitstekende secundaire arbeidsvoorwaarden</li>
          </ul>
        </div>
        <div class="card quote-box tone-ochre">
          <h2 class="h-small">Solliciteren</h2>
          <p>Stuur je cv en motivatie naar <a href="mailto:${SITE.email}?subject=Sollicitatie%20maatvoerder%20%2F%20landmeter">${SITE.email}</a>, of per post naar ${SITE.legalName}, ${SITE.street}, ${SITE.postcode} ${SITE.city}.</p>
          <p class="small">Vragen? Bel <a href="tel:${SITE.phoneIntl}">${SITE.phone}</a>.</p>
        </div>
      </div>
    </section>`,
});

/* ---------- Contact ---------- */
const subjectOptions = [...SERVICES.map((s) => s.name), "Iets anders"]
  .map((n) => `<option>${n}</option>`).join("");
page({
  path: "/contact",
  file: "contact.html",
  title: "Contact en offerte",
  description: "Neem contact op met Intergeo landmeetkunde, Gessel 34 in De Meern. Bel 030 - 606 78 17 of vraag via het formulier een offerte aan.",
  crumbs: [["Home", "/"], ["Contact", "/contact"]],
  body: `
    <section class="page-head tone-blue">
      <div class="wrap stack">
        <h1>Contact en offerte</h1>
        <p class="lead">Bel ons, stuur een e-mail of vul het formulier in. Wij nemen zo snel mogelijk contact met u op.</p>
      </div>
    </section>
    <section class="section">
      <div class="wrap split">
        <div class="stack">
          <dl class="def-list">
            <div><dt>Telefoon</dt><dd><a href="tel:${SITE.phoneIntl}">${SITE.phone}</a></dd></div>
            <div><dt>E-mail</dt><dd><a href="mailto:${SITE.email}">${SITE.email}</a></dd></div>
            <div><dt>Adres</dt><dd>${SITE.name}<br>${SITE.street}<br>${SITE.postcode} ${SITE.city}</dd></div>
            <div><dt>Route</dt><dd>Aan de rand van bedrijventerrein Oudenrijn, tussen Utrecht en De Meern. Goed bereikbaar via de A2 en de A12. <a href="${SITE.mapsUrl}" rel="noopener" target="_blank">Open in Google Maps</a></dd></div>
            <div><dt>Coördinaten</dt><dd class="mono">${SITE.lat}° N, ${SITE.lng}° O<br>RD ${SITE.rd}</dd></div>
          </dl>
        </div>
        <form class="card form" id="contact-form" novalidate>
          <div class="field"><label for="f-naam">Naam</label><input id="f-naam" name="naam" type="text" autocomplete="name" required></div>
          <div class="field"><label for="f-bedrijf">Bedrijf <span class="optional">(optioneel)</span></label><input id="f-bedrijf" name="bedrijf" type="text" autocomplete="organization"></div>
          <div class="field-row">
            <div class="field"><label for="f-email">E-mailadres</label><input id="f-email" name="email" type="email" autocomplete="email" required></div>
            <div class="field"><label for="f-tel">Telefoonnummer <span class="optional">(optioneel)</span></label><input id="f-tel" name="telefoon" type="tel" autocomplete="tel"></div>
          </div>
          <div class="field"><label for="f-soort">Waar gaat het om?</label><select id="f-soort" name="soort">${subjectOptions}</select></div>
          <div class="field"><label for="f-bericht">Uw vraag</label><textarea id="f-bericht" name="bericht" rows="5" required placeholder="Locatie, planning en wat u wilt laten meten"></textarea></div>
          <p class="form-error" id="form-error" role="alert" hidden></p>
          <button class="btn" type="submit">Verstuur aanvraag</button>
        </form>
      </div>
    </section>`,
});

/* ---------- 404 ---------- */
page({
  path: "/404",
  file: "404.html",
  title: "Pagina niet gevonden",
  description: "Deze pagina bestaat niet (meer).",
  noindex: true,
  crumbs: [["Home", "/"]],
  body: `
    <section class="page-head">
      <div class="wrap stack">
        <p class="eyebrow mono">Buiten het meetgebied</p>
        <h1>Deze pagina bestaat niet</h1>
        <p class="lead">Misschien is de pagina verplaatst. Kijk bij onze <a href="/diensten">diensten</a>, <a href="/projecten">projecten</a> of ga naar de <a href="/">homepage</a>.</p>
      </div>
    </section>`,
});

/* ---------- sitemap.xml en robots.txt ---------- */
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${written.map((p) => `  <url><loc>${SITE.url}${p === "/" ? "/" : p}</loc><lastmod>${TODAY}</lastmod></url>`).join("\n")}
</urlset>
`;
writeFileSync(join(ROOT, "sitemap.xml"), sitemap);
writeFileSync(join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);

console.log(`${written.length} pagina's + 404, sitemap.xml en robots.txt geschreven.`);
