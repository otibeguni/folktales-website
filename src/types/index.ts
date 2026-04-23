export interface IStory {
  title: string;
  title_bn?: string;
  category: string;
  slug: string;
  url_slug?: string;
  language: string;
  cover_image?: string;
  source_slug?: string;
  source_label?: string;
  topic_slugs?: string[];
  resource_slugs?: string[];
}

export interface IStoryList {
  frontmatter: IStory;
}

export interface WikidataItem {
  slug: string;
  item: string;
  types: string[];
  description?: string;
  wikidata_id?: string;
  item_bn?: string;
}

export interface WikidataItemAlt extends WikidataItem {}

export interface SourceItem {
  slug?: string;
  name: string;
  author?: string;
  url?: string;
  library_url?: string;
  language?: string;
  category?: string;
  categories?: string[];
  topic_slugs?: string[];
}

export interface SourceItemAlt extends SourceItem {
  slug: string;
  language: string;
  category: string;
  topic_slugs?: string[];
  detailHref?: string;
  availability?: "read-online" | "purchase";
}

export interface MetadataItem {
  slug: string;
  related_wikidata: WikidataItem[];
  sources: SourceItem[];
  related_resources: ResourceItem[];
  cover_image?: string;
}

export interface Frontmatter extends IStory {}

export interface Story {
  frontmatter: Frontmatter;
  file: string;
  related_wikidata?: WikidataItem[];
  sources?: SourceItem[];
}

export interface StoryItem {
  params: {
    slug: string;
  };
  props: {
    story: Story;
  };
}

export interface ResourceItem {
  slug: string;
  title: string;
  url?: string;
  type: string;
  topic_slugs?: string[];
}

export interface ResourceItemAlt extends ResourceItem {}

export interface IBreadcrumbs {
  label: string;
  href?: string;
}

export interface IStoryCollection {
  title: string;
  slug: string;
  order: number;
  isShow: boolean;
  stories: string[];
}

export interface IStoryCollectionList {
  frontmatter: IStoryCollection;
}

export interface IBlog {
  title: string;
  slug: string;
  date: string;
  coverImage: string;
}
