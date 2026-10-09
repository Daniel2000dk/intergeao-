# Intergeo landmeetkunde: website

Statische website voor Intergeo landmeetkunde, De Meern. Gehost op Vercel (`vercel.json`: clean URLs, dus `/diensten/maatvoering` serveert `diensten/maatvoering.html`).

## Werkwijze
- Teksten staan in `scripts/content.mjs` (diensten, projecten, bedrijfsgegevens); paginaopbouw in `scripts/build.mjs`.
- Na elke wijziging: `node scripts/build.mjs`. Dat schrijft alle `.html`-pagina's, `sitemap.xml` en `robots.txt` opnieuw. Bewerk de gegenereerde HTML niet met de hand.
- Nieuwe dienst of project: voeg een object toe in `content.mjs` en draai de build; menu, footer, sitemap en interne links volgen vanzelf.

## SEO
- Elke pagina heeft een eigen `<title>`, meta description, canonical, Open Graph en JSON-LD (ProfessionalService, BreadcrumbList, Service per dienst, JobPosting voor de vacature).
- Domein staat in `SITE.url` in `content.mjs`; pas dat aan als het domein anders is.

## Huisstijl
- Tokens bovenaan `assets/css/style.css`, met een donkere variant (`prefers-color-scheme` en `[data-theme]`).
- Kleurfamilies via `.tone-*`: oranje = bouw/maatvoering, blauw = hoogte en monitoring, groen = terrein, paars = industrie, oker = maatwerk/vacature.
- Lettertypen: Archivo (koppen), IBM Plex Sans (tekst), IBM Plex Mono (labels, coördinaten).

## Teksten
- Nederlands, u-vorm voor klanten, je-vorm in de vacature.
- Korte, concrete zinnen; geen verzonnen cijfers of beloftes, alleen feiten die Intergeo heeft bevestigd.
