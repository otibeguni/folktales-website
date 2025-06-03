import { type IStory } from '@/types';

const Card = ({ title, category, slug, language }: IStory) => {
  const basePath = language === 'en' ? '' : `/${language}`;

  return (
    <div className="card bg-base-100 card-md shadow-sm">
      <div className="card-body">
        <a href={`${basePath}/stories/${slug}`} className="card-title">
          {title}
        </a>
        <p>{category}</p>
      </div>
    </div>
  );
};

export default Card;
