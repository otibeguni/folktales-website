import { useDeferredValue, useEffect, useState } from 'react';

import BookListItem from '@/components/BookListItem';
import type { SourceItemAlt, WikidataItemAlt } from '@/types';
import { sortTopicTags } from '@/utils/topic-tags';

const MAX_BOOKS = 12;
const DEFAULT_LANGUAGE = 'bn';
const VALID_LANGUAGES = new Set(['bn', 'en']);
const VALID_AVAILABILITY = new Set(['read-online', 'purchase']);

const getOptionValue = (value: unknown) => {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object' && 'value' in value) {
    const nestedValue = (value as { value?: unknown }).value;
    return typeof nestedValue === 'string' ? nestedValue : '';
  }

  return '';
};

const parsePositivePage = (value: string | null) => {
  if (!value) {
    return 1;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const parseBookListState = ({
  search,
  validCategories,
  validTopics,
}: {
  search: string;
  validCategories: Set<string>;
  validTopics: Set<string>;
}) => {
  const params = new URLSearchParams(search);
  const language = params.get('language');
  const availability = params.get('availability');
  const category = params.get('category');
  const query = params.get('q')?.trim() ?? '';
  const topics = params
    .getAll('topic')
    .filter((topic, index, allTopics) => {
      return validTopics.has(topic) && allTopics.indexOf(topic) === index;
    });

  return {
    selectedLanguage: language && VALID_LANGUAGES.has(language)
      ? language
      : DEFAULT_LANGUAGE,
    selectedAvailability:
      availability && VALID_AVAILABILITY.has(availability) ? availability : '',
    selectedCategory: category && validCategories.has(category) ? category : '',
    searchQuery: query,
    selectedTopics: topics,
    currentPage: parsePositivePage(params.get('page')),
  };
};

const BookList = ({
  books,
  topics,
  labels,
}: {
  books: SourceItemAlt[];
  topics: WikidataItemAlt[];
  labels: { [key: string]: string };
}) => {
  const allCategories = Array.from(
    new Set(
      books
        .map((book) => getOptionValue(book.category))
        .filter((category) => Boolean(category)),
    ),
  );

  const categories = allCategories.map((category) => ({
    label: category,
    value: category,
  }));
  const validCategories = new Set(categories.map((category) => category.value));

  const availableTopicSlugs = new Set(
    books.flatMap((book) => book.topic_slugs ?? []),
  );
  const availableTopics = [...topics]
    .filter((topic) => availableTopicSlugs.has(topic.slug))
    .sort((a, b) => a.item.localeCompare(b.item));
  const validTopicSlugs = new Set(availableTopics.map((topic) => topic.slug));
  const getInitialState = () =>
    parseBookListState({
      search:
        typeof window === 'undefined' ? '' : window.location.search,
      validCategories,
      validTopics: validTopicSlugs,
    });
  const [selectedLanguage, setSelectedLanguage] = useState(
    () => getInitialState().selectedLanguage,
  );
  const [selectedAvailability, setSelectedAvailability] = useState(
    () => getInitialState().selectedAvailability,
  );
  const [selectedCategory, setSelectedCategory] = useState(
    () => getInitialState().selectedCategory,
  );
  const [searchQuery, setSearchQuery] = useState(
    () => getInitialState().searchQuery,
  );
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    () => getInitialState().selectedTopics,
  );
  const [topicQuery, setTopicQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(
    () => getInitialState().currentPage,
  );
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredTopicQuery = useDeferredValue(topicQuery);
  const allTypes = sortTopicTags(
    Array.from(new Set(availableTopics.flatMap((topic) => topic.types))),
  );
  const normalizedTopicQuery = deferredTopicQuery.trim().toLowerCase();
  const topicSuggestions = availableTopics
    .filter((topic) => !selectedTopics.includes(topic.slug))
    .filter((topic) => {
      if (!normalizedTopicQuery) {
        return false;
      }

      const sortedTags = sortTopicTags(topic.types);
      const searchableText = [topic.item, topic.slug, ...sortedTags]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedTopicQuery);
    })
    .slice(0, 8);
  const selectedTopicItems = selectedTopics
    .map((slug) => availableTopics.find((topic) => topic.slug === slug))
    .filter(Boolean) as WikidataItemAlt[];
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();

  const filteredBooks = [
    ...books
      .filter((book) => {
        if (!normalizedSearchQuery) {
          return true;
        }

        const searchableText = [
          book.name,
          book.slug,
          book.author ?? '',
        ]
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedSearchQuery);
      })
      .filter((book) => getOptionValue(book.language) === selectedLanguage)
      .filter((book) => {
        if (selectedAvailability) {
          return getOptionValue(book.availability) === selectedAvailability;
        }
        return true;
      })
      .filter((book) => {
        if (selectedCategory) {
          return getOptionValue(book.category) === selectedCategory;
        }
        return true;
      })
      .filter((book) => {
        if (selectedTopics.length > 0) {
          const topicSlugs = book.topic_slugs ?? [];
          return selectedTopics.every((selectedTopic) =>
            topicSlugs.includes(selectedTopic),
          );
        }
        return true;
      }),
  ];
  const totalPages = Math.ceil(filteredBooks.length / MAX_BOOKS);
  const paginatedBooks = filteredBooks.slice(
    (currentPage - 1) * MAX_BOOKS,
    currentPage * MAX_BOOKS,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages > 0 ? totalPages : 1);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (selectedLanguage !== DEFAULT_LANGUAGE) {
      params.set('language', selectedLanguage);
    }

    if (selectedAvailability) {
      params.set('availability', selectedAvailability);
    }

    if (selectedCategory) {
      params.set('category', selectedCategory);
    }

    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    }

    selectedTopics.forEach((topic) => {
      params.append('topic', topic);
    });

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
    searchQuery,
    selectedAvailability,
    selectedCategory,
    selectedLanguage,
    selectedTopics,
  ]);

  useEffect(() => {
    const handlePopState = () => {
      const nextState = parseBookListState({
        search: window.location.search,
        validCategories,
        validTopics: validTopicSlugs,
      });

      setSelectedLanguage(nextState.selectedLanguage);
      setSelectedAvailability(nextState.selectedAvailability);
      setSelectedCategory(nextState.selectedCategory);
      setSearchQuery(nextState.searchQuery);
      setSelectedTopics(nextState.selectedTopics);
      setCurrentPage(nextState.currentPage);
      setTopicQuery('');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [validCategories, validTopicSlugs]);

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

  const handleAvailabilityChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    event.preventDefault();
    setCurrentPage(1);
    setSelectedAvailability(event.target.value);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    setCurrentPage(1);
    setSearchQuery(event.target.value);
  };

  const toggleTopic = (topicSlug: string) => {
    setCurrentPage(1);
    setSelectedTopics((current) =>
      current.includes(topicSlug)
        ? current.filter((item) => item !== topicSlug)
        : [...current, topicSlug],
    );
    setTopicQuery('');
  };

  const clearFilters = () => {
    setCurrentPage(1);
    setSelectedLanguage(DEFAULT_LANGUAGE);
    setSelectedAvailability('');
    setSelectedCategory('');
    setSearchQuery('');
    setSelectedTopics([]);
    setTopicQuery('');
  };

  return (
    <div className="container mx-auto min-h-screen max-w-4xl">
      <div className="mx-3 my-8 flex flex-col gap-6 lg:mx-0">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            {labels.pageTitle}
          </h1>
          <p className="max-w-2xl text-base text-slate-600 md:text-lg">
            {labels.pageDescription}
          </p>
        </div>

        <section className="bg-base-200/50 rounded-3xl border border-base-300 p-4 md:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{labels.browseLabel}</h2>
                <p className="text-sm text-slate-600 md:text-base">
                  {filteredBooks.length} {labels.resultsLabel}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm self-start md:self-auto"
                disabled={
                  selectedLanguage === DEFAULT_LANGUAGE &&
                  !searchQuery.trim() &&
                  !selectedAvailability &&
                  !selectedCategory &&
                  selectedTopics.length === 0
                }
                onClick={clearFilters}
              >
                {labels.clearFiltersLabel}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="form-control w-full md:col-span-3">
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
                  {labels.availabilityLabel}
                </span>
                <select
                  value={selectedAvailability}
                  onChange={handleAvailabilityChange}
                  className="select select-bordered w-full"
                >
                  <option value="">{labels.allAvailabilityLabel}</option>
                  <option value="read-online">{labels.readOnlineLabel}</option>
                  <option value="purchase">{labels.availableForPurchaseLabel}</option>
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

            {availableTopics.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-slate-700">
                    {labels.topicsLabel}
                  </p>
                  <p className="text-sm text-slate-500">
                    {labels.topicHelperText}
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={topicQuery}
                    onChange={(event) => setTopicQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && topicSuggestions[0]) {
                        event.preventDefault();
                        toggleTopic(topicSuggestions[0].slug);
                      }
                    }}
                    className="input input-bordered w-full"
                    placeholder={labels.topicSearchPlaceholder}
                  />
                  {topicSuggestions.length > 0 && (
                    <div className="bg-base-100 absolute z-10 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-base-300 shadow-lg">
                      {topicSuggestions.map((topic) => {
                        const sortedTags = sortTopicTags(topic.types);
                        const typeLabel =
                          allTypes.length > 1 ? sortedTags.join(' / ') : '';

                        return (
                          <button
                            key={topic.slug}
                            type="button"
                            className="hover:bg-base-200 flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              toggleTopic(topic.slug);
                            }}
                          >
                            <span className="font-medium leading-snug">
                              {topic.item}
                            </span>
                            {typeLabel && (
                              <span className="text-sm text-slate-600">
                                {typeLabel}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {normalizedTopicQuery && topicSuggestions.length === 0 && (
                    <div className="mt-2 text-sm text-slate-500">
                      {labels.noMatchingTopicsLabel}
                    </div>
                  )}
                </div>
                {selectedTopicItems.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedTopicItems.map((topic) => (
                      <button
                        key={topic.slug}
                        type="button"
                        className="badge badge-primary gap-2 border px-3 py-3 text-primary-content"
                        onClick={() => toggleTopic(topic.slug)}
                      >
                        <span>{topic.item}</span>
                        <span aria-hidden="true">x</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {paginatedBooks.length > 0 ? (
        <div className="mx-3 flex flex-col gap-4 xl:mx-0">
          {paginatedBooks.map((book) => (
            <BookListItem key={book.slug} book={book} />
          ))}
        </div>
      ) : (
        <div className="mx-3 rounded-2xl border border-dashed border-base-300 px-6 py-12 text-center italic xl:mx-0">
          {labels.noBooksFoundLabel}
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

export default BookList;
