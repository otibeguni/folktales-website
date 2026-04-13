import { useState } from 'react';

import CardTopic from '@/components/CardTopic.tsx';
import type { WikidataItemAlt } from '@/types';
import { sortTopicTags } from '@/utils/topic-tags';

const MAX_TOPICS = 12;

const TopicList = ({
  topics,
  labels,
}: {
  topics: WikidataItemAlt[];
  labels: {
    filterLabel: string;
    typesLabel: string;
    clearFiltersLabel: string;
  };
}) => {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredTypes = [
    ...topics.filter((topic) => {
      if (selectedTypes.length > 0) {
        return selectedTypes.every((selectedType) =>
          topic.types.includes(selectedType),
        );
      }
      return true;
    }),
  ];
  const totalPages = Math.ceil(filteredTypes.length / MAX_TOPICS);
  const paginatedTypes = filteredTypes.slice(
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
  };

  return (
    <div className="container mx-auto min-h-screen max-w-3xl">
      <div className="mx-3 my-5 flex flex-col gap-4 lg:mx-0">
        <h2 className="text-2xl font-bold">{labels.filterLabel}</h2>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-slate-600">{labels.typesLabel}</p>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={selectedTypes.length === 0}
            onClick={clearFilters}
          >
            {labels.clearFiltersLabel}
          </button>
        </div>
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
      <div className="divider my-5"></div>
      <div className="mx-3 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:mx-0">
        {paginatedTypes.map((props) => (
          <CardTopic key={`topic-${props.slug}`} {...props} />
        ))}
      </div>

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

export default TopicList;
