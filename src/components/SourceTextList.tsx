import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import type { SourceTextListItem } from '@/types';

const MAX_SOURCE_TEXTS = 12;
const VALID_LINKED_FILTERS = new Set(['story', 'none']);

const parsePositivePage = (value: string | null) => {
  if (!value) {
    return 1;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const parseSourceTextListState = ({
  search,
  validSourceBookSlugs,
}: {
  search: string;
  validSourceBookSlugs: Set<string>;
}) => {
  const params = new URLSearchParams(search);
  const source = params.get('source');
  const linked = params.get('linked');

  return {
    selectedSourceBook:
      source && validSourceBookSlugs.has(source) ? source : '',
    selectedLinked:
      linked && VALID_LINKED_FILTERS.has(linked) ? linked : '',
    searchQuery: params.get('q')?.trim() ?? '',
    currentPage: parsePositivePage(params.get('page')),
  };
};

const SourceTextList = ({
  sourceTexts,
  labels,
}: {
  sourceTexts: SourceTextListItem[];
  labels: { [key: string]: string };
}) => {
  const sourceBookOptions = useMemo(
    () =>
      Array.from(
        new Map(
          sourceTexts.map((sourceText) => [
            sourceText.sourceBookSlug,
            {
              slug: sourceText.sourceBookSlug,
              name: sourceText.sourceBookName,
            },
          ]),
        ).values(),
      ).sort((left, right) => left.name.localeCompare(right.name)),
    [sourceTexts],
  );
  const validSourceBookSlugs = useMemo(
    () => new Set(sourceBookOptions.map((sourceBook) => sourceBook.slug)),
    [sourceBookOptions],
  );
  const getInitialState = () =>
    parseSourceTextListState({
      search: typeof window === 'undefined' ? '' : window.location.search,
      validSourceBookSlugs,
    });

  const [selectedSourceBook, setSelectedSourceBook] = useState(
    () => getInitialState().selectedSourceBook,
  );
  const [selectedLinked, setSelectedLinked] = useState(
    () => getInitialState().selectedLinked,
  );
  const [searchQuery, setSearchQuery] = useState(
    () => getInitialState().searchQuery,
  );
  const [currentPage, setCurrentPage] = useState(
    () => getInitialState().currentPage,
  );
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();

  const filteredSourceTexts = sourceTexts
    .filter((sourceText) => {
      if (!normalizedSearchQuery) {
        return true;
      }

      const searchableText = [
        sourceText.title,
        sourceText.slug,
        sourceText.workSlug,
        sourceText.sourceBookName,
        sourceText.sourceBookAuthor ?? '',
        sourceText.storyTitle ?? '',
        sourceText.storySlug ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearchQuery);
    })
    .filter((sourceText) => {
      if (!selectedSourceBook) {
        return true;
      }

      return sourceText.sourceBookSlug === selectedSourceBook;
    })
    .filter((sourceText) => {
      if (selectedLinked === 'story') {
        return Boolean(sourceText.storySlug);
      }

      if (selectedLinked === 'none') {
        return !sourceText.storySlug;
      }

      return true;
    });
  const totalPages = Math.ceil(filteredSourceTexts.length / MAX_SOURCE_TEXTS);
  const paginatedSourceTexts = filteredSourceTexts.slice(
    (currentPage - 1) * MAX_SOURCE_TEXTS,
    currentPage * MAX_SOURCE_TEXTS,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages > 0 ? totalPages : 1);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const params = new URLSearchParams();

    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    }

    if (selectedSourceBook) {
      params.set('source', selectedSourceBook);
    }

    if (selectedLinked) {
      params.set('linked', selectedLinked);
    }

    if (currentPage > 1) {
      params.set('page', String(currentPage));
    }

    const nextSearch = params.toString();
    const nextUrl = nextSearch
      ? `${window.location.pathname}?${nextSearch}`
      : window.location.pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (currentUrl !== nextUrl) {
      window.history.replaceState(window.history.state, '', nextUrl);
    }
  }, [currentPage, searchQuery, selectedLinked, selectedSourceBook]);

  useEffect(() => {
    const handlePopState = () => {
      const nextState = parseSourceTextListState({
        search: window.location.search,
        validSourceBookSlugs,
      });

      setSelectedSourceBook(nextState.selectedSourceBook);
      setSelectedLinked(nextState.selectedLinked);
      setSearchQuery(nextState.searchQuery);
      setCurrentPage(nextState.currentPage);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [validSourceBookSlugs]);

  const resetToFirstPage = (callback: () => void) => {
    callback();
    setCurrentPage(1);
  };
  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedSourceBook || selectedLinked,
  );

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 md:py-12">
      <div className="space-y-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {labels.pageTitle}
          </h1>
          <p className="max-w-3xl text-base text-slate-600">
            {labels.pageDescription}
          </p>
        </div>

        <div className="rounded-2xl border border-base-300 bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(12rem,0.8fr)_minmax(10rem,0.6fr)_auto] md:items-end">
            <label className="form-control w-full">
              <span className="label pb-1 text-sm font-semibold">
                {labels.searchLabel}
              </span>
              <input
                type="search"
                className="input input-bordered w-full"
                placeholder={labels.searchPlaceholder}
                value={searchQuery}
                onChange={(event) =>
                  resetToFirstPage(() => setSearchQuery(event.target.value))
                }
              />
            </label>

            <label className="form-control w-full">
              <span className="label pb-1 text-sm font-semibold">
                {labels.sourceBookLabel}
              </span>
              <select
                className="select select-bordered w-full"
                value={selectedSourceBook}
                onChange={(event) =>
                  resetToFirstPage(() => setSelectedSourceBook(event.target.value))
                }
              >
                <option value="">{labels.allSourceBooksLabel}</option>
                {sourceBookOptions.map((sourceBook) => (
                  <option key={sourceBook.slug} value={sourceBook.slug}>
                    {sourceBook.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-control w-full">
              <span className="label pb-1 text-sm font-semibold">
                {labels.linkedLabel}
              </span>
              <select
                className="select select-bordered w-full"
                value={selectedLinked}
                onChange={(event) =>
                  resetToFirstPage(() => setSelectedLinked(event.target.value))
                }
              >
                <option value="">{labels.allLinkedLabel}</option>
                <option value="story">{labels.linkedStoryLabel}</option>
                <option value="none">{labels.notLinkedLabel}</option>
              </select>
            </label>

            <button
              type="button"
              className="btn btn-outline"
              disabled={!hasActiveFilters}
              onClick={() => {
                setSearchQuery('');
                setSelectedSourceBook('');
                setSelectedLinked('');
                setCurrentPage(1);
              }}
            >
              {labels.clearFiltersLabel}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-slate-600">
            {filteredSourceTexts.length} {labels.resultsLabel}
          </p>
        </div>

        {paginatedSourceTexts.length > 0 ? (
          <div className="grid gap-3">
            {paginatedSourceTexts.map((sourceText) => (
              <article
                key={sourceText.slug}
                className="rounded-xl border border-base-300 bg-white p-4 shadow-sm transition hover:border-primary/50"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 space-y-2">
                    <h2 className="text-xl font-semibold leading-tight">
                      <a
                        href={sourceText.sourceTextHref}
                        className="link-hover text-slate-950"
                      >
                        {sourceText.title}
                      </a>
                    </h2>
                    <p className="text-sm text-slate-600">
                      <a
                        href={sourceText.sourceBookHref}
                        className="link-hover font-medium text-slate-700"
                      >
                        {sourceText.sourceBookName}
                      </a>
                      {sourceText.sourceBookAuthor
                        ? ` - ${sourceText.sourceBookAuthor}`
                        : ''}
                    </p>
                    {sourceText.storyTitle && sourceText.storyHref ? (
                      <p className="text-sm text-slate-600">
                        {labels.storyLabel}{' '}
                        <a
                          href={sourceText.storyHref}
                          className="link-hover font-medium text-slate-700"
                        >
                          {sourceText.storyTitle}
                        </a>
                      </p>
                    ) : null}
                  </div>

                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-base-300 bg-white p-8 text-center text-slate-600">
            {labels.noSourceTextsFoundLabel}
          </div>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              {labels.previousLabel}
            </button>
            <span className="text-sm text-slate-600">
              {labels.pageLabel} {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
            >
              {labels.nextLabel}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default SourceTextList;
