import type { APIRoute } from "astro";

/**
 * /app-ads.txt for AdMob apps. It must be served from the developer website listed on the app's
 * Google Play listing. Paste the exact snippet from the AdMob console into APP_ADS_TXT
 * (several lines separated by "|").
 */
export const GET: APIRoute = () => {
  const lines = String(import.meta.env.APP_ADS_TXT ?? "").split("|").map((l) => l.trim()).filter(Boolean);
  const body = lines.length > 0 ? lines.join("\n") + "\n" : "# app-ads.txt: no ad lines configured\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
