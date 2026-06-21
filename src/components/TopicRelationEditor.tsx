import { useDeferredValue, useState, type FormEvent } from 'react';

import { TOPIC_RELATION_TYPE_OPTIONS } from '@/dev/story-relation-options.mjs';
import { TOPIC_RELATION_LABELS } from '@/utils/topic-relations.mjs';

type TopicOption = {
  slug: string;
  item: string;
  types: string[];
};

type TopicRelationRecord = {
  slug: string;
  relationType: string;
  direction: 'outbound' | 'inbound';
  topicSlug: string;
  topicItem: string;
};

type TopicRelationEditorProps = {
  topicSlug: string;
  topicItem: string;
  availableTopics: TopicOption[];
  currentRelations: TopicRelationRecord[];
};

const TopicRelationEditor = ({
  topicSlug,
  topicItem,
  availableTopics,
  currentRelations,
}: TopicRelationEditorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [relationType, setRelationType] = useState(
    TOPIC_RELATION_TYPE_OPTIONS[0] ?? 'located_in',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();

  const existingOutboundKeys = new Set(
    currentRelations
      .filter((relation) => relation.direction === 'outbound')
      .map((relation) => `${relation.relationType}:${relation.topicSlug}`),
  );

  const attachableTopics = availableTopics
    .filter((topic) => topic.slug !== topicSlug)
    .filter((topic) => !existingOutboundKeys.has(`${relationType}:${topic.slug}`))
    .filter((topic) => {
      if (!normalizedSearchQuery) {
        return true;
      }

      const searchableText = [topic.item, topic.slug, ...topic.types]
        .join(' ')
        .toLowerCase();
      return searchableText.includes(normalizedSearchQuery);
    });

  const closeModal = () => {
    setIsOpen(false);
    setSearchQuery('');
    setErrorMessage('');
    setIsSubmitting(false);
  };

  const openModal = () => {
    setIsOpen(true);
    setSearchQuery('');
    setErrorMessage('');
    setIsSubmitting(false);
  };

  const postMutation = async (payload: Record<string, unknown>) => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/__local-content/topic-relations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Failed to update topic relations');
      }

      closeModal();
      window.location.reload();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update topic relations',
      );
      setIsSubmitting(false);
    }
  };

  const handleAttach = async (targetTopicSlug: string) => {
    await postMutation({
      action: 'attach-existing',
      sourceTopicSlug: topicSlug,
      targetTopicSlug,
      relationType,
    });
  };

  const handleRemove = async (relationSlug: string) => {
    await postMutation({
      action: 'remove',
      relationSlug,
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <>
      <button type="button" className="btn btn-outline btn-sm" onClick={openModal}>
        Edit Relations
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="bg-base-100 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-base-300 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-base-300 px-6 py-5">
              <div>
                <h4 className="text-2xl font-semibold">Edit Topic Relations</h4>
                <p className="mt-1 text-sm text-slate-600">
                  Manage typed links for {topicItem}.
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

            {errorMessage && (
              <div className="px-6 pt-4">
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              </div>
            )}

            <div className="grid gap-6 px-6 py-5 md:grid-cols-[1.15fr_0.85fr]">
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <h5 className="text-lg font-semibold">Add relation</h5>
                </div>

                <label className="form-control">
                  <span className="mb-2 text-sm font-medium text-slate-700">
                    Relation type
                  </span>
                  <select
                    value={relationType}
                    onChange={(event) => setRelationType(event.target.value)}
                    className="select select-bordered"
                  >
                    {TOPIC_RELATION_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {TOPIC_RELATION_LABELS[type].forward}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-control mt-4">
                  <span className="mb-2 text-sm font-medium text-slate-700">
                    Search topics
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="input input-bordered w-full"
                    placeholder="Search topics by name, slug, or type"
                  />
                </label>

                <div className="mt-4 max-h-[26rem] overflow-y-auto rounded-2xl border border-base-300">
                  {attachableTopics.length > 0 ? (
                    <div className="flex flex-col divide-y divide-base-300">
                      {attachableTopics.map((topic) => (
                        <div
                          key={topic.slug}
                          className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between"
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
                            onClick={() => handleAttach(topic.slug)}
                          >
                            {isSubmitting ? 'Saving...' : 'Attach'}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-5 py-6 text-sm text-slate-500">
                      No attachable topics found for this relation type.
                    </div>
                  )}
                </div>
              </form>

              <div>
                <div className="mb-4">
                  <h5 className="text-lg font-semibold">Current relations</h5>
                </div>
                <div className="max-h-[32rem] overflow-y-auto rounded-2xl border border-base-300">
                  {currentRelations.length > 0 ? (
                    <div className="flex flex-col divide-y divide-base-300">
                      {currentRelations.map((relation) => {
                        const label =
                          relation.direction === 'outbound'
                            ? TOPIC_RELATION_LABELS[relation.relationType].forward
                            : TOPIC_RELATION_LABELS[relation.relationType].reverse;

                        return (
                          <div
                            key={relation.slug}
                            className="flex flex-col gap-3 px-4 py-4"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="badge badge-soft badge-primary">
                                {label}
                              </span>
                              <span className="badge badge-outline">
                                {relation.direction === 'outbound'
                                  ? 'outbound'
                                  : 'inbound'}
                              </span>
                            </div>
                            <div>
                              <div className="font-semibold">{relation.topicItem}</div>
                              <div className="mt-1 text-sm text-slate-500">
                                {relation.topicSlug}
                              </div>
                            </div>
                            {relation.direction === 'outbound' && (
                              <div>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm text-red-700"
                                  disabled={isSubmitting}
                                  onClick={() => handleRemove(relation.slug)}
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-5 py-6 text-sm text-slate-500">
                      No topic relations yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopicRelationEditor;
