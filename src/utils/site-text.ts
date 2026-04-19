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
      pageTitle: "Topics",
      pageDescription:
        "Browse the people, places, beings, works, and ideas that shape Bengali and indigenous folklore.",
      browseLabel: "Browse Collection",
      resultsLabel: "topics found",
      searchLabel: "Search",
      searchPlaceholder: "Search topics by title, description, or type",
      typesLabel: "Types",
      searchHelperText: "Use search and type filters together to narrow the list.",
      clearFiltersLabel: "Clear filters",
      noTopicsFoundLabel: "No topics found.",
    },
    books: {
      pageTitle: "Books",
      pageDescription:
        "Browse the Otibeguni folklore book collection by language, category, and topic.",
      browseLabel: "Browse Collection",
      resultsLabel: "books found",
      languageLabel: "Language",
      categoryLabel: "Category",
      topicsLabel: "Topics",
      topicHelperText: "Search and add one or more topics to narrow the list.",
      clearFiltersLabel: "Clear filters",
      allCategoryLabel: "All Categories",
      topicSearchPlaceholder: "Search topics to add",
      noMatchingTopicsLabel: "No matching topics found.",
      noBooksFoundLabel: "No books found.",
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
