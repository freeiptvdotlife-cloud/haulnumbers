import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AD_PAGES, REQUIRED_PAGES, checkDist } from "./complianceCheck.mjs";

const words = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
const FOOTER = REQUIRED_PAGES.map((p) => `<a href="/${p}/">${p}</a>`).join(" ");
const PRIVACY = `<main><p>Google third-party vendors use cookies. <a href="https://adssettings.google.com/">x</a> <a href="https://policies.google.com/technologies/ads">x</a> <a href="https://business.safety.google/privacy/">x</a> <a href="https://www.aboutads.info/">x</a> Not directed at children. <a href="/contact/">contact</a></p></main>`;
const LOADER = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456"></script>`;
const AD = `<aside><p>Advertisement</p>${LOADER}<ins class="adsbygoogle" data-ad-slot="123"></ins></aside>`;
const CLIENT = "ca-pub-1234567890123456";
const ADS_LINE = "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n";

/** Builds a fake dist folder that passes every rule, then lets a test break one thing. */
function site(mod = {}) {
  const dir = mkdtempSync(join(tmpdir(), "dist-"));
  const pages = { "": `<h1>Home</h1>${FOOTER}` };
  for (const p of REQUIRED_PAGES) pages[p] = `<h1>${p}</h1>${p === "privacy" ? PRIVACY : ""}${p === "contact" ? "<p>me@example.com</p>" : ""}${FOOTER}`;
  for (const p of AD_PAGES) pages[p] = `<main><h1>${p}</h1><p>${words(400)}</p>${AD}</main>${FOOTER}`;
  Object.assign(pages, mod.pages ?? {});
  for (const [name, html] of Object.entries(pages)) {
    if (html === null) continue;
    const d = name ? join(dir, name) : dir;
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, "index.html"), html);
  }
  writeFileSync(join(dir, "sitemap-0.xml"), REQUIRED_PAGES.map((p) => `<loc>https://x.test/${p}/</loc>`).join(""));
  writeFileSync(join(dir, "robots.txt"), mod.robots ?? "User-agent: *\nAllow: /\n");
  if (mod.adsTxt !== null) writeFileSync(join(dir, "ads.txt"), mod.adsTxt ?? ADS_LINE);
  return dir;
}
const MONETISED = { PUBLIC_ADSENSE_CLIENT: CLIENT, PUBLIC_CONTACT_EMAIL: "me@example.com" };
function run(mod, env = MONETISED) {
  const dir = site(mod);
  try { return checkDist(dir, env); } finally { rmSync(dir, { recursive: true, force: true }); }
}
const has = (problems, rule) => problems.some((p) => p.startsWith(`[${rule}]`));

test("a fully compliant monetised site passes", () => assert.deepEqual(run({}), []));

test("the ad-free build passes only when it carries no ads", () => {
  assert.ok(has(run({}, {}), "ads-config"), "ads present without a publisher id must fail");
  const adFree = Object.fromEntries(AD_PAGES.map((p) => [p, `<main><h1>${p}</h1><p>${words(400)}</p></main>${FOOTER}`]));
  assert.deepEqual(run({ pages: adFree }, {}), []);
});

test("fails when an ad is on a non-content page", () => {
  for (const p of REQUIRED_PAGES) assert.ok(has(run({ pages: { [p]: `<h1>${p}</h1>${PRIVACY}${AD}${FOOTER}<a href="/contact/">c</a>` } }), "ad-placement"), p);
});

test("fails when the AdSense script is loaded on a non-content page, even without a visible unit", () => {
  for (const p of REQUIRED_PAGES) assert.ok(has(run({ pages: { [p]: `<main>${PRIVACY}${LOADER}</main>${FOOTER}` } }), "ad-placement"), p);
  assert.ok(has(run({ pages: { "": `<h1>Home</h1>${LOADER}${FOOTER}` } }), "ad-placement"), "home");
});

test("fails when an ad unit is present without the AdSense script", () =>
  assert.ok(has(run({ pages: { "ifta-calculator": `<main><p>${words(400)}</p><p>Advertisement</p><ins class="adsbygoogle" data-ad-slot="1"></ins></main>${FOOTER}` } }), "ads-config")));

test("fails when an ad has no visible Advertisement label", () =>
  assert.ok(has(run({ pages: { "ifta-calculator": `<p>${words(400)}</p><ins class="adsbygoogle" data-ad-slot="1"></ins>${FOOTER}` } }), "ad-label")));

test("fails when an ad page is too thin", () =>
  assert.ok(has(run({ pages: { "ifta-calculator": `<main><p>${words(50)}</p>${AD}</main>${words(400)}${FOOTER}` } }), "thin-content")));

test("fails on wording that invites clicks", () => {
  for (const phrase of ["Please click the ads", "Help keep this site running", "Support us by clicking", "Feel free to click"]) {
    assert.ok(has(run({ pages: { about: `<p>${phrase}</p>${FOOTER}` } }), "click-inducing-text"), phrase);
  }
});

test("does not flag ordinary uses of similar words", () =>
  assert.deepEqual(run({ pages: { about: `<p>Ads are labelled. Click a calculator to open it, and help yourself to the formulas.</p>${FOOTER}` } }), []));

test("fails when a required page is missing, unlinked or not in the sitemap", () => {
  assert.ok(has(run({ pages: { terms: null } }), "required-pages"));
  assert.ok(has(run({ pages: { "": "<h1>Home</h1>" } }), "required-pages"));
});

test("fails when the privacy policy lacks a required disclosure", () => {
  const pieces = ["adssettings.google.com", "policies.google.com/technologies/ads", "business.safety.google", "aboutads.info", "third-party vendors", "children", 'href="/contact/"'];
  for (const piece of pieces) assert.ok(has(run({ pages: { privacy: `<h1>p</h1>${PRIVACY.split(piece).join("removed")}${FOOTER}` } }), "privacy-policy"), piece);
});

test("ads.txt: missing, wrong format and wrong publisher id all fail when ads are configured", () => {
  assert.ok(has(run({ adsTxt: null }), "ads.txt"));
  assert.ok(has(run({ adsTxt: "google.com pub-1234567890123456 DIRECT\n" }), "ads.txt"));
  assert.ok(has(run({ adsTxt: "google.com, pub-9999999999999999, DIRECT, f08c47fec0942fa0\n" }), "ads.txt"));
  assert.ok(has(run({ adsTxt: "# nothing\n" }), "ads.txt"));
});

test("a monetised build needs a contact email and every ad unit", () => {
  assert.ok(has(run({}, { PUBLIC_ADSENSE_CLIENT: CLIENT }), "contact"));
  assert.ok(has(run({ pages: { "per-diem-calculator": `<main><p>${words(400)}</p><p>Advertisement</p>${LOADER}<ins class="adsbygoogle"></ins></main>${FOOTER}` } }), "ads-config"));
  assert.ok(has(run({}, { ...MONETISED, PUBLIC_ADSENSE_CLIENT: "ca-pub-123" }), "ads-config"));
});

test("robots.txt must not block the site or Google's ad crawler", () => {
  assert.ok(has(run({ robots: "User-agent: *\nDisallow: /\n" }), "robots"));
  assert.ok(has(run({ robots: "User-agent: Mediapartners-Google\nDisallow: /\n" }), "robots"));
});

test("reports a missing dist folder clearly", () => assert.match(checkDist(join(tmpdir(), "no-such-dist"))[0], /Run the build first/));
