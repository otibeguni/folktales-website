import dayjs from "dayjs";
import type { IBlog } from "@/types";

type BlogFrontmatter = IBlog & {
  cover_image?: { src?: string; alt?: string };
  coverImage?: string;
  slug: string;
  date: string;
};

const buildExcerpt = (content?: string) => {
  if (!content) return "";
  const stripped = content
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length > 180 ? `${stripped.slice(0, 177)}...` : stripped;
};

const BlogCard = ({
  frontmatter,
  content,
  path,
}: {
  frontmatter: BlogFrontmatter;
  content: string;
  path: string;
}) => {
  const coverImage =
    frontmatter?.cover_image?.src || frontmatter?.coverImage || null;
  const coverAlt = frontmatter?.cover_image?.alt || frontmatter?.title;
  const excerpt = buildExcerpt(content);

  return (
    <a
      href={`/${path}/${frontmatter.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-base-300/70 bg-base-100/90 shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
    >
      <div className="relative">
        <div className="aspect-[4/3] w-full overflow-hidden bg-base-200">
          {coverImage ? (
            <img
              src={coverImage}
              alt={coverAlt}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-medium text-base-content/70">
              Story
            </div>
          )}
        </div>
        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-base-100/85 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm">
          <span>{dayjs(frontmatter?.date).format("MMM DD, YYYY")}</span>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-base-100/80 via-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <h3 className="text-xl font-semibold leading-tight text-base-content transition duration-200 group-hover:text-primary">
          {frontmatter?.title}
        </h3>
        {excerpt && (
          <p className="text-sm leading-relaxed text-base-content/70">
            {excerpt}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2 text-sm font-semibold text-primary">
          <span className="flex items-center gap-2">
            Read story <span aria-hidden="true">-&#62;</span>
          </span>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-content transition duration-200 group-hover:translate-x-1">
            &#8599;
          </span>
        </div>
      </div>
    </a>
  );
};

export default BlogCard;
