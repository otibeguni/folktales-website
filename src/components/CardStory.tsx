import type { IStory } from "@/types";

const CardStory = ({
  frontmatter,
  coverImage = null,
  path,
}: {
  frontmatter: IStory;
  coverImage?: any;
  path: string;
}) => {
  const cover =
    coverImage ||
    `https://placehold.co/240x320/f0f0f0/333333?text=${encodeURIComponent(
      frontmatter.title.charAt(0) || "Story"
    )}`;
  const basePath =
    frontmatter.language === "en" || !frontmatter.language
      ? ""
      : `/${frontmatter.language}`;

  return (
    <a
      key={`${frontmatter.language}-${frontmatter.slug}`}
      href={`${basePath}/${path}/${frontmatter.slug}`}
      className="bg-base-100 hover:bg-base-200/60 flex min-w-0 items-start gap-4 rounded-2xl border border-base-300 px-4 py-4 no-underline shadow-sm transition sm:gap-5 sm:px-5 sm:py-5"
    >
      <img
        src={cover}
        alt={frontmatter.title}
        className="bg-base-300 h-28 w-20 shrink-0 rounded-xl border border-base-300 object-cover shadow-sm sm:h-32 sm:w-24"
        loading="lazy"
      />
      <div className="min-w-0 flex-1 self-center">
        <h3 className="text-base-content line-clamp-2 text-base font-semibold leading-snug sm:text-lg md:text-xl">
          {frontmatter.title}
        </h3>
        <div className="mt-2 text-sm text-slate-600 sm:text-base">
          {frontmatter.category || "Uncategorized"}
        </div>
      </div>
    </a>
  );
};

export default CardStory;
