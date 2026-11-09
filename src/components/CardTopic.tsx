import type { WikidataItemAlt } from '@/types';
import { getTopicDisplayLabels } from '@/utils/topic-labels';

const CardTopic = (props: WikidataItemAlt) => {
  const sortedTags = getTopicDisplayLabels(props);

  return (
    <div className="card bg-base-100 card-md shadow-sm transition hover:scale-105">
      <div className="card-body">
        <a href={`/topics/${props.slug}`} className="flex flex-col gap-4">
          <div className="card-title">{props.item}</div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Classification
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
