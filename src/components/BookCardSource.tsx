import type { SourceItemAlt } from '@/types';

const BookCardSource = (props: SourceItemAlt) => {
  return (
    <div className="card bg-base-100 card-md no-underline shadow-sm transition hover:scale-105">
      <div className="card-body">
        <div className="flex flex-col gap-4">
          <div className="prose-gray flex flex-col">
            <span className="text-xs font-bold">Source</span>
            {props.name || '-'}
          </div>
          <div className="prose-gray flex flex-col">
            <span className="text-xs font-bold">Author</span>
            {props.author || '-'}
          </div>
          {props.library_url && (
            <a
              href={props.library_url || `/books/${props.slug}`}
              className="btn btn-neutral btn-xs"
            >
              Read Online
            </a>
          )}
          {!props.library_url && props.url && (
            <a href={props.url} className="btn btn-neutral btn-xs">
              Purchase
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookCardSource;
