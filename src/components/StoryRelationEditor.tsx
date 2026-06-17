import { useDeferredValue, useState, type FormEvent } from 'react';

import {
  RESOURCE_TYPE_OPTIONS,
  TOPIC_TYPE_OPTIONS,
} from '@/dev/story-relation-options.mjs';

type TopicOption = {
  slug: string;
  item: string;
  types: string[];
};

type ResourceOption = {
  slug: string;
  title: string;
  type: string;
  url: string;
};

type StoryRelationEditorProps = {
  entityType: 'topic' | 'resource';
  storySlug: string;
  storyLanguage: string;
  currentTopicSlugs: string[];
  currentResourceSlugs: string[];
  availableTopics: TopicOption[];
  availableResources: ResourceOption[];
};

const StoryRelationEditor = ({
  entityType,
  storySlug,
  storyLanguage,
  currentTopicSlugs,
  currentResourceSlugs,
  availableTopics,
  availableResources,
}: StoryRelationEditorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'attach-existing' | 'create-new'>(
    'attach-existing',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [topicForm, setTopicForm] = useState({
    slug: '',
    item: '',
    item_bn: '',
    wikidata_id: '',
    description: '',
    latitude: '',
    longitude: '',
    types: [] as string[],
  });
  const [resourceForm, setResourceForm] = useState({
    slug: '',
    title: '',
    url: '',
    type: RESOURCE_TYPE_OPTIONS[0] ?? 'website',
    topic_slugs: [] as string[],
    topicQuery: '',
  });

  const label = entityType === 'topic' ? 'Topic' : 'Resource';
  const actionPath =
    entityType === 'topic'
      ? '/__local-content/story-relations/topic'
      : '/__local-content/story-relations/resource';

  const attachableTopics = availableTopics
    .filter((topic) => !currentTopicSlugs.includes(topic.slug))
    .filter((topic) => {
      if (!normalizedSearchQuery) {
        return true;
      }

      const searchableText = [topic.item, topic.slug, ...topic.types]
        .join(' ')
        .toLowerCase();
      return searchableText.includes(normalizedSearchQuery);
    });

  const attachableResources = availableResources
    .filter((resource) => !currentResourceSlugs.includes(resource.slug))
    .filter((resource) => {
      if (!normalizedSearchQuery) {
        return true;
      }

      const searchableText = [resource.title, resource.slug, resource.type]
        .join(' ')
        .toLowerCase();
      return searchableText.includes(normalizedSearchQuery);
    });

  const deferredResourceTopicQuery = useDeferredValue(resourceForm.topicQuery);
  const normalizedResourceTopicQuery = deferredResourceTopicQuery
    .trim()
    .toLowerCase();
  const resourceTopicOptions = availableTopics.filter((topic) => {
    if (!normalizedResourceTopicQuery) {
      return true;
    }

    const searchableText = [topic.item, topic.slug, ...topic.types]
      .join(' ')
      .toLowerCase();
    return searchableText.includes(normalizedResourceTopicQuery);
  });

  const resetModalState = () => {
    setMode('attach-existing');
    setSearchQuery('');
    setErrorMessage('');
    setIsSubmitting(false);
  };

  const closeModal = () => {
    setIsOpen(false);
    resetModalState();
  };

  const openModal = () => {
    setIsOpen(true);
    resetModalState();
  };

  const postMutation = async (payload: Record<string, unknown>) => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch(actionPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || `Failed to update ${label.toLowerCase()}`);
      }

      closeModal();
      window.location.reload();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : `Failed to update ${label.toLowerCase()}`,
      );
      setIsSubmitting(false);
    }
  };

  const handleAttachExisting = async (slug: string) => {
    const payload =
      entityType === 'topic'
        ? {
            action: 'attach-existing',
            storySlug,
            storyLanguage,
            topicSlug: slug,
          }
        : {
            action: 'attach-existing',
            storySlug,
            storyLanguage,
            resourceSlug: slug,
          };

    await postMutation(payload);
  };

  const handleTopicTypeToggle = (type: string) => {
    setTopicForm((current) => ({
      ...current,
      types: current.types.includes(type)
        ? current.types.filter((value) => value !== type)
        : [...current.types, type],
    }));
  };

  const handleResourceTopicToggle = (slug: string) => {
    setResourceForm((current) => ({
      ...current,
      topic_slugs: current.topic_slugs.includes(slug)
        ? current.topic_slugs.filter((value) => value !== slug)
        : [...current.topic_slugs, slug],
    }));
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload =
      entityType === 'topic'
        ? {
            action: 'create-and-attach',
            storySlug,
            storyLanguage,
            topic: {
              slug: topicForm.slug,
              item: topicForm.item,
              item_bn: topicForm.item_bn,
              wikidata_id: topicForm.wikidata_id,
              description: topicForm.description,
              latitude: topicForm.latitude,
              longitude: topicForm.longitude,
              types: topicForm.types,
            },
          }
        : {
            action: 'create-and-attach',
            storySlug,
            storyLanguage,
            resource: {
              slug: resourceForm.slug,
              title: resourceForm.title,
              url: resourceForm.url,
              type: resourceForm.type,
              topic_slugs: resourceForm.topic_slugs,
            },
          };

    await postMutation(payload);
  };

  return (
    <>
      <button type="button" className="btn btn-outline btn-sm" onClick={openModal}>
        Add {label}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="bg-base-100 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-base-300 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-base-300 px-6 py-5">
              <div>
                <h4 className="text-2xl font-semibold">Add {label}</h4>
                <p className="mt-1 text-sm text-slate-600">
                  Attach an existing {label.toLowerCase()} or create a new one
                  for this story.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={closeModal}
              >
                Close
              </button>
            </div>

            <div className="flex flex-wrap gap-2 px-6 pt-5">
              <button
                type="button"
                className={`btn btn-sm ${
                  mode === 'attach-existing' ? 'btn-primary' : 'btn-ghost'
                }`}
                onClick={() => {
                  setMode('attach-existing');
                  setErrorMessage('');
                }}
              >
                Attach Existing
              </button>
              <button
                type="button"
                className={`btn btn-sm ${
                  mode === 'create-new' ? 'btn-primary' : 'btn-ghost'
                }`}
                onClick={() => {
                  setMode('create-new');
                  setErrorMessage('');
                }}
              >
                Create New
              </button>
            </div>

            {errorMessage && (
              <div className="px-6 pt-4">
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              </div>
            )}

            {mode === 'attach-existing' ? (
              <div className="px-6 py-5">
                <label className="form-control w-full">
                  <span className="mb-2 text-sm font-medium text-slate-700">
                    Search {label.toLowerCase()}s
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="input input-bordered w-full"
                    placeholder={`Search ${label.toLowerCase()}s by title, slug, or type`}
                  />
                </label>

                <div className="mt-4 flex flex-col gap-3">
                  {entityType === 'topic' ? (
                    attachableTopics.length > 0 ? (
                      attachableTopics.map((topic) => (
                        <div
                          key={topic.slug}
                          className="flex flex-col gap-3 rounded-2xl border border-base-300 px-4 py-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold">{topic.item}</div>
                            <div className="mt-1 text-sm text-slate-500">
                              {topic.slug}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {topic.types.map((type) => (
                                <span
                                  key={`${topic.slug}-${type}`}
                                  className="badge badge-soft badge-primary"
                                >
                                  {type}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={isSubmitting}
                            onClick={() => handleAttachExisting(topic.slug)}
                          >
                            {isSubmitting ? 'Saving...' : 'Attach'}
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-base-300 px-5 py-6 text-sm text-slate-500">
                        No attachable topics found.
                      </div>
                    )
                  ) : attachableResources.length > 0 ? (
                    attachableResources.map((resource) => (
                      <div
                        key={resource.slug}
                        className="flex flex-col gap-3 rounded-2xl border border-base-300 px-4 py-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold">{resource.title}</div>
                          <div className="mt-1 text-sm text-slate-500">
                            {resource.slug}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="badge badge-soft badge-primary">
                              {resource.type}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={isSubmitting}
                          onClick={() => handleAttachExisting(resource.slug)}
                        >
                          {isSubmitting ? 'Saving...' : 'Attach'}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-base-300 px-5 py-6 text-sm text-slate-500">
                      No attachable resources found.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <form className="px-6 py-5" onSubmit={handleCreateSubmit}>
                {entityType === 'topic' ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="form-control">
                      <span className="mb-2 text-sm font-medium text-slate-700">
                        Slug
                      </span>
                      <input
                        required
                        type="text"
                        value={topicForm.slug}
                        onChange={(event) =>
                          setTopicForm((current) => ({
                            ...current,
                            slug: event.target.value,
                          }))
                        }
                        className="input input-bordered"
                        placeholder="snake-prince"
                      />
                    </label>

                    <label className="form-control">
                      <span className="mb-2 text-sm font-medium text-slate-700">
                        Item
                      </span>
                      <input
                        required
                        type="text"
                        value={topicForm.item}
                        onChange={(event) =>
                          setTopicForm((current) => ({
                            ...current,
                            item: event.target.value,
                          }))
                        }
                        className="input input-bordered"
                        placeholder="Snake Prince"
                      />
                    </label>

                    <label className="form-control">
                      <span className="mb-2 text-sm font-medium text-slate-700">
                        Bengali Item
                      </span>
                      <input
                        type="text"
                        value={topicForm.item_bn}
                        onChange={(event) =>
                          setTopicForm((current) => ({
                            ...current,
                            item_bn: event.target.value,
                          }))
                        }
                        className="input input-bordered"
                      />
                    </label>

                    <label className="form-control">
                      <span className="mb-2 text-sm font-medium text-slate-700">
                        Wikidata ID
                      </span>
                      <input
                        type="text"
                        value={topicForm.wikidata_id}
                        onChange={(event) =>
                          setTopicForm((current) => ({
                            ...current,
                            wikidata_id: event.target.value,
                          }))
                        }
                        className="input input-bordered"
                        placeholder="Q12345"
                      />
                    </label>

                    <label className="form-control md:col-span-2">
                      <span className="mb-2 text-sm font-medium text-slate-700">
                        Description
                      </span>
                      <textarea
                        value={topicForm.description}
                        onChange={(event) =>
                          setTopicForm((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        className="textarea textarea-bordered min-h-28"
                      />
                    </label>

                    <label className="form-control">
                      <span className="mb-2 text-sm font-medium text-slate-700">
                        Latitude
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={topicForm.latitude}
                        onChange={(event) =>
                          setTopicForm((current) => ({
                            ...current,
                            latitude: event.target.value,
                          }))
                        }
                        className="input input-bordered"
                      />
                    </label>

                    <label className="form-control">
                      <span className="mb-2 text-sm font-medium text-slate-700">
                        Longitude
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={topicForm.longitude}
                        onChange={(event) =>
                          setTopicForm((current) => ({
                            ...current,
                            longitude: event.target.value,
                          }))
                        }
                        className="input input-bordered"
                      />
                    </label>

                    <div className="md:col-span-2">
                      <div className="mb-2 text-sm font-medium text-slate-700">
                        Types
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {TOPIC_TYPE_OPTIONS.map((type) => {
                          const isSelected = topicForm.types.includes(type);

                          return (
                            <button
                              key={type}
                              type="button"
                              className={`badge cursor-pointer border px-3 py-3 transition ${
                                isSelected
                                  ? 'badge-primary text-primary-content'
                                  : 'badge-soft badge-primary'
                              }`}
                              onClick={() => handleTopicTypeToggle(type)}
                            >
                              {type}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="form-control">
                      <span className="mb-2 text-sm font-medium text-slate-700">
                        Slug
                      </span>
                      <input
                        required
                        type="text"
                        value={resourceForm.slug}
                        onChange={(event) =>
                          setResourceForm((current) => ({
                            ...current,
                            slug: event.target.value,
                          }))
                        }
                        className="input input-bordered"
                        placeholder="resource-86-example"
                      />
                    </label>

                    <label className="form-control">
                      <span className="mb-2 text-sm font-medium text-slate-700">
                        Title
                      </span>
                      <input
                        required
                        type="text"
                        value={resourceForm.title}
                        onChange={(event) =>
                          setResourceForm((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        className="input input-bordered"
                      />
                    </label>

                    <label className="form-control md:col-span-2">
                      <span className="mb-2 text-sm font-medium text-slate-700">
                        URL
                      </span>
                      <input
                        required
                        type="url"
                        value={resourceForm.url}
                        onChange={(event) =>
                          setResourceForm((current) => ({
                            ...current,
                            url: event.target.value,
                          }))
                        }
                        className="input input-bordered"
                        placeholder="https://example.com"
                      />
                    </label>

                    <label className="form-control md:col-span-2">
                      <span className="mb-2 text-sm font-medium text-slate-700">
                        Type
                      </span>
                      <select
                        value={resourceForm.type}
                        onChange={(event) =>
                          setResourceForm((current) => ({
                            ...current,
                            type: event.target.value,
                          }))
                        }
                        className="select select-bordered"
                      >
                        {RESOURCE_TYPE_OPTIONS.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="md:col-span-2">
                      <div className="mb-2 text-sm font-medium text-slate-700">
                        Related Topics
                      </div>
                      <input
                        type="text"
                        value={resourceForm.topicQuery}
                        onChange={(event) =>
                          setResourceForm((current) => ({
                            ...current,
                            topicQuery: event.target.value,
                          }))
                        }
                        className="input input-bordered w-full"
                        placeholder="Filter topics to tag this resource"
                      />
                      <div className="mt-3 max-h-52 overflow-y-auto rounded-2xl border border-base-300 p-3">
                        <div className="flex flex-wrap gap-2">
                          {resourceTopicOptions.map((topic) => {
                            const isSelected = resourceForm.topic_slugs.includes(
                              topic.slug,
                            );

                            return (
                              <button
                                key={topic.slug}
                                type="button"
                                className={`badge cursor-pointer border px-3 py-3 transition ${
                                  isSelected
                                    ? 'badge-primary text-primary-content'
                                    : 'badge-soft badge-primary'
                                }`}
                                onClick={() => handleResourceTopicToggle(topic.slug)}
                              >
                                {topic.item}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={closeModal}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      isSubmitting ||
                      (entityType === 'topic' && topicForm.types.length === 0)
                    }
                  >
                    {isSubmitting ? 'Saving...' : `Create ${label}`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default StoryRelationEditor;
