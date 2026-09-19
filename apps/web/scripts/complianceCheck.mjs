// Checks a BUILT site (dist/) against the Google AdSense rules that can be verified mechanically.
// It is a safety net, not a substitute for reading the policies: see docs/05-monetization-compliance.md.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** The only pages allowed to carry ads: pages whose main content is the calculator plus its explanation. */
export const AD_PAGES = ["cost-per-mile-calculator", "load-profit-calculator", "detention-pay-calculator", "ifta-calculator", "per-diem-calculator"];
/** Pages every site needs; none of them may ever carry ads (no ads on non-content pages). */
export const REQUIRED_PAGES = ["privacy", "about", "contact", "terms"];
export const MIN_WORDS_ON_AD_PAGE = 300;

// Wording AdSense forbids because it invites clicks or compensates for them.
const FORBIDDEN_PHRASES = [
  /\bclick (on )?(the |our |these |an? )?ads?\b/i,
  /\bsupport (us|this site) by clicking\b/i,
  /\bhelp (keep|support) (this site|us)\b/i,
  /\bfeel free to click\b/i,
];

const ADS_TXT_LINE = /^google\.com, pub-(\d{16}), (DIRECT|RESELLER)(, [0-9a-f]{16})?$/;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const visibleText = (html) =>
  html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

/** The page's own content, without the shared header and footer (which link to every policy page). */
const mainHtml = (html) => /<main[\s\S]*?<\/main>/i.exec(html)?.[0] ?? html;

