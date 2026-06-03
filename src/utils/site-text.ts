const translations = {
  common: {
    siteTitle: "Otibeguni - Pioneering Bangladeshi Folklore R&D Company",
    siteDescription:
      "Pioneering Bangladeshi Folklore R&D company dedicated to revitalizing interest in Bengali and indigenous folklore.",
  },
  header: {
    navHome: "Home",
    navStories: "Stories",
    navExperiences: "Experiences",
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
      searchLabel: "Search Books",
      searchPlaceholder: "Search by title, slug, or author",
      searchHelperText: "Use search with filters to narrow the list.",
      languageLabel: "Language",
      availabilityLabel: "Availability",
      categoryLabel: "Category",
      topicsLabel: "Topics",
      topicHelperText: "Search and add one or more topics to narrow the list.",
      clearFiltersLabel: "Clear filters",
      allAvailabilityLabel: "All Books",
      readOnlineLabel: "Read Online",
      availableForPurchaseLabel: "Available for Purchase",
      allCategoryLabel: "All Categories",
      topicSearchPlaceholder: "Search topics to add",
      noMatchingTopicsLabel: "No matching topics found.",
      noBooksFoundLabel: "No books found.",
    },
    experiences: {
      pageTitle: "Experiences",
      pageDescription:
        "Interactive ways to explore Bengali and indigenous folklore through maps, visual storytelling, and research-driven interfaces.",
      atlasCardTitle: "Folklore Atlas",
      atlasCardDescription:
        "Browse folklore-linked places, rivers, kingdoms, and heritage sites on a static interactive map.",
      dialectCardTitle: "Dialect Map",
      dialectCardDescription:
        "Listen to regional Bangladeshi dialect samples on an interactive map with labeled locations.",
      atlasPageTitle: "Folklore Atlas",
      atlasPageDescription:
        "Explore a build-time map of places tied to Bengali and indigenous folklore, then open each marker to see stories linked to that location.",
      dialectPageTitle: "Dialect Map",
      dialectPageDescription:
        "Explore regional dialect recordings from across Bangladesh by selecting a labeled location on the map.",
      dialectSourceTitle: "Dataset Source",
      dialectSourceDescription:
        "Audio samples in this experience are drawn from RegSpeech12, a regional corpus of Bengali spontaneous speech across dialects.",
      dialectSourceAuthorsLabel: "Contributors",
      dialectSourceCitationLabel: "Citation",
      atlasRelatedStoriesTitle: "Related Stories",
      atlasRelatedResourcesTitle: "Related Resources",
      atlasNoStoriesLabel: "No related stories are linked to this location yet.",
      atlasPanelPrompt: "Select a marker to explore a location and its related stories.",
      atlasMarkerCountLabel: "mapped locations",
      dialectPanelPrompt: "Select a marker to hear a dialect recording from that region.",
      dialectMarkerCountLabel: "dialect regions",
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
