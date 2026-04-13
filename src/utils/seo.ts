export type AlternateLink = {
  hreflang: string;
  href: string;
};

export function buildCanonicalUrl(pathname: string, site?: URL) {
  if (!site) return pathname;
  return new URL(pathname, site).toString();
}
