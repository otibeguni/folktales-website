export interface IFilterSelect {
  label: string;
  value: string;
  options: ISelect[];
  handleChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export interface ISelect {
  value: string;
  label: string;
}

export interface IStory {
  title: string;
  category: string;
  slug: string;
  language: string;
  source: string;
}

export interface IStoryList {
  frontmatter: IStory;
}

export interface WikidataItem {
  id: number;
  value: string;
  order: string;
  type?: string;
  slug?: string;
}

export interface WikidataItemAlt {
  id: number;
  order: string;
  slug: string;
  item: string;
  wikidata_id: string;
  type: string;
  description?: string;
}

export interface SourceItem {
  id: number;
  value: string;
  order: string;
  author?: string;
  library_url?: string;
  slug?: string;
}

export interface SourceItemAlt {
  id: number;
  name: string;
  order: string;
  author?: string;
  url?: string;
  library_url?: string;
  slug?: string;
  language: string;
  category: string;
}

export interface MetadataItem {
  id: number;
  order: string;
  slug: string;
  related_wikidata: WikidataItem[];
  sources: SourceItem[];
}

export interface Frontmatter {
  title: string;
  title_bn?: string;
  category: string;
  source: string;
  slug: string;
  language: string;
}

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
  id: number;
  value: string;
  order: string;
  type: {
    id: number;
    value: string;
  };
  url?: string;
}

export interface IBreadcrumbs {
  label: string;
  href: string;
}
