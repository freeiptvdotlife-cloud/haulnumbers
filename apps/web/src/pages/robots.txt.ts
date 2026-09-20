import type { APIRoute } from "astro";
import { SITE_URL } from "../data/site";

/** Everything is crawlable (Google's ad crawler included). A staging build stays out of search results with a noindex meta tag, which crawlers can only see if they are allowed in. */
export const GET: APIRoute = () =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap-index.xml\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
