import dayjs from "dayjs";
import type { IBlog } from "@/types";

const CardBodyContent = ({
  frontmatter,
  coverImage = null,
  content,
  path,
}: {
  frontmatter: IBlog;
  coverImage?: any;
  content: string;
  path: string;
}) => {
  return (
    <div className="prose article-content mt-8 max-w-none flex-1">
      <a
        href={`/${path}/${frontmatter.slug}`}
        className="bg-base-100 flex flex-col rounded-lg no-underline"
      >
        {coverImage && (
          <img
            src={coverImage}
            alt={frontmatter.title}
            className="bg-base-300 aspect-square w-3xs rounded-lg"
            loading="lazy"
          />
        )}
        <h1 className="mb-4 text-5xl leading-16">{frontmatter?.title}</h1>
        <span className="badge badge-soft badge-primary">
          {dayjs(frontmatter?.date).format("MMM DD YYYY")}
        </span>
      </a>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
};

export default CardBodyContent;
