export type HomepageContentType =
  | "story"
  | "book"
  | "sourceText"
  | "topic"
  | "mazarTradition"
  | "resource"
  | "storyCollection"
  | "publication"
  | "blogPost"
  | "illustration";

export type HomepageSource =
  | { type: "story"; slug: string; language: "en" | "bn" }
  | {
      type: "illustration";
      key: string;
      filename: string;
      thumbnailUrl: string;
      fullUrl: string;
    }
  | {
      type: Exclude<HomepageContentType, "story" | "illustration">;
      slug: string;
    };

export type HomepageTileConfig = {
  id: string;
  source: HomepageSource;
  titleOverride?: string;
  descriptionOverride?: string;
  imageOverride?: string;
};

export type HomepageConfig = {
  version: 1;
  tiles: HomepageTileConfig[];
};

export type HomepageCatalogItem = {
  sourceKey: string;
  type: HomepageContentType;
  typeLabel: string;
  source: HomepageSource;
  title: string;
  description: string;
  image?: string;
  href: string;
  language?: string;
  isExternal?: boolean;
  searchText: string;
};

export type HomepageResolvedTile = HomepageCatalogItem & {
  id: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultImage?: string;
  titleOverride?: string;
  descriptionOverride?: string;
  imageOverride?: string;
};
