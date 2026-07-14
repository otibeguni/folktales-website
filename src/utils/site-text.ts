const translations = {
  common: {
    siteTitle: "Otibeguni - Pioneering Bangladeshi Folklore R&D Company",
    siteDescription:
      "Pioneering Bangladeshi Folklore R&D company dedicated to revitalizing interest in Bengali and indigenous folklore.",
  },
  header: {
    navStories: "Stories",
    navExperiences: "Experiences",
    navBlog: "Blog",
    navTopics: "Topics",
    navBooks: "Books",
    navSourceTexts: "Source Texts",
    navPublish: "Publications",
    navAbout: "About Us",
  },
  footer: {
    copyright: "Copyright",
    allRightsReserved: "All rights reserved.",
  },
  pages: {
    stories: {
      searchLabel: "Search Stories",
      searchPlaceholder: "Search by title, slug, or category",
      searchHelperText:
        "Use search with language and category filters to narrow the list.",
      clearFiltersLabel: "Clear filters",
      languageLabel: "Language",
      categoryLabel: "Category",
      allCategoryLabel: "All Categories",
      noStoriesFoundLabel: "No stories found.",
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
    sourceTexts: {
      pageTitle: "Source Texts",
      pageDescription:
        "Browse poems and stories in their source form, linked back to books and retold stories where available.",
      resultsLabel: "source texts found",
      searchLabel: "Search Source Texts",
      searchPlaceholder: "Search by title, slug, book, or story",
      sourceBookLabel: "Source Book",
      linkedLabel: "Story Link",
      clearFiltersLabel: "Clear filters",
      allSourceBooksLabel: "All Source Books",
      allLinkedLabel: "All Source Texts",
      linkedStoryLabel: "Linked to Story",
      notLinkedLabel: "Not Linked",
      linkedStoryBadge: "Linked story",
      unlinkedBadge: "Standalone",
      storyLabel: "Story:",
      readLabel: "Read",
      noSourceTextsFoundLabel: "No source texts found.",
      previousLabel: "Previous",
      nextLabel: "Next",
      pageLabel: "Page",
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
      explorerCardTitle: "Topic Explorer",
      explorerCardDescription:
        "Follow how folklore topics connect to stories, books, and resources in one interactive view.",
      explorerPageTitle: "Topic Explorer",
      explorerPageDescription:
        "Explore how folklore topics connect to stories, books, and resources across the site.",
      explorerGraphTitle: "Relationship Graph",
      explorerBrowseTitle: "Filters and Search",
      explorerSearchLabel: "Search The Explorer",
      explorerSearchPlaceholder: "Search by name or slug",
      explorerSearchHelperText:
        "Choose a topic, story, book, or resource to bring it into focus.",
      explorerGraphSummaryLabel: "visible graph",
      explorerVisibleNodesLabel: "visible nodes",
      explorerVisibleEdgesLabel: "visible links",
      explorerClearFiltersLabel: "Clear filters",
      explorerClearFocusLabel: "Clear focus",
      explorerEntityTypesLabel: "Entity Types",
      explorerTopicTypesLabel: "Topic Types",
      explorerRelationTypesLabel: "Relation Types",
      explorerStoryLanguageLabel: "Story Language",
      explorerResourceTypeLabel: "Resource Type",
      explorerBookLanguageLabel: "Book Language",
      explorerBookCategoryLabel: "Book Category",
      explorerBookAvailabilityLabel: "Book Availability",
      explorerAllOptionLabel: "All",
      explorerAllBooksAvailabilityLabel: "All Books",
      explorerReadOnlineLabel: "Read Online",
      explorerPurchaseLabel: "Available for Purchase",
      explorerTopicEntityLabel: "Topics",
      explorerStoryEntityLabel: "Stories",
      explorerResourceEntityLabel: "Resources",
      explorerBookEntityLabel: "Books",
      explorerNoMatchingTopicsLabel: "No matching topics found.",
      explorerNoVisibleResultsLabel: "No graph elements match the current filters.",
      explorerPanelPrompt: "Select a topic or graph node to inspect its linked neighbors.",
      explorerDetailsTitle: "Details",
      explorerNeighborsTitle: "Connected Items",
      explorerTopicDetailsLabel: "Topic",
      explorerStoryDetailsLabel: "Story",
      explorerResourceDetailsLabel: "Resource",
      explorerBookDetailsLabel: "Book",
      explorerRelatedTopicsLabel: "Related Topics",
      explorerRelatedStoriesLabel: "Related Stories",
      explorerRelatedResourcesLabel: "Related Resources",
      explorerRelatedBooksLabel: "Related Books",
      explorerNoNeighborsLabel: "No visible linked items match the current filters.",
      explorerOpenItemLabel: "Open item",
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
