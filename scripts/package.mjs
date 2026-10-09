// Stelt het opleverpakket samen in oplevering/:
//   oplevering/website/            alleen de bestanden die online moeten
//   oplevering/intergeo-website.zip  dezelfde bestanden als zip
//   oplevering/*.pdf               documenten voor Intergeo (uit oplevering/documenten/*.html)
// Gebruik: node scripts/package.mjs
import { cpSync, rmSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "oplevering");
const SITE_DIR = join(OUT, "website");

execFileSync(process.execPath, [join(ROOT, "scripts", "build.mjs")], { stdio: "inherit" });

rmSync(SITE_DIR, { recursive: true, force: true });
mkdirSync(SITE_DIR, { recursive: true });

const PUBLIC = ["assets", "diensten", ".htaccess", "_redirects", "robots.txt", "sitemap.xml"];
for (const f of readdirSync(ROOT)) if (f.endsWith(".html")) PUBLIC.push(f);
for (const f of PUBLIC) cpSync(join(ROOT, f), join(SITE_DIR, f), { recursive: true });

// Zip met gewone schuine strepen (werkt op Linux-servers). Windows 10+ heeft bsdtar ingebouwd.
const zip = join(OUT, "intergeo-website.zip");
rmSync(zip, { force: true });
if (process.platform === "win32") {
  execFileSync("C:\\Windows\\System32\\tar.exe", ["-a", "-c", "-f", zip, ...readdirSync(SITE_DIR)], { cwd: SITE_DIR, stdio: "inherit" });
} else {
  execFileSync("zip", ["-qr", zip, "."], { cwd: SITE_DIR, stdio: "inherit" });
}

// Broncode voor de klant: alles uit de laatste git-commit (zonder opleverbestanden)
try {
  const src = join(OUT, "intergeo-broncode.zip");
  execFileSync("git", ["archive", "--format=zip", "-o", src, "HEAD", "--", ".", ":(exclude)oplevering"], { cwd: ROOT, stdio: "inherit" });
  console.log("Broncode:", src);
} catch {
  console.log("Broncode-zip overgeslagen (geen git-commit gevonden).");
}

// PDF's via Chrome of Edge (headless), als die aanwezig is
const browsers = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
];
const browser = browsers.find((b) => existsSync(b));
const DOCS = join(OUT, "documenten");
if (browser && existsSync(DOCS)) {
  for (const f of readdirSync(DOCS).filter((f) => f.endsWith(".html"))) {
    const pdf = join(OUT, f.replace(/\.html$/, ".pdf"));
    execFileSync(browser, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer",
      `--print-to-pdf=${pdf}`, "file:///" + join(DOCS, f).replace(/\\/g, "/")], { stdio: "ignore" });
    console.log("PDF:", pdf);
  }
} else {
  console.log("Geen Chrome/Edge gevonden: open de HTML-bestanden in oplevering/documenten en kies Afdrukken > Opslaan als PDF.");
}
console.log("Klaar:", zip);
