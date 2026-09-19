import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://haulnumbers.com",
  trailingSlash: "always",
  build: { inlineStylesheets: "auto" },
  integrations: [sitemap()],
});
