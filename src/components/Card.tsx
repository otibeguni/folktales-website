import { type IStory } from '@/types';

const Card = ({ title, category, slug }: IStory) => {
  return (
    <div className="card bg-base-100 card-md shadow-sm">
      <div className="card-body">
        <a href={`/stories/${slug}`} className="card-title">
          {title}
        </a>
        <p>{category}</p>
      </div>
    </div>
  );
};

export default Card;
