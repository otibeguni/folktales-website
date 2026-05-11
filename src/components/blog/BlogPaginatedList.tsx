import { useEffect, useMemo, useState } from "react";
import BlogCard from "./BlogCard";
import type { BlogPost } from "@/utils/storyblok-blog";

const POSTS_PER_PAGE = 6;
type BlogListItem = Pick<
  BlogPost,
  "id" | "slug" | "title" | "publishedAt" | "summary" | "coverImage" | "coverMedia"
>;

const BlogPaginatedList = ({
  data,
  path,
}: {
  data: Array<BlogListItem>;
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

  return (
    <div className="space-y-6">
      {paginatedStories.length > 0 ? (
        <div className="divide-y divide-base-300 border-y border-base-300">
          {paginatedStories.map((story) => (
            <BlogCard
              key={`${story.slug}-${story.publishedAt}`}
              post={story}
              path={path}
            />
          ))}
        </div>
      ) : (
        null
      )}

      {data.length > POSTS_PER_PAGE && (
        <div className="flex items-center justify-between gap-3">
          <button
            className="btn btn-sm btn-ghost"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </button>
          <div className="text-sm text-base-content/70">
            {currentPage} / {totalPages}
          </div>
          <button
            className="btn btn-sm btn-ghost"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default BlogPaginatedList;
