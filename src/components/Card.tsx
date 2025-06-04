import type { IStory, MetadataItem } from '@/types';

const Card = (props: IStory & Partial<MetadataItem>) => {
  const basePath = props.language === 'en' ? '' : `/${props.language}`;

  return (
    <div className="card bg-base-100 card-md shadow-sm">
      <div className="card-body">
        <a href={`${basePath}/stories/${props.slug}`} className="card-title">
          {props.title}
        </a>
        <p>{props.category}</p>
        {props.sources && <p>{props.sources.map((source) => source.value)}</p>}
      </div>
    </div>
  );
};

export default Card;
