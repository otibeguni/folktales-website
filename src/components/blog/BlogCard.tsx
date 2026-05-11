import dayjs from "dayjs";

type BlogCardPost = {
  title: string;
  slug: string;
  publishedAt: string;
  summary?: string;
  coverImage?: {
    src: string;
    alt: string;
  };
};

const BlogCard = ({
  post,
  path,
}: {
  post: BlogCardPost;
  path: string;
}) => {
  const coverImage = post.coverImage?.src || null;
  const coverAlt = post.coverImage?.alt || post.title;

  return (
    <a
      href={`/${path}/${post.slug}`}
      className="group flex items-center gap-4 py-6 no-underline transition duration-200 hover:bg-base-200/50 hover:no-underline sm:gap-6"
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg sm:h-28 sm:w-28">
        {coverImage ? (
          <img
            src={coverImage}
            alt={coverAlt}
            className="m-0 block h-full w-full max-w-none object-contain transition duration-300 group-hover:scale-105"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full bg-base-300" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <time
          dateTime={post.publishedAt}
          className="block text-sm text-base-content/60"
        >
          {dayjs(post.publishedAt).format("MMM DD, YYYY")}
        </time>
        <h2 className="mt-2 text-xl font-semibold leading-tight text-base-content transition duration-200 group-hover:text-primary sm:text-2xl">
          {post.title}
        </h2>
        {post.summary && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-base-content/70 sm:text-base">
            {post.summary}
          </p>
        )}
      </div>
    </a>
  );
};

export default BlogCard;
