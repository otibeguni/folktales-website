import type { IBreadcrumbs } from "@/types";
import { localizePath } from "@/utils/site-text";

export type AlternateLink = {
  hreflang: string;
  href: string;
};

export function buildCanonicalUrl(pathname: string, site?: URL) {
  if (!site) return pathname;
  return new URL(pathname, site).toString();
}

export type NormalizedBreadcrumb = {
  label: string;
  href?: string;
  absoluteHref?: string;
  isCurrent: boolean;
};

export function normalizeBreadcrumbs(
  breadcrumbs: IBreadcrumbs[] = [],
  site?: URL,
): {
  items: NormalizedBreadcrumb[];
  structuredData: Record<string, unknown> | null;
} {
  const trail = [{ label: "Home", href: "/" }, ...breadcrumbs].filter(
    (item) => item.label?.trim().length,
  );

  const items = trail.map((item, index) => {
    const href = item.href ? localizePath(item.href) : undefined;
    return {
      label: item.label.trim(),
      href,
      absoluteHref: href ? buildCanonicalUrl(href, site) : undefined,
      isCurrent: index === trail.length - 1,
    };
  });

  const structuredData =
    items.length >= 2
      ? {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((item, index) => {
            const listItem: Record<string, unknown> = {
              "@type": "ListItem",
              position: index + 1,
              name: item.label,
            };

            if (!item.isCurrent && item.absoluteHref) {
              listItem.item = item.absoluteHref;
            }

            return listItem;
          }),
        }
      : null;

  return { items, structuredData };
}
