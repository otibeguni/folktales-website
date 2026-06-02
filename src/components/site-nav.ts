import { localizePath, t } from "@/utils/site-text";

export interface SiteNavLink {
  label: string;
  href: string;
}

export interface SiteNavItem {
  label: string;
  href?: string | null;
  children?: SiteNavLink[];
}

export const siteNav: SiteNavItem[] = [
  {
    label: t("header.navHome"),
    href: localizePath("/"),
  },
  {
    label: t("header.navStories"),
    href: localizePath("/stories"),
  },
  {
    label: t("header.navExperiences"),
    href: localizePath("/experiences"),
  },
  {
    label: t("header.navBlog"),
    href: localizePath("/blog"),
  },
  {
    label: t("header.navCodex"),
    href: localizePath("/codex"),
  },
  {
    label: t("header.navResources"),
    href: null,
    children: [
      {
        label: t("header.navBooks"),
        href: localizePath("/books"),
      },
      {
        label: t("header.navTopics"),
        href: localizePath("/topics"),
      },
    ],
  },
  {
    label: t("header.navProjects"),
    href: null,
    children: [
      {
        label: t("header.navPublish"),
        href: localizePath("/publications"),
      },
      {
        label: t("header.navLibrary"),
        href: "https://library.otibeguni.com/",
      },
      {
        label: t("header.navGallery"),
        href: "https://art.otibeguni.com/",
      },
    ],
  },
  {
    label: t("header.navAbout"),
    href: localizePath("/about"),
  },
];

export function isCurrentNavPath(currentPath: string, href?: string | null) {
  if (!href || !href.startsWith("/")) {
    return false;
  }

  if (href === "/") {
    return currentPath === "/";
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}
