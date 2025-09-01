import type { IStory } from "@/types";

const CardStory = ({
  frontmatter,
  path,
}: {
  frontmatter: IStory;
  path: string;
}) => {
  const basePath =
    frontmatter.language === "en" ? "" : `/${frontmatter.language}`;

  return (
    <a
      key={`${frontmatter.language}-${frontmatter.slug}`}
      href={`${basePath}/${path}/${frontmatter.slug}`}
      className="bg-base-100 hover:bg-base-200/50 flex flex-col rounded-lg no-underline shadow-sm transition-all duration-300 hover:shadow-md p-4"
    >
      <div className="mx-auto">
        <img
          src={`https://placehold.co/360x360/f0f0f0/333333?text=${frontmatter.title}`}
          alt={frontmatter.title}
          className="bg-base-300 aspect-square w-[256px] rounded-lg"
        />
      </div>
      <div className="space-y-1 pt-4">
        <div className="text-left">
          <div className="text-base-content text-lg font-bold">
            {frontmatter.title}
          </div>
        </div>
        <div className="badge badge-secondary">{frontmatter.category}</div>
      </div>
    </a>
  );
};

export default CardStory;
