import { useState } from 'react';

import Card from '@/components/Card.tsx';
import Select from '@/components/Select.tsx';
import type { IStoryList, MetadataItem } from '@/types';

const MAX_STORIES = 12;

const StoryList = ({
  stories,
  baserow,
  lang,
  labels,
}: {
  stories: IStoryList[];
  baserow: MetadataItem[];
  lang: string;
  labels: { [key: string]: string };
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState(lang);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const allCategories = Array.from(
    new Set(stories.map((story) => story.frontmatter.category)),
  );

  const categories = allCategories.map((category) => ({
    label: category,
    value: category,
  }));

  const filteredStories = [
    ...stories
      .filter((story) => story.frontmatter.language === selectedLanguage)
      .filter((story) => {
        if (selectedCategory) {
          return story.frontmatter.category === selectedCategory;
        }
        return true;
      }),
  ];
  const totalPages = Math.ceil(filteredStories.length / MAX_STORIES);
  const paginatedStories = filteredStories.slice(
    (currentPage - 1) * MAX_STORIES,
    currentPage * MAX_STORIES,
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

  return (
    <div className="min-h-screen">
      <div className="mx-3 mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <h2 className="text-2xl font-bold">{labels.filterLabel}</h2>
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
      <div className="divider my-5"></div>
      <div className="mx-3 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:mx-0">
        {paginatedStories.map(({ frontmatter }) => (
          <Card
            key={`${frontmatter.language}-${frontmatter.slug}`}
            {...frontmatter}
            {...baserow.find((item) => item.slug === frontmatter.slug)}
          />
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

export default StoryList;
