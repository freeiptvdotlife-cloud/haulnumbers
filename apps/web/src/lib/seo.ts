import { SITE_URL } from "../data/site";

export interface Faq {
  q: string;
  a: string;
}

/** WebApplication and FAQPage structured data. Only pass FAQs that are visible on the page. */
export function toolJsonLd(opts: { name: string; path: string; faqs: readonly Faq[] }) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: opts.name,
      url: SITE_URL + opts.path,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: opts.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];
}
