export interface IFilterSelect {
  label: string;
  value?: string;
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
