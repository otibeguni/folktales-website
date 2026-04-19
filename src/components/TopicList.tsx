import { useDeferredValue, useState } from 'react';

import TopicListItem from '@/components/TopicListItem';
import type { WikidataItemAlt } from '@/types';
import { sortTopicTags } from '@/utils/topic-tags';

const MAX_TOPICS = 12;

const TopicList = ({
  topics,
  labels,
}: {
  topics: WikidataItemAlt[];
  labels: {
    pageTitle: string;
    pageDescription: string;
    browseLabel: string;
    resultsLabel: string;
    searchLabel: string;
    searchPlaceholder: string;
    typesLabel: string;
    searchHelperText: string;
    clearFiltersLabel: string;
    noTopicsFoundLabel: string;
  };
}) => {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();

  const filteredTopics = [
    ...topics.filter((topic) => {
      if (selectedTypes.length > 0) {
        return selectedTypes.every((selectedType) =>
          topic.types.includes(selectedType),
        );
      }
      return true;
    }).filter((topic) => {
      if (!normalizedSearchQuery) {
        return true;
      }

      const searchableText = [
        topic.item,
        topic.slug,
        topic.description ?? '',
        ...topic.types,
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearchQuery);
    }),
  ];
  const totalPages = Math.ceil(filteredTopics.length / MAX_TOPICS);
  const paginatedTopics = filteredTopics.slice(
    (currentPage - 1) * MAX_TOPICS,
    currentPage * MAX_TOPICS,
  );
  const allTypes = sortTopicTags(
    Array.from(new Set(topics.flatMap((topic) => topic.types))),
  );

  const toggleType = (tag: string) => {
    setCurrentPage(1);
    setSelectedTypes((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
  };

  const clearFilters = () => {
    setCurrentPage(1);
    setSelectedTypes([]);
    setSearchQuery('');
  };

  return (
    <div className="container mx-auto min-h-screen max-w-4xl">
      <div className="mx-3 my-8 flex flex-col gap-6 lg:mx-0">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            {labels.pageTitle}
          </h1>
          <p className="max-w-3xl text-base text-slate-600 md:text-lg">
            {labels.pageDescription}
          </p>
        </div>

        <section className="bg-base-200/50 rounded-3xl border border-base-300 p-4 md:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{labels.browseLabel}</h2>
                <p className="text-sm text-slate-600 md:text-base">
                  {filteredTopics.length} {labels.resultsLabel}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm self-start md:self-auto"
                disabled={!searchQuery && selectedTypes.length === 0}
                onClick={clearFilters}
              >
                {labels.clearFiltersLabel}
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <label className="form-control w-full">
                <span className="mb-2 text-sm font-medium text-slate-700">
                  {labels.searchLabel}
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => {
                    setCurrentPage(1);
                    setSearchQuery(event.target.value);
                  }}
                  className="input input-bordered w-full"
                  placeholder={labels.searchPlaceholder}
                />
              </label>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {labels.typesLabel}
                </span>
                <div className="flex flex-wrap gap-2">
                  {allTypes.map((tag) => {
                    const isSelected = selectedTypes.includes(tag);

                    return (
                      <button
                        key={tag}
                        type="button"
                        className={`badge cursor-pointer border px-3 py-3 transition ${
                          isSelected
                            ? 'badge-primary text-primary-content'
                            : 'badge-soft badge-primary'
                        }`}
                        onClick={() => toggleType(tag)}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-500">{labels.searchHelperText}</p>
          </div>
        </section>
      </div>

      {paginatedTopics.length > 0 ? (
        <div className="mx-3 flex flex-col gap-4 xl:mx-0">
          {paginatedTopics.map((topic) => (
            <TopicListItem key={`topic-${topic.slug}`} topic={topic} />
          ))}
        </div>
      ) : (
        <div className="mx-3 rounded-2xl border border-dashed border-base-300 px-6 py-12 text-center italic xl:mx-0">
          {labels.noTopicsFoundLabel}
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

export default TopicList;
