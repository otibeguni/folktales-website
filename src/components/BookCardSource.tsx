import type { SourceItemAlt } from '@/types';

const BookCardSource = (props: SourceItemAlt) => {
  const basePath = props.language === 'en' ? '' : `/${props.language}`;

  return (
    <a
      href={props.library_url || `/${basePath}books/${props.slug}`}
      className="card bg-base-100 card-md no-underline shadow-sm transition hover:scale-105"
    >
      <div className="card-body">
        <div className="flex flex-col gap-4">
          <div className="prose-gray flex flex-col">
            <span className="text-xs font-bold">Source</span>
            {props.name}
          </div>
          <div className="prose-gray flex flex-col">
            <span className="text-xs font-bold">Author</span>
            {props.author}
          </div>
          <button className="btn btn-neutral btn-xs">Read Online</button>
        </div>
      </div>
    </a>
  );
};

export default BookCardSource;
