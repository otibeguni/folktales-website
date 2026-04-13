import type { WikidataItemAlt } from '@/types';
import { sortTopicTags } from '@/utils/topic-tags';

const CardTopic = (props: WikidataItemAlt) => {
  const sortedTags = sortTopicTags(props.types);

  return (
    <div className="card bg-base-100 card-md shadow-sm transition hover:scale-105">
      <div className="card-body">
        <a href={`/topics/${props.slug}`} className="flex flex-col gap-4">
          <div className="card-title">{props.item}</div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Types
            </span>
            <div className="flex flex-wrap gap-2">
              {sortedTags.map((tag) => (
                <span key={tag} className="badge badge-soft badge-primary">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </a>
      </div>
    </div>
  );
};

export default CardTopic;
