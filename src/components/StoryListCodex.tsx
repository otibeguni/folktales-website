import { useEffect, useState } from "react";

import type { IStoryList } from "@/types";
import CardStory from "./CardStory";

// A more suitable number for a list view to keep it scannable
const STORIES_PER_PAGE = 8;

const StoryListCodex = ({
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
  const [selectedLanguage, setSelectedLanguage] = useState(lang);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const basePath = selectedLanguage === "en" ? "" : `/${selectedLanguage}`;

  // Memoize the categories list
  const allCategories = Array.from(
    new Set(stories.map((story) => story.frontmatter.category))
  );

  const categories = [
    { label: labels.allCategoryLabel, value: "" },
    ...allCategories.map((category) => ({
      label: category,
      value: category,
    })),
  ];

  // Find the label for the currently selected category
  const currentCategoryLabel =
    categories.find((c) => c.value === selectedCategory)?.label ||
    labels.allCategoryLabel;

  // Filter stories based on selected language and category
  const filteredStories = stories
    .filter((story) => story.frontmatter.language === selectedLanguage)
    .filter((story) => {
      if (selectedCategory) {
        return story.frontmatter.category === selectedCategory;
      }
      return true;
    });

  const totalPages = Math.ceil(filteredStories.length / STORIES_PER_PAGE);

  // Reset to page 1 if filters change and current page becomes invalid
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages > 0 ? totalPages : 1);
    }
  }, [selectedCategory, selectedLanguage, totalPages]);

  const paginatedStories = filteredStories.slice(
    (currentPage - 1) * STORIES_PER_PAGE,
    currentPage * STORIES_PER_PAGE
  );

  const handleLanguageChange = (language: string) => {
    setCurrentPage(1);
    setSelectedLanguage(language);
  };

  const handleCategoryClick = (categoryValue: string) => {
    setCurrentPage(1);
    setSelectedCategory(categoryValue);
    // This is a neat trick to close the dropdown after selection
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  return (
    <>
      {/* Filter Section */}
      <div className="bg-base-100 mt-8 mb-8 flex flex-row items-center justify-between gap-4 rounded-xl p-6 shadow-sm">
        <div className="btn-group">
          <button
            className={`btn btn-sm sm:btn-md ${
              selectedLanguage === "en" ? "btn-primary" : ""
            }`}
            onClick={() => handleLanguageChange("en")}
          >
            English
          </button>
          <button
            className={`btn btn-sm sm:btn-md ${
              selectedLanguage === "bn" ? "btn-primary" : ""
            }`}
            onClick={() => handleLanguageChange("bn")}
          >
            বাংলা
          </button>
        </div>
        {/* Modern Dropdown for Categories */}
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-ghost w-full sm:w-auto"
          >
            {currentCategoryLabel}
            <svg
              width="12px"
              height="12px"
              className="inline-block h-2 w-2 fill-current opacity-60"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 2048 2048"
            >
              <path d="M1799 349l242 241-1017 1017L7 590l242-241 775 775 775-775z"></path>
            </svg>
          </div>
          <ul
            tabIndex={0}
            className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow"
          >
            {categories.map((cat) => (
              <li key={cat.value}>
                <a
                  className={
                    selectedCategory === cat.value ? "bg-base-200" : ""
                  }
                  onClick={() => handleCategoryClick(cat.value)}
                >
                  {cat.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Story List */}
      <div className="space-y-4">
        {paginatedStories.length > 0 ? (
          paginatedStories.map(({ frontmatter }) => (
            <a
              key={`${frontmatter.language}-${frontmatter.slug}`}
              href={`${basePath}/${path}/${frontmatter.slug}`}
              className="bg-base-100 hover:bg-base-200/50 flex flex-col items-center gap-4 rounded-lg p-4 no-underline shadow-sm transition-all duration-300 hover:shadow-md sm:flex-row"
            >
              <img
                src={`https://placehold.co/100x100/f0f0f0/333333?text=${frontmatter.slug
                  .toUpperCase()
                  .charAt(0)}`}
                alt={frontmatter.title}
                className="bg-base-300 h-24 w-24 flex-shrink-0 rounded-md object-cover sm:h-20 sm:w-20"
              />
              <div className="flex-grow text-center sm:text-left">
                <div className="text-base-content text-lg font-bold">
                  {frontmatter.title}
                </div>
              </div>
              <div className="badge badge-secondary flex-shrink-0 sm:ml-4">
                {frontmatter.category}
              </div>
            </a>
          ))
        ) : (
          <div className="bg-base-100 rounded-lg p-8 text-center">
            <p>No entries found for the selected filters.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-12 flex justify-center">
          <div className="join">
            <button
              className="join-item btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              «
            </button>
            <button className="join-item btn btn-active">
              Page {currentPage} of {totalPages}
            </button>
            <button
              className="join-item btn"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
            >
              »
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default StoryListCodex;
