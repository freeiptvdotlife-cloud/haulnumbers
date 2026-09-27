/** The public address of this build. Staging builds set PUBLIC_SITE_URL; production uses the real domain. */
export const SITE_URL: string = (import.meta.env.PUBLIC_SITE_URL || "https://haulnumbers.com").replace(/\/+$/, "");

export const SITE_NAME = "Haul Numbers";

/** The publisher of record across the sahamo portfolio (haulnumbers.com, funding-numbers.com, etc). */
export const PUBLISHER_BRAND = "sahamo";

/**
 * Author for the byline and the /about/ page, which doubles as the publisher hub for sahamo
 * (docs/strategy/04-content-pipeline.md, Phase 0). Contact email isn't duplicated here: it's
 * already read from PUBLIC_CONTACT_EMAIL, the same env var contact.astro uses, and the existing
 * scripts/complianceCheck.mjs (`contact` rule) already refuses a monetised build without it — no
 * need for a second, parallel launch guard.
 */
export const AUTHOR = {
  name: "Alex Morgan",
  role: "Editor",
  bio: "Alex Morgan builds and maintains the calculators published under sahamo — tools that turn official IRS, SBA, HUD and state-agency numbers into plain answers for truckers, landlords, freelancers, small business owners and anyone navigating debt or a settlement. Every figure is checked against its source before publishing, and each guide shows the date it was last reviewed against that source.",
};

export interface Source {
  title: string;
  url: string;
  accessed: string;
}
