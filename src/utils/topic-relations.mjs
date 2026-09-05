export const TOPIC_RELATION_TYPES = [
  "located_in",
  "part_of_tradition",
  "about",
  "related_to",
];

export const TOPIC_RELATION_LABELS = {
  located_in: {
    forward: "Located in",
    reverse: "Contains",
  },
  part_of_tradition: {
    forward: "Part of tradition",
    reverse: "Associated with this tradition",
  },
  about: {
    forward: "About",
    reverse: "Works about this topic",
  },
  related_to: {
    forward: "Related to",
    reverse: "Related to",
  },
};

export function isTopicRelationType(value) {
  return TOPIC_RELATION_TYPES.includes(value);
}

export function getTopicRelationSlug(type, sourceTopicSlug, targetTopicSlug) {
  return `${type}--${sourceTopicSlug}--${targetTopicSlug}`;
}
