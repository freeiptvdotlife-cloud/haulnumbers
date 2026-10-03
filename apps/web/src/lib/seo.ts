import { SITE_URL } from "../data/site";

export interface Faq {
  q: string;
  a: string;
}

/** WebApplication and BreadcrumbList structured data for calculator pages. */
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
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Calculators", item: `${SITE_URL}/calculators/` },
        { "@type": "ListItem", position: 2, name: opts.name, item: SITE_URL + opts.path },
      ],
    },
  ];
}
