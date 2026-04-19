const translations = {
  common: {
    siteTitle: "Otibeguni - Pioneering Bangladeshi Folklore R&D Company",
    siteDescription:
      "Pioneering Bangladeshi Folklore R&D company dedicated to revitalizing interest in Bengali and indigenous folklore.",
  },
  header: {
    navHome: "Home",
    navStories: "Stories",
    navBlog: "Blog",
    navCodex: "Codex",
    navResources: "Resources",
    navTopics: "Topics",
    navBooks: "Books",
    navProjects: "Projects",
    navPublish: "Publications",
    navLibrary: "Folklore Library",
    navGallery: "Art Gallery",
    navAbout: "About Us",
  },
  footer: {
    copyright: "Copyright",
    allRightsReserved: "All rights reserved.",
  },
  pages: {
    stories: {
      filterLabel: "Filter Stories",
      languageLabel: "Language",
      categoryLabel: "Category",
      allCategoryLabel: "All Categories",
    },
    topics: {
      filterLabel: "Filter Types",
      typesLabel: "Types",
      clearFiltersLabel: "Clear filters",
    },
    books: {
      filterLabel: "Filter Books",
      languageLabel: "Language",
      categoryLabel: "Category",
      topicsLabel: "Topics",
      clearFiltersLabel: "Clear filters",
      allCategoryLabel: "All Categories",
    },
  },
} as const;

export const currentLanguage = "en";

export const changeLanguage = async (_language: string) => currentLanguage;

export function localizePath(path = "/") {
  return path || "/";
}

export function t(key: string) {
  const value = key
    .split(".")
    .reduce<unknown>((accumulator, segment) => {
      if (
        accumulator &&
        typeof accumulator === "object" &&
        segment in accumulator
      ) {
        return (accumulator as Record<string, unknown>)[segment];
      }

      return undefined;
    }, translations);

  return typeof value === "string" ? value : key;
}
