# Livegang intergeo.nl: stappenplan (alleen voor jou)

Wat we weten over de huidige situatie (gecontroleerd op 9 oktober 2026):
- **Hosting:** VIP.nl met Plesk (Linux). nginx staat voor Apache, dus `.htaccess` werkt normaal gesproken.
- **https:** nog **niet** actief. https://intergeo.nl geeft geen antwoord.
- **E-mail:** Microsoft 365 (MX: `intergeo-nl.mail.protection.outlook.com`). **Niet aankomen.**
- **DNS:** nameservers bij VIP (dns1.vip.nl). Hoeft niet te veranderen, want je vervangt alleen bestanden.

## 0. Vooraf
1. Offerte getekend terug.
2. Controlelijst ingevuld terug. Verwerk de antwoorden in `scripts/content.mjs`:
   - `SITE.url`: `https://intergeo.nl` of `https://www.intergeo.nl`
   - `SITE.vacature.open`: `true` of `false`
   - teksten of projecten die anders moeten
3. Draai `node scripts/package.mjs`. Dat maakt:
   - `oplevering/website/` en `oplevering/intergeo-website.zip`: wat online moet
   - `oplevering/intergeo-broncode.zip`: broncode voor Intergeo (gemaakt uit de laatste git-commit, dus eerst committen)
   - de drie PDF's in `oplevering/`
4. Vraag de inloggegevens van het Plesk-beheerpaneel bij VIP.nl, of laat Intergeo jou tijdelijk toegang geven.

## 1. Back-up van de oude site
In Plesk: **Websites & Domains → intergeo.nl → File Manager**, map `httpdocs`.
Selecteer alles en kies **Add to archive** (zip), en download die zip. Of download alles via FTP met FileZilla.
Bewaar deze back-up en lever hem op aan Intergeo.

## 2. https aanzetten (gratis)
In Plesk: **Websites & Domains → intergeo.nl → SSL/TLS Certificates → Let's Encrypt**.
Vink `intergeo.nl` en `www.intergeo.nl` aan en installeer. Zet daarna in **Hosting Settings** de optie "Permanent SEO-safe 301 redirect from HTTP to HTTPS" aan.
Lukt dat niet via Plesk, haal dan in `.htaccess` het `#` weg voor de twee https-regels.

## 3. Oude bestanden weghalen
Verwijder in `httpdocs` de oude website: de mappen `home`, `waar`, `projecten`, `diensten`, `instrumenten`, `vacatures`, `archief`, `images` en losse bestanden zoals `intergeo.css`, `HM_*.js` en de oude `index.html`.
**Belangrijk:** de oude map `projecten/` moet echt weg, anders botst die met de nieuwe pagina `/projecten`.
Laat staan wat niet bij de website hoort (vraag het na als je twijfelt: punt 7 van de controlelijst).

## 4. Nieuwe website uploaden
Upload `intergeo-website.zip` naar `httpdocs` en pak hem daar uit (File Manager → **Extract files**).
Controleer dat `.htaccess` erin staat. Het is een verborgen bestand; zet in FileZilla "Show hidden files" aan.

## 5. Testen
- [ ] https://intergeo.nl laadt, met slotje
- [ ] Menu: alle pagina's werken, ook /diensten/maatvoering (zonder .html)
- [ ] /bestaat-niet geeft de eigen 404-pagina
- [ ] Oud adres: intergeo.nl/diensten/di_maatvoering.html stuurt door naar /diensten/maatvoering
- [ ] intergeo.nl/projecten/pr_sixflags.html stuurt door naar /projecten#six-flags-holland
- [ ] Op je telefoon: menu-knop, telefoonnummer bellen, mail-link
- [ ] Contactformulier opent een e-mail aan info@intergeo.nl
- [ ] Stuur een testmail naar info@intergeo.nl en vraag of die aankomt (e-mail is niet aangeraakt, maar zo weet je het zeker)

**Werken de korte adressen niet (404 op /contact)?** Dan staat Plesk in "nginx only"-modus. Zet in **Apache & nginx Settings** "Proxy mode" aan, of plak dit bij "Additional nginx directives":

```
location / { try_files $uri $uri.html $uri/index.html =404; }
error_page 404 /404.html;
```

## 6. Opleveren
Stuur Intergeo:
1. `3-overdracht.pdf` (ingevuld), om te laten tekenen
2. `intergeo-website.zip` en `intergeo-broncode.zip`
3. de back-up van de oude site
4. je factuur

Vraag ze daarna om het Plesk-wachtwoord te wijzigen. Klaar.

## Let op
- Werk je zonder KvK-inschrijving, dan kun je geen btw rekenen. Pas dan de offerte aan of overleg met een boekhouder.
- De demo op Vercel (intergeao.vercel.app) haal je na de livegang offline, zodat er geen dubbele site in Google komt. Vercel → project → Settings → Delete Project.
