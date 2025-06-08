import { useState } from 'react';

import BookCardSource from '@/components/BookCardSource';
import Select from '@/components/Select.tsx';
import type { SourceItemAlt } from '@/types';

const MAX_BOOKS = 12;

const BookList = ({
  books,
  labels,
}: {
  books: SourceItemAlt[];
  labels: { [key: string]: string };
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('bn');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const allCategories = Array.from(new Set(books.map((book) => book.category)));

  const categories = allCategories.map((category) => ({
    label: category,
    value: category,
  }));

  const filteredBooks = [
    ...books
      .filter((book) => book.language === selectedLanguage)
      .filter((book) => {
        if (selectedCategory) {
          return book.category === selectedCategory;
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
      {paginatedBooks.length > 0 ? (
        <div className="mx-3 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:mx-0">
          {paginatedBooks.map((book) => (
            <BookCardSource {...book} />
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
