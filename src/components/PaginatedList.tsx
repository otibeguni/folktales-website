import { useEffect, useState } from "react";

import CardBodyContent from "./CardBodyContent";

// A more suitable number for a list view to keep it scannable
const POST_PER_PAGE = 8;

const PaginatedList = ({
  data,
  path,
}: {
  data: Array<{ frontmatter: any; htmlContent: any }>;
  path: string;
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / POST_PER_PAGE);

  // Reset to page 1 if filters change and current page becomes invalid
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages > 0 ? totalPages : 1);
    }
  }, [totalPages]);

  const paginatedStories = data.slice(
    (currentPage - 1) * POST_PER_PAGE,
    currentPage * POST_PER_PAGE
  );

  return (
    <>
      {/* Story List */}
      <div className="space-y-4">
        {paginatedStories.length > 0 ? (
          <div className="grid grid-cols-1 gap-8">
            {paginatedStories.map((story) => (
              <CardBodyContent
                key={`${story.frontmatter.date}-${story.frontmatter.slug}`}
                frontmatter={story.frontmatter}
                coverImage={story.frontmatter.cover_image?.src}
                content={story.htmlContent}
                path={path}
              />
            ))}
          </div>
        ) : (
          <div className="bg-base-100 rounded-lg p-8 text-center">
            <p>No entries found.</p>
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

export default PaginatedList;
