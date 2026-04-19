import { useState } from 'react';

import BookCardSource from '@/components/BookCardSource';
import Select from '@/components/Select.tsx';
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
  const [currentPage, setCurrentPage] = useState(1);

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
  };

  const clearTopicFilters = () => {
    setCurrentPage(1);
    setSelectedTopics([]);
  };

  return (
    <div className="container mx-auto min-h-screen max-w-3xl">
      <div className="mx-3 my-5 flex flex-col gap-4 lg:mx-0">
        <h2 className="text-2xl font-bold">{labels.filterLabel}</h2>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Select
            label={labels.languageLabel}
            value={selectedLanguage}
            handleChange={handleLanguageChange}
            options={[
              {
                label: 'English',
                value: 'en',
              },
              {
                label: 'Bengali',
                value: 'bn',
              },
            ]}
          />
          <Select
            label={labels.categoryLabel}
            value={selectedCategory}
            handleChange={handleCategoryChange}
            options={[
              {
                label: labels.allCategoryLabel,
                value: '',
              },
              ...categories,
            ]}
          />
        </div>
        {availableTopics.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-slate-600">
                {labels.topicsLabel}
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={selectedTopics.length === 0}
                onClick={clearTopicFilters}
              >
                {labels.clearFiltersLabel}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTopics.map((topic) => {
                const isSelected = selectedTopics.includes(topic.slug);
                const sortedTags = sortTopicTags(topic.types);
                const typeLabel =
                  allTypes.length > 1 ? ` (${sortedTags.join(' / ')})` : '';

                return (
                  <button
                    key={topic.slug}
                    type="button"
                    className={`badge cursor-pointer border px-3 py-3 transition ${
                      isSelected
                        ? 'badge-primary text-primary-content'
                        : 'badge-soft badge-primary'
                    }`}
                    onClick={() => toggleTopic(topic.slug)}
                  >
                    {topic.item}
                    {typeLabel}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      <div className="divider my-5"></div>
      {paginatedBooks.length > 0 ? (
        <div className="mx-3 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:mx-0">
          {paginatedBooks.map((book) => (
            <BookCardSource key={book.slug} {...book} />
          ))}
        </div>
      ) : (
        <div className="text-center italic">No books found</div>
      )}

      {/* Pagination Controls */}
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