export function checkDist(dist, env = {}) {
  const problems = [];
  const fail = (rule, msg) => problems.push(`[${rule}] ${msg}`);
  if (!existsSync(dist)) return [`[setup] ${dist} does not exist. Run the build first.`];

  const pages = new Map();
  for (const file of walk(dist)) {
    if (!file.endsWith(`${sep}index.html`) && file !== join(dist, "index.html")) continue;
    const key = relative(dist, file).replace(/index\.html$/, "").split(sep).join("/").replace(/\/$/, "") || "/";
    pages.set(key, readFileSync(file, "utf8"));
  }
  const clientSet = Boolean(env.PUBLIC_ADSENSE_CLIENT);

  // 1. Required pages exist, are linked from the footer of every page, and are in the sitemap.
  const sitemap = existsSync(join(dist, "sitemap-0.xml")) ? readFileSync(join(dist, "sitemap-0.xml"), "utf8") : "";
  for (const name of REQUIRED_PAGES) {
    if (!pages.has(name)) { fail("required-pages", `/${name}/ is missing`); continue; }
    if (!sitemap.includes(`/${name}/`)) fail("required-pages", `/${name}/ is not in the sitemap`);
    for (const [key, html] of pages) if (!html.includes(`href="/${name}/"`)) { fail("required-pages", `/${name}/ is not linked from ${key === "/" ? "the home page" : "/" + key + "/"}`); break; }
  }

  // 2. Ads only on content pages, labelled, and with enough real content.
  for (const [key, html] of pages) {
    const hasRealAd = /<ins[^>]*class="adsbygoogle"/.test(html);
    const hasPreview = html.includes("data-ads-preview");
    const hasAd = hasRealAd || hasPreview;
    const hasLoader = html.includes("pagead2.googlesyndication.com");
    // A preview placeholder is never deployable. It is only tolerated when explicitly allowed (local layout review).
    if (hasPreview && !env.ALLOW_PREVIEW) fail("preview", `/${key === "/" ? "" : key + "/"} contains the ad PREVIEW placeholder: this build must not be deployed (use --allow-preview only for local review)`);
    // The loader may only be on ad pages: elsewhere it would let Auto ads reach non-content pages.
    if (hasLoader && !AD_PAGES.includes(key)) fail("ad-placement", `/${key === "/" ? "" : key + "/"} loads the AdSense script but is not a content page`);
    if (hasRealAd && !hasLoader) fail("ads-config", `/${key}/ has an ad unit but does not load the AdSense script`);
    if (!hasAd) continue;
    if (!AD_PAGES.includes(key)) { fail("ad-placement", `/${key}/ carries ads but is not a content page (ads are not allowed on non-content pages)`); continue; }
    if (!/>\s*Advertisement\s*</.test(html)) fail("ad-label", `/${key}/ has an ad without a visible "Advertisement" label`);
    const words = visibleText(mainHtml(html)).split(" ").length;
    if (words < MIN_WORDS_ON_AD_PAGE) fail("thin-content", `/${key}/ has an ad but only ${words} words (need at least ${MIN_WORDS_ON_AD_PAGE})`);
  }

  // 3. No wording that invites or rewards ad clicks, anywhere on the site.
  for (const [key, html] of pages) {
    const text = visibleText(html);
    for (const re of FORBIDDEN_PHRASES) {
      const m = re.exec(text);
      if (m) fail("click-inducing-text", `/${key === "/" ? "" : key + "/"} contains "${m[0]}"`);
    }
  }

  // 4. The privacy policy must disclose the advertising cookies and offer the opt-outs.
  const privacy = pages.has("privacy") ? mainHtml(pages.get("privacy")) : undefined;
  if (privacy) {
    const t = visibleText(privacy).toLowerCase();
    const need = [
      ["mentions Google", t.includes("google")],
      ["mentions cookies", t.includes("cookies")],
      ["explains third-party vendors serve ads", t.includes("third-party vendors")],
      ["links Google Ads Settings", privacy.includes("adssettings.google.com")],
      ["links Google's advertising technologies page", privacy.includes("policies.google.com/technologies/ads")],
      ["links Google's Business Data Responsibility page", privacy.includes("business.safety.google")],
      ["links aboutads.info opt-out", privacy.includes("aboutads.info")],
      ["says who the site is not directed at (children)", t.includes("children")],
      ["points to the contact page", privacy.includes('href="/contact/"')],
    ];
    for (const [what, ok] of need) if (!ok) fail("privacy-policy", `privacy policy missing: ${what}`);
  }

  // 5. ads.txt, contact address and ad units when a publisher id is configured.
  const adsTxtPath = join(dist, "ads.txt");
  if (clientSet) {
    const pub = /^ca-(pub-\d{16})$/.exec(env.PUBLIC_ADSENSE_CLIENT);
    if (!pub) fail("ads-config", `PUBLIC_ADSENSE_CLIENT "${env.PUBLIC_ADSENSE_CLIENT}" is not in the form ca-pub-<16 digits>`);
    const lines = existsSync(adsTxtPath) ? readFileSync(adsTxtPath, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")) : [];
    if (lines.length === 0) fail("ads.txt", "ads.txt has no lines; set ADS_TXT to the snippet from the AdSense console");
    for (const l of lines) if (!ADS_TXT_LINE.test(l)) fail("ads.txt", `ads.txt line is not in the expected format: "${l}"`);
    if (pub && lines.length > 0 && !lines.some((l) => l.includes(pub[1]))) fail("ads.txt", `ads.txt does not contain publisher id ${pub[1]}`);
    if (!env.PUBLIC_CONTACT_EMAIL) fail("contact", "PUBLIC_CONTACT_EMAIL must be set before ads go live");
    else if (pages.has("contact") && !pages.get("contact").includes(env.PUBLIC_CONTACT_EMAIL)) fail("contact", "the contact page does not show PUBLIC_CONTACT_EMAIL");
    for (const name of AD_PAGES) if (pages.has(name) && !pages.get(name).includes("data-ad-slot")) fail("ads-config", `/${name}/ has no ad unit configured (set its PUBLIC_ADSENSE_SLOT_* variable)`);
  } else {
    for (const [key, html] of pages) if (html.includes("adsbygoogle")) fail("ads-config", `/${key === "/" ? "" : key + "/"} carries ads or the AdSense script but PUBLIC_ADSENSE_CLIENT is not set`);
  }

  // 6. Crawlers (including Google's ad crawler) must be allowed.
  const robotsPath = join(dist, "robots.txt");
  if (existsSync(robotsPath)) {
    const robots = readFileSync(robotsPath, "utf8");
    if (/^\s*Disallow:\s*\/\s*$/im.test(robots)) fail("robots", "robots.txt disallows the whole site");
    if (/mediapartners-google/i.test(robots)) fail("robots", "robots.txt mentions Mediapartners-Google; do not block Google's ad crawler");
  } else fail("robots", "robots.txt is missing");

  return problems;
}
