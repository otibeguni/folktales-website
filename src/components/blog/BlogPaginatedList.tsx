import { useEffect, useMemo, useState } from "react";
import BlogCard from "./BlogCard";

const POSTS_PER_PAGE = 6;

type BlogEntry = { frontmatter: any; htmlContent: string };

const BlogPaginatedList = ({
  data,
  path,
}: {
  data: Array<BlogEntry>;
  path: string;
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(Math.ceil(data.length / POSTS_PER_PAGE), 1);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages]);

  const paginatedStories = useMemo(
    () =>
      data.slice(
        (currentPage - 1) * POSTS_PER_PAGE,
        currentPage * POSTS_PER_PAGE
      ),
    [currentPage, data]
  );

  const startIndex = data.length === 0 ? 0 : (currentPage - 1) * POSTS_PER_PAGE + 1;
  const endIndex = data.length === 0 ? 0 : Math.min(currentPage * POSTS_PER_PAGE, data.length);

  return (
    <div className="space-y-8">
      {paginatedStories.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {paginatedStories.map((story) => (
            <BlogCard
              key={`${story.frontmatter.slug}-${story.frontmatter.date}`}
              frontmatter={story.frontmatter}
              content={story.htmlContent}
              path={path}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-base-300 bg-base-200/60 p-10 text-center text-base-content/70">
          <p className="text-lg font-semibold text-base-content">No entries found</p>
          <p className="mt-2 text-sm">Check back soon for new stories and updates.</p>
        </div>
      )}

      {data.length > POSTS_PER_PAGE && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-base-300/60 bg-base-200/60 px-4 py-3">
          <div className="text-sm text-base-content/70">
            Showing {startIndex}-{endIndex} of {data.length} stories
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-sm btn-ghost"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </button>
            <div className="rounded-lg bg-base-100 px-3 py-2 text-sm font-semibold text-base-content">
              Page {currentPage} of {totalPages}
            </div>
            <button
              className="btn btn-sm btn-primary"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogPaginatedList;
