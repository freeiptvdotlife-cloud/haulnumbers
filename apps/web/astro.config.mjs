import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// PUBLIC_SITE_URL lets a staging build (e.g. https://haulnumbers.pages.dev) use its own address for canonical links, the
// sitemap, share images and structured data. Production builds leave it unset.
const SITE = (process.env.PUBLIC_SITE_URL || "https://haulnumbers.com").replace(/\/+$/, "");

export default defineConfig({
  site: SITE,
  trailingSlash: "always",
  build: { inlineStylesheets: "auto" },
  integrations: [sitemap()],
});
