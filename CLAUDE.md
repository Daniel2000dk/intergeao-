# Intergeo landmeetkunde: website

Statische website (geen build-stap) voor Intergeo landmeetkunde, De Meern.
Open `index.html` direct in de browser.

## Structuur
- `index.html`: alle content, één pagina met ankers (#diensten, #aannemers, #projecten, #over-ons, #werken-bij, #contact)
- `assets/css/style.css`: designtokens staan bovenaan in `:root`, met een donkere variant via `prefers-color-scheme` en `[data-theme]`
- `assets/js/main.js`: mobiel menu, hoogtelijnenkaart met meetkruis in de hero, en het contactformulier (opent het e-mailprogramma van de bezoeker)

## Huisstijl
- Kleuren: kaartpapier (`--paper`), donker instrument-inkt (`--ink`/`--deep`), jalon-oranje (`--signal`) als enige accentkleur
- Lettertypen: Archivo (koppen, variabele breedte), IBM Plex Sans (tekst), IBM Plex Mono (labels, coördinaten)
- Gebruik altijd tokens, nooit losse kleurwaarden in componenten

## Teksten
- Nederlands, u-vorm voor klanten, je-vorm in de vacature
- Korte, concrete zinnen; geen verzonnen cijfers of beloftes, alleen feiten die Intergeo heeft bevestigd
- Kantoorgegevens: Gessel 34, 3454 MZ De Meern · 030 - 606 78 17 · info@intergeo.nl · RD X 131 378, Y 453 925
