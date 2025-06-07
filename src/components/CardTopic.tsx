import type { WikidataItemAlt } from '@/types';

const CardTopic = (props: WikidataItemAlt) => {
  return (
    <div className="card bg-base-100 card-md shadow-sm">
      <div className="card-body">
        <a href={`/topics/${props.slug}`} className="flex flex-col gap-4">
          <div className="card-title">{props.item}</div>
          <div className="!prose-slate flex flex-col">
            <span className="text-xs font-bold">Type</span>
            {props.type}
          </div>
        </a>
      </div>
    </div>
  );
};

export default CardTopic;
