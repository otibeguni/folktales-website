import type { SourceItemAlt } from '@/types';

const getBookHref = (book: SourceItemAlt) =>
  book.detailHref || book.library_url || book.url || '';

const getBookActionLabel = (book: SourceItemAlt) => {
  if (book.detailHref && book.availability === 'read-online') {
    return 'Read Online';
  }

  if (book.detailHref && book.availability === 'purchase') {
    return 'View Details';
  }

  if (book.library_url) {
    return 'Open PDF';
  }

  if (book.url) {
    return 'Purchase';
  }

  return '';
};

const BookListItem = ({ book }: { book: SourceItemAlt }) => {
  const href = getBookHref(book);
  const actionLabel = getBookActionLabel(book);
  const isLinked = Boolean(href);
  const isExternal = !book.detailHref && Boolean(href);
  const Wrapper = isLinked ? 'a' : 'div';

  return (
    <Wrapper
      {...(isLinked
        ? {
            href,
            ...(isExternal
              ? {
                  target: '_blank',
                  rel: 'noopener noreferrer',
                }
              : {}),
          }
        : {})}
      className="bg-base-100 hover:bg-base-200/60 flex flex-col gap-4 rounded-2xl border border-base-300 px-4 py-4 no-underline transition sm:flex-row sm:items-start md:px-5 md:py-5"
    >
      {book.cover_image ? (
        <img
          src={book.cover_image}
          alt={`${book.name} cover`}
          className="h-40 w-28 shrink-0 rounded-xl border border-base-300 object-cover shadow-sm"
          loading="lazy"
        />
      ) : (
        <div
          aria-hidden="true"
          className="h-40 w-28 shrink-0 rounded-xl border border-dashed border-base-300 bg-slate-100"
        />
      )}

      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-semibold leading-snug md:text-xl">
          {book.name}
        </h3>
        <div className="mt-2 text-sm text-slate-600 md:text-base">
          {book.author ? `By ${book.author}` : 'Author unknown'}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {book.category && (
            <span className="badge badge-soft badge-primary">{book.category}</span>
          )}
          {book.language && (
            <span className="badge badge-soft">
              {book.language === 'bn' ? 'Bengali' : 'English'}
            </span>
          )}
          {actionLabel ? (
            <span className="badge badge-outline px-3 py-3 text-slate-700">
              {actionLabel}
            </span>
          ) : (
            <span className="text-sm text-slate-500">No external link available</span>
          )}
        </div>
      </div>
    </Wrapper>
  );
};

export default BookListItem;
