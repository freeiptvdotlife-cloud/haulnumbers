import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AD_PAGES, REQUIRED_PAGES, checkDist, isAdPage } from "./complianceCheck.mjs";

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
  pages["guides"] = `<main><h1>Guides</h1><p>${words(400)}</p></main>${FOOTER}`;
  pages["guides/sample"] = `<main><h1>Guide</h1><p>${words(1000)}</p>${AD}</main>${FOOTER}`;
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
  const adFree = Object.fromEntries([...AD_PAGES, "guides/sample"].map((p) => [p, `<main><h1>${p}</h1><p>${words(400)}</p></main>${FOOTER}`]));
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

const PREVIEW = `<aside><p>Advertisement</p><div data-ads-preview>placeholder</div></aside>`;
const previewPages = Object.fromEntries([...AD_PAGES, "guides/sample"].map((p) => [p, `<main><h1>${p}</h1><p>${words(400)}</p>${PREVIEW}</main>${FOOTER}`]));

test("an ad PREVIEW placeholder blocks a deploy check but is tolerated for local review", () => {
  assert.ok(has(run({ pages: previewPages }, {}), "preview"));
  assert.ok(has(run({ pages: previewPages }, MONETISED), "preview"));
  assert.deepEqual(run({ pages: previewPages }, { ALLOW_PREVIEW: "1" }), []);
});

test("a preview placeholder still may not appear on a non-content page, even when previews are allowed", () => {
  const bad = { privacy: `<main>${PRIVACY}${PREVIEW}</main>${FOOTER}` };
  assert.ok(has(run({ pages: bad }, { ALLOW_PREVIEW: "1" }), "ad-placement"));
});

test("a preview placeholder still needs the Advertisement label and real content", () => {
  const noLabel = { "ifta-calculator": `<main><p>${words(400)}</p><div data-ads-preview></div></main>${FOOTER}` };
  assert.ok(has(run({ pages: noLabel }, { ALLOW_PREVIEW: "1" }), "ad-label"));
  const thin = { "ifta-calculator": `<main><p>${words(20)}</p>${PREVIEW}</main>${words(400)}${FOOTER}` };
  assert.ok(has(run({ pages: thin }, { ALLOW_PREVIEW: "1" }), "thin-content"));
});

test("guide articles may carry ads but the guides index may not", () => {
  assert.deepEqual(run({}), []);
  assert.ok(has(run({ pages: { guides: `<main><p>${words(400)}</p>${AD}</main>${FOOTER}` } }), "ad-placement"));
  assert.ok(has(run({ pages: { guides: `<main><p>${words(400)}</p>${LOADER}</main>${FOOTER}` } }), "ad-placement"));
});

test("guide ad pages get the same label, content and configuration rules as tool pages", () => {
  assert.ok(has(run({ pages: { "guides/sample": `<main><p>${words(1000)}</p>${LOADER}<ins class="adsbygoogle" data-ad-slot="1"></ins></main>${FOOTER}` } }), "ad-label"));
  assert.ok(has(run({ pages: { "guides/sample": `<main><p>${words(30)}</p>${AD}</main>${words(400)}${FOOTER}` } }), "thin-content"));
  const noSlot = `<main><p>${words(1000)}</p><p>Advertisement</p>${LOADER}<ins class="adsbygoogle"></ins></main>${FOOTER}`;
  assert.ok(has(run({ pages: { "guides/sample": noSlot } }), "ads-config"));
});

test("isAdPage: tools and guide articles yes; index, legal and home no", () => {
  for (const k of [...AD_PAGES, "guides/how-to"]) assert.ok(isAdPage(k), k);
  for (const k of ["guides", "privacy", "about", "contact", "terms", "calculators", "/"]) assert.ok(!isAdPage(k), k);
});

test("a monetised build fails when a normal page is noindex, but a noindex 404 is fine", () => {
  const meta = '<meta name="robots" content="noindex, nofollow">';
  assert.ok(has(run({ pages: { about: `<head>${meta}</head><main>x</main>${FOOTER}` } }), "noindex"));
  assert.deepEqual(run({ pages: { "404": `<head>${meta}</head><main>gone</main>${FOOTER}` } }), []);
  assert.deepEqual(run({ pages: { about: `<head>${meta}</head><main>x</main>${FOOTER}` } }, {}).filter((p) => p.startsWith("[noindex]")), []);
});

test("verification-only stage: client id set, meta tag present, no ad units, everything else still enforced", () => {
  const meta = `<head><meta name="google-adsense-account" content="${CLIENT}"></head>`;
  const noAds = Object.fromEntries([...AD_PAGES, "guides/sample"].map((p) => [p, `<main><h1>${p}</h1><p>${words(400)}</p></main>${FOOTER}`]));
  const env = { ...MONETISED, PUBLIC_ADSENSE_VERIFY_ONLY: "1" };
  // Without the flag, missing ad units are an error; with it, a compliant verification build passes.
  assert.ok(has(run({ pages: { ...noAds, "": `${meta}<h1>Home</h1>${FOOTER}` } }, MONETISED), "ads-config"));
  assert.deepEqual(run({ pages: { ...noAds, "": `${meta}<h1>Home</h1>${FOOTER}` } }, env), []);
  // The meta tag is required, and ads must not be present in this stage.
  assert.ok(has(run({ pages: noAds }, env), "verify-only"));
  assert.ok(has(run({ pages: { ...noAds, "": `${meta}<h1>Home</h1>${FOOTER}` , "ifta-calculator": `<main><p>${words(400)}</p>${AD}</main>${FOOTER}` } }, env), "verify-only"));
  // ads.txt and the contact email are still required.
  assert.ok(has(run({ pages: { ...noAds, "": `${meta}<h1>Home</h1>${FOOTER}` }, adsTxt: null }, env), "ads.txt"));
  assert.ok(has(run({ pages: { ...noAds, "": `${meta}<h1>Home</h1>${FOOTER}` } }, { ...env, PUBLIC_CONTACT_EMAIL: "" }), "contact"));
});

test("all published addresses must share one origin (no production URL leaking into staging)", () => {
  const page = (origin, canon = origin) => `<head><link rel="canonical" href="${canon}/about/"><meta property="og:image" content="${origin}/og.png"></head><main>x</main>${FOOTER}`;
  // The fixture's own sitemap uses https://x.test, so that is the one consistent origin.
  assert.deepEqual(run({ pages: { about: page("https://x.test") } }, {}).filter((p) => p.startsWith("[site-url]")), []);
  assert.ok(has(run({ pages: { about: page("https://x.test", "https://b.test") } }, {}), "site-url"));
  assert.ok(has(run({ pages: { about: page("https://other.test") } }, {}), "site-url"));
  const ld = `<script type="application/ld+json">{"@type":"WebSite","url":"https://prod.test/"}</script>`;
  assert.ok(has(run({ pages: { about: `<head><link rel="canonical" href="https://x.test/about/">${ld}</head><main>x</main>${FOOTER}` } }, {}), "site-url"));
});

test("reports a missing dist folder clearly", () => assert.match(checkDist(join(tmpdir(), "no-such-dist"))[0], /Run the build first/));
