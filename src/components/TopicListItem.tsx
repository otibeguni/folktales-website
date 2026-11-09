import type { WikidataItemAlt } from '@/types';
import { getTopicDisplayLabels } from '@/utils/topic-labels';

const TopicListItem = ({ topic }: { topic: WikidataItemAlt }) => {
  const classificationLabels = getTopicDisplayLabels(topic);
  const description = topic.description?.trim();

  return (
    <a
      href={`/topics/${topic.slug}`}
      className="bg-base-100 hover:bg-base-200/60 flex flex-col gap-3 rounded-2xl border border-base-300 px-4 py-4 no-underline transition md:px-5 md:py-5"
    >
      <div className="min-w-0">
        <h2 className="text-lg font-semibold leading-snug md:text-xl">
          {topic.item}
        </h2>
        {description && (
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600 md:text-base">
            {description}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {classificationLabels.map((label) => (
            <span key={label} className="badge badge-soft badge-primary">
              {label}
            </span>
          ))}
        </div>
      </div>
    </a>
  );
};

export default TopicListItem;
