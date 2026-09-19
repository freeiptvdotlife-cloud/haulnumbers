import type { APIRoute } from "astro";

/**
 * /ads.txt for AdSense. Paste the exact snippet from the AdSense console into the ADS_TXT build
 * variable (several lines separated by "|"). Its format is:
 *   google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0
 * With no variable set this serves a harmless comment.
 */
export const GET: APIRoute = () => {
  const lines = String(import.meta.env.ADS_TXT ?? "").split("|").map((l) => l.trim()).filter(Boolean);
  const body = lines.length > 0 ? lines.join("\n") + "\n" : "# ads.txt: no ad lines configured\n";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
