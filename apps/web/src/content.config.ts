import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/** Daily trucking digest posts written by scripts/digest (reviewed via pull request before they merge). */
const news = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/news" }),
  schema: z.object({
    title: z.string().min(20).max(90),
    description: z.string().min(80).max(170),
    date: z.coerce.date(),
    model: z.string(),
    tools: z.array(z.string()).max(2),
    sources: z.array(z.object({ publisher: z.string(), title: z.string(), url: z.url() })).min(3).max(5),
  }),
});

export const collections = { news };
