import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import type { IMazarTraditionListItem, WikidataItemAlt } from '@/types';
import { sortTopicTags } from '@/utils/topic-tags';

const ITEMS_PER_PAGE = 12;

const parsePositivePage = (value: string | null) => {
  if (!value) return 1;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const parseListState = (search: string, validTopics: Set<string>) => {
  const params = new URLSearchParams(search);
  const topics = params
    .getAll('topic')
    .filter((topic, index, allTopics) => {
      return validTopics.has(topic) && allTopics.indexOf(topic) === index;
    });

  return {
    searchQuery: params.get('q')?.trim() ?? '',
    selectedTopics: topics,
    currentPage: parsePositivePage(params.get('page')),
  };
};

interface Labels {
  pageTitle: string;
  pageDescription: string;
  browseLabel: string;
  resultsLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchHelperText: string;
  topicsLabel: string;
  topicHelperText: string;
  topicSearchPlaceholder: string;
  noMatchingTopicsLabel: string;
  clearFiltersLabel: string;
  noSaintsFoundLabel: string;
  previousLabel: string;
  nextLabel: string;
  pageLabel: string;
}

const MazarTraditionList = ({
  traditions,
  topics,
  labels,
}: {
  traditions: IMazarTraditionListItem[];
  topics: WikidataItemAlt[];
  labels: Labels;
}) => {
  const availableTopics = useMemo(() => {
    const availableSlugs = new Set(
      traditions.flatMap((tradition) => tradition.topic_slugs),
    );
    return topics
      .filter((topic) => availableSlugs.has(topic.slug))
      .sort((left, right) => left.item.localeCompare(right.item));
  }, [topics, traditions]);
  const validTopicSlugs = useMemo(
    () => new Set(availableTopics.map((topic) => topic.slug)),
    [availableTopics],
  );
  const getInitialState = () =>
    parseListState(
      typeof window === 'undefined' ? '' : window.location.search,
      validTopicSlugs,
    );
  const [searchQuery, setSearchQuery] = useState(
    () => getInitialState().searchQuery,
  );
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    () => getInitialState().selectedTopics,
  );
  const [topicQuery, setTopicQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(
    () => getInitialState().currentPage,
  );
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredTopicQuery = useDeferredValue(topicQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const normalizedTopicQuery = deferredTopicQuery.trim().toLowerCase();

  const topicSuggestions = availableTopics
    .filter((topic) => !selectedTopics.includes(topic.slug))
    .filter((topic) => {
      if (!normalizedTopicQuery) return false;
      return [topic.item, topic.slug, ...sortTopicTags(topic.types)]
        .join(' ')
        .toLowerCase()
        .includes(normalizedTopicQuery);
    })
    .slice(0, 8);
  const selectedTopicItems = selectedTopics
    .map((slug) => availableTopics.find((topic) => topic.slug === slug))
    .filter((topic): topic is WikidataItemAlt => Boolean(topic));

  const filteredTraditions = traditions
    .filter((tradition) => {
      if (!normalizedSearchQuery) return true;
      const searchableText = [
        tradition.title,
        tradition.slug,
        tradition.summary,
        ...tradition.topics.flatMap((topic) => [
          topic.item,
          topic.slug,
          ...topic.types,
        ]),
      ]
        .join(' ')
        .toLowerCase();
      return searchableText.includes(normalizedSearchQuery);
    })
    .filter((tradition) => {
      return selectedTopics.every((topic) =>
        tradition.topic_slugs.includes(topic),
      );
    });

  const totalPages = Math.ceil(filteredTraditions.length / ITEMS_PER_PAGE);
  const paginatedTraditions = filteredTraditions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages > 0 ? totalPages : 1);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    selectedTopics.forEach((topic) => params.append('topic', topic));
    if (currentPage > 1) params.set('page', String(currentPage));

    const nextSearch = params.toString();
    const nextUrl = nextSearch
      ? `${window.location.pathname}?${nextSearch}`
      : window.location.pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl !== nextUrl) {
      window.history.replaceState(window.history.state, '', nextUrl);
    }
  }, [currentPage, searchQuery, selectedTopics]);

  useEffect(() => {
    const handlePopState = () => {
      const nextState = parseListState(
        window.location.search,
        validTopicSlugs,
      );
      setSearchQuery(nextState.searchQuery);
      setSelectedTopics(nextState.selectedTopics);
      setCurrentPage(nextState.currentPage);
      setTopicQuery('');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [validTopicSlugs]);

  const toggleTopic = (slug: string) => {
    setCurrentPage(1);
    setSelectedTopics((current) =>
      current.includes(slug)
        ? current.filter((topic) => topic !== slug)
        : [...current, slug],
    );
    setTopicQuery('');
  };

  const hasActiveFilters = Boolean(searchQuery.trim() || selectedTopics.length);

  return (
    <div className="container mx-auto min-h-screen max-w-4xl">
      <div className="mx-3 my-8 flex flex-col gap-6 lg:mx-0">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            {labels.pageTitle}
          </h1>
          <p className="max-w-3xl text-base text-slate-600 md:text-lg">
            {labels.pageDescription}
          </p>
        </div>

        <section className="bg-base-200/50 rounded-3xl border border-base-300 p-4 md:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-semibold">{labels.browseLabel}</h2>
                <p className="text-sm text-slate-600 md:text-base">
                  {filteredTraditions.length} {labels.resultsLabel}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm self-start md:self-auto"
                disabled={!hasActiveFilters}
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTopics([]);
                  setTopicQuery('');
                  setCurrentPage(1);
                }}
              >
                {labels.clearFiltersLabel}
              </button>
            </div>

            <label className="form-control w-full">
              <span className="mb-2 text-sm font-medium text-slate-700">
                {labels.searchLabel}
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setCurrentPage(1);
                  setSearchQuery(event.target.value);
                }}
                className="input input-bordered w-full"
                placeholder={labels.searchPlaceholder}
              />
              <span className="mt-2 text-sm text-slate-500">
                {labels.searchHelperText}
              </span>
            </label>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-slate-700">
                  {labels.topicsLabel}
                </p>
                <p className="text-sm text-slate-500">
                  {labels.topicHelperText}
                </p>
              </div>
              <div className="relative">
                <input
                  type="search"
                  value={topicQuery}
                  onChange={(event) => setTopicQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && topicSuggestions[0]) {
                      event.preventDefault();
                      toggleTopic(topicSuggestions[0].slug);
                    }
                  }}
                  className="input input-bordered w-full"
                  placeholder={labels.topicSearchPlaceholder}
                />
                {topicSuggestions.length > 0 && (
                  <div className="bg-base-100 absolute z-10 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-base-300 shadow-lg">
                    {topicSuggestions.map((topic) => (
                      <button
                        key={topic.slug}
                        type="button"
                        className="hover:bg-base-200 flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition"
                        onMouseDown={(event) => {
                          event.preventDefault();
                        }}
                        onClick={() => toggleTopic(topic.slug)}
                      >
                        <span className="font-medium leading-snug">
                          {topic.item}
                        </span>
                        <span className="text-sm text-slate-600">
                          {sortTopicTags(topic.types).join(' / ')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {normalizedTopicQuery && topicSuggestions.length === 0 && (
                  <div className="mt-2 text-sm text-slate-500">
                    {labels.noMatchingTopicsLabel}
                  </div>
                )}
              </div>
              {selectedTopicItems.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTopicItems.map((topic) => (
                    <button
                      key={topic.slug}
                      type="button"
                      className="badge badge-primary gap-2 border px-3 py-3 text-primary-content"
                      onClick={() => toggleTopic(topic.slug)}
                      aria-label={`Remove ${topic.item} filter`}
                    >
                      <span>{topic.item}</span>
                      <span aria-hidden="true">x</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {paginatedTraditions.length > 0 ? (
        <div className="mx-3 flex flex-col gap-4 xl:mx-0">
          {paginatedTraditions.map((tradition) => (
            <a
              key={tradition.slug}
              href={`/mazar-traditions/${tradition.slug}`}
              className="bg-base-100 hover:bg-base-200/60 flex flex-col gap-3 rounded-2xl border border-base-300 px-4 py-4 no-underline transition md:px-5 md:py-5"
            >
              <div>
                <h2 className="text-lg font-semibold leading-snug md:text-xl">
                  {tradition.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 md:text-base">
                  {tradition.summary}
                </p>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="mx-3 rounded-2xl border border-dashed border-base-300 px-6 py-12 text-center italic xl:mx-0">
          {labels.noSaintsFoundLabel}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-12 flex justify-center gap-4">
          <button
            type="button"
            className="btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            {labels.previousLabel}
          </button>
          <span className="self-center">
            {labels.pageLabel} {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            className="btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((page) => page + 1)}
          >
            {labels.nextLabel}
          </button>
        </div>
      )}
    </div>
  );
};

export default MazarTraditionList;
