/** The public address of this build. Staging builds set PUBLIC_SITE_URL; production uses the real domain. */
export const SITE_URL: string = (import.meta.env.PUBLIC_SITE_URL || "https://haulnumbers.com").replace(/\/+$/, "");
