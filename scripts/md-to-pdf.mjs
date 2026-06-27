// Generates the CIPHER 2.0 submission PDF from the markdown source.
// Usage: node scripts/md-to-pdf.mjs
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import { chromium } from "@playwright/test";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "docs", "CIPHER2_SegfaultSociety_Documentation.md");
const OUT = path.join(ROOT, "docs", "CIPHER2_SegfaultSociety_Documentation.pdf");

const md = fs.readFileSync(SRC, "utf8");
marked.use({ gfm: true });
const bodyHtml = marked.parse(md);

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  :root { --teal:#0e7490; --teal2:#0891b2; --ink:#1a2226; --muted:#5b6b71; --line:#d7e2e6; }
  * { box-sizing: border-box; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; color: var(--ink);
    font-size: 9.4pt; line-height: 1.32; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h1 { font-size: 17pt; color: var(--teal); margin: 0 0 2px; letter-spacing: -0.2px; }
  h1 + p { color: var(--muted); margin-top: 0; font-size: 8.8pt; }
  h2 { font-size: 12pt; color: var(--teal); margin: 13px 0 5px; padding-bottom: 3px;
    border-bottom: 1.5px solid var(--line); break-after: avoid; break-before: auto; }
  h3 { font-size: 10.3pt; color: var(--ink); margin: 9px 0 3px; break-after: avoid; }
  p { margin: 4px 0; }
  ul, ol { margin: 4px 0; padding-left: 19px; }
  li { margin: 1.5px 0; }
  strong { color: #0b1417; }
  code { font-family: "SFMono-Regular", "Menlo", Consolas, monospace; font-size: 8.2pt;
    background: #eef4f6; padding: 1px 4px; border-radius: 4px; color: #0b3a44; }
  pre { background: #f4f8fa; border: 1px solid var(--line); border-radius: 6px;
    padding: 7px 10px; margin: 6px 0; overflow-x: auto; break-inside: avoid; }
  pre code { background: none; padding: 0; font-size: 7.7pt; line-height: 1.3; color: #15323a; }
  blockquote { margin: 6px 0; padding: 4px 11px; border-left: 3px solid var(--teal2);
    background: #f3fafb; color: #34474d; }
  blockquote p { margin: 2px 0; }
  table { border-collapse: collapse; width: 100%; margin: 6px 0; font-size: 8.5pt; break-inside: avoid; }
  th, td { border: 1px solid var(--line); padding: 3.5px 6px; text-align: left; vertical-align: top; }
  th { background: #e7f2f5; color: #0b3a44; font-weight: 700; }
  tr:nth-child(even) td { background: #fafcfd; }
  hr { border: none; border-top: 1px solid var(--line); margin: 11px 0; }
  a { color: var(--teal2); text-decoration: none; }
</style></head><body>${bodyHtml}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
await page.pdf({
  path: OUT,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<div></div>",
  footerTemplate:
    '<div style="font-size:7.5pt; width:100%; padding:0 14mm; color:#9aa; display:flex; justify-content:space-between;">' +
    '<span>SYNAPSE — Segfault Society · CIPHER 2.0 · Scenario 01</span>' +
    '<span class="pageNumber"></span></div>',
  margin: { top: "12mm", bottom: "13mm", left: "13mm", right: "13mm" },
});
await browser.close();
console.log("wrote " + OUT);
