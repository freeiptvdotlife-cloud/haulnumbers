import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { GUIDES } from "../data/guides";
import { SITE_NAME } from "../data/site";

export function GET(context: APIContext) {
  return rss({
    title: `${SITE_NAME} guides`,
    description: "Guides on trucking costs, taxes and pay, from Haul Numbers.",
    site: context.site!,
    items: GUIDES.map((g) => ({
      title: g.title,
      description: g.description,
      link: `/guides/${g.slug}/`,
      pubDate: new Date(`${g.reviewed ?? g.updated}T12:00:00Z`),
    })),
  });
}
