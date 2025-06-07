import type { WikidataItemAlt } from '@/types';

const CardTopic = (props: WikidataItemAlt) => {
  return (
    <div className="card bg-base-100 card-md shadow-sm">
      <div className="card-body">
        <div className="flex flex-col gap-4">
          <div className="!prose-gray flex flex-col">
            <span className="text-xs font-bold">Topic</span>
            {props.item}
          </div>
          <div className="!prose-slate flex flex-col">
            <span className="text-xs font-bold">Type</span>
            {props.type}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardTopic;
