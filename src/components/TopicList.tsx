import { useState } from 'react';

import CardTopic from '@/components/CardTopic.tsx';
import Select from '@/components/Select.tsx';
import type { WikidataItemAlt } from '@/types';

const MAX_TOPICS = 12;

const TopicList = ({
  topics,
  labels,
}: {
  topics: WikidataItemAlt[];
  labels: { [key: string]: string };
}) => {
  const [selectedType, setSelectedType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredTypes = [
    ...topics.filter((topic) => {
      if (selectedType) {
        return topic.type === selectedType;
      }
      return true;
    }),
  ];
  const totalPages = Math.ceil(filteredTypes.length / MAX_TOPICS);
  const paginatedTypes = filteredTypes.slice(
    (currentPage - 1) * MAX_TOPICS,
    currentPage * MAX_TOPICS,
  );
  const allTopics = Array.from(new Set(topics.map((topic) => topic.type)));
  const selectTopics = allTopics.map((topic) => ({
    label: topic,
    value: topic,
  }));

  const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    event.preventDefault();
    setCurrentPage(1);
    setSelectedType(event.target.value);
  };

  return (
    <div className="container mx-auto min-h-screen max-w-3xl">
      <div className="mx-3 my-5 flex flex-col gap-3 lg:mx-0 lg:flex-row lg:items-center">
        <h2 className="text-2xl font-bold">{labels.filterLabel}</h2>
        <Select
          label={labels.typeLabel}
          value={selectedType}
          handleChange={handleTypeChange}
          options={[
            {
              label: labels.allTypesLabel,
              value: '',
            },
            ...selectTopics,
          ]}
        />
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
