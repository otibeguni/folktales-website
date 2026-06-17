import { useDeferredValue, useEffect, useState } from 'react';

import type { IStoryList } from '@/types';
import CardStory from './CardStory';

const STORIES_PER_PAGE = 8;
const VALID_LANGUAGES = new Set(['en', 'bn']);

const parsePositivePage = (value: string | null) => {
  if (!value) {
    return 1;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const parseStoryListState = ({
  search,
  defaultLanguage,
  validCategories,
}: {
  search: string;
  defaultLanguage: string;
  validCategories: Set<string>;
}) => {
  const params = new URLSearchParams(search);
  const language = params.get('language');
  const category = params.get('category');
  const query = params.get('q')?.trim() ?? '';

  return {
    selectedLanguage:
      language && VALID_LANGUAGES.has(language) ? language : defaultLanguage,
    selectedCategory: category && validCategories.has(category) ? category : '',
    searchQuery: query,
    currentPage: parsePositivePage(params.get('page')),
  };
};

const StoryList = ({
  stories,
  lang,
  labels,
  path,
}: {
  stories: IStoryList[];
  lang: string;
  labels: { [key: string]: string };
  path: string;
}) => {
  const defaultLanguage = VALID_LANGUAGES.has(lang) ? lang : 'en';
  const categories = Array.from(
    new Set(
      stories
        .map((story) => story.frontmatter.category)
        .filter((category) => Boolean(category)),
    ),
  ).map((category) => ({
    label: category,
    value: category,
  }));
  const validCategories = new Set(categories.map((category) => category.value));

  const getInitialState = () =>
    parseStoryListState({
      search: typeof window === 'undefined' ? '' : window.location.search,
      defaultLanguage,
      validCategories,
    });

  const [selectedLanguage, setSelectedLanguage] = useState(
    () => getInitialState().selectedLanguage,
  );
  const [selectedCategory, setSelectedCategory] = useState(
    () => getInitialState().selectedCategory,
  );
  const [searchQuery, setSearchQuery] = useState(
    () => getInitialState().searchQuery,
  );
  const [currentPage, setCurrentPage] = useState(
    () => getInitialState().currentPage,
  );
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();

  const filteredStories = stories
    .filter((story) => story.frontmatter.language === selectedLanguage)
    .filter((story) => {
      if (selectedCategory) {
        return story.frontmatter.category === selectedCategory;
      }
      return true;
    })
    .filter((story) => {
      if (!normalizedSearchQuery) {
        return true;
      }

      const searchableText = [
        story.frontmatter.title,
        story.frontmatter.slug,
        story.frontmatter.category ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearchQuery);
    });

  const totalPages = Math.ceil(filteredStories.length / STORIES_PER_PAGE);
  const paginatedStories = filteredStories.slice(
    (currentPage - 1) * STORIES_PER_PAGE,
    currentPage * STORIES_PER_PAGE,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages > 0 ? totalPages : 1);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (selectedLanguage !== defaultLanguage) {
      params.set('language', selectedLanguage);
    }

    if (selectedCategory) {
      params.set('category', selectedCategory);
    }

    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    }

    if (currentPage > 1) {
      params.set('page', String(currentPage));
    }

    const nextSearch = params.toString();
    const nextUrl = nextSearch
      ? `${window.location.pathname}?${nextSearch}`
      : window.location.pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (currentUrl !== nextUrl) {
      window.history.replaceState(window.history.state, '', nextUrl);
    }
  }, [
    currentPage,
    defaultLanguage,
    searchQuery,
    selectedCategory,
    selectedLanguage,
  ]);

  useEffect(() => {
    const handlePopState = () => {
      const nextState = parseStoryListState({
        search: window.location.search,
        defaultLanguage,
        validCategories,
      });

      setSelectedLanguage(nextState.selectedLanguage);
      setSelectedCategory(nextState.selectedCategory);
      setSearchQuery(nextState.searchQuery);
      setCurrentPage(nextState.currentPage);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [defaultLanguage, validCategories]);

  const handleLanguageChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    event.preventDefault();
    setCurrentPage(1);
    setSelectedLanguage(event.target.value);
  };

  const handleCategoryChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    event.preventDefault();
    setCurrentPage(1);
    setSelectedCategory(event.target.value);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    setCurrentPage(1);
    setSearchQuery(event.target.value);
  };

  const clearFilters = () => {
    setCurrentPage(1);
    setSelectedLanguage(defaultLanguage);
    setSelectedCategory('');
    setSearchQuery('');
  };

  return (
    <div className="container mx-auto min-h-screen max-w-4xl">
      <div className="mx-3 my-8 flex flex-col gap-6 lg:mx-0">
        <section className="bg-base-200/50 rounded-3xl border border-base-300 p-4 md:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex justify-end">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={
                  selectedLanguage === defaultLanguage &&
                  !selectedCategory &&
                  !searchQuery.trim()
                }
                onClick={clearFilters}
              >
                {labels.clearFiltersLabel}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="form-control w-full md:col-span-2">
                <span className="mb-2 text-sm font-medium text-slate-700">
                  {labels.searchLabel}
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="input input-bordered w-full"
                  placeholder={labels.searchPlaceholder}
                />
                <span className="mt-2 text-sm text-slate-500">
                  {labels.searchHelperText}
                </span>
              </label>

              <label className="form-control w-full">
                <span className="mb-2 text-sm font-medium text-slate-700">
                  {labels.languageLabel}
                </span>
                <select
                  value={selectedLanguage}
                  onChange={handleLanguageChange}
                  className="select select-bordered w-full"
                >
                  <option value="en">English</option>
                  <option value="bn">Bengali</option>
                </select>
              </label>

              <label className="form-control w-full">
                <span className="mb-2 text-sm font-medium text-slate-700">
                  {labels.categoryLabel}
                </span>
                <select
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  className="select select-bordered w-full"
                >
                  <option value="">{labels.allCategoryLabel}</option>
                  {categories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </section>
      </div>

      {paginatedStories.length > 0 ? (
        <div className="mx-3 flex flex-col gap-4 xl:mx-0">
          {paginatedStories.map(({ frontmatter }) => (
            <CardStory
              key={`${frontmatter.language}-${frontmatter.slug}`}
              frontmatter={frontmatter}
              coverImage={frontmatter.cover_image}
              path={path}
            />
          ))}
        </div>
      ) : (
        <div className="mx-3 rounded-2xl border border-dashed border-base-300 px-6 py-12 text-center italic xl:mx-0">
          {labels.noStoriesFoundLabel}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-12 flex justify-center gap-4">
          <button
            className="btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
          >
            Prev
          </button>
          <span className="self-center">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default StoryList;
