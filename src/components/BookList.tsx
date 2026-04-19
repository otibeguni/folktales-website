import { useDeferredValue, useState } from 'react';

import BookListItem from '@/components/BookListItem';
import type { SourceItemAlt, WikidataItemAlt } from '@/types';
import { sortTopicTags } from '@/utils/topic-tags';

const MAX_BOOKS = 12;

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

const BookList = ({
  books,
  topics,
  labels,
}: {
  books: SourceItemAlt[];
  topics: WikidataItemAlt[];
  labels: { [key: string]: string };
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('bn');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [topicQuery, setTopicQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const deferredTopicQuery = useDeferredValue(topicQuery);

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

  const availableTopicSlugs = new Set(
    books.flatMap((book) => book.topic_slugs ?? []),
  );
  const availableTopics = [...topics]
    .filter((topic) => availableTopicSlugs.has(topic.slug))
    .sort((a, b) => a.item.localeCompare(b.item));
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

  const filteredBooks = [
    ...books
      .filter((book) => getOptionValue(book.language) === selectedLanguage)
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
    setSelectedCategory('');
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
                disabled={!selectedCategory && selectedTopics.length === 0}
                onClick={clearFilters}
              >
                {labels.clearFiltersLabel}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
