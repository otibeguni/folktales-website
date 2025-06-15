import type { IStory, MetadataItem } from '@/types';

const Card = (props: IStory & Partial<MetadataItem>) => {
  const basePath = props.language === 'en' ? '' : `/${props.language}`;

  return (
    <a
      href={`${basePath}/stories/${props.slug}`}
      className="card bg-base-100 card-md no-underline shadow-sm transition hover:scale-105"
    >
      <div className="card-body">
        <div className="card-title">{props.title}</div>
        <p>{props.category}</p>
      </div>
    </a>
  );
};

export default Card;
