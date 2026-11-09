import { getTopicCategory } from "./topic-taxonomy.mjs";

export const TOPIC_RELATION_TYPES = /** @type {const} */ ([
  "located_in",
  "part_of_tradition",
  "member_of",
  "about",
  "commemorates",
  "related_to",
]);

export const TOPIC_RELATION_LABELS = {
  located_in: {
    forward: "Located in",
    reverse: "Contains",
  },
  part_of_tradition: {
    forward: "Part of tradition",
    reverse: "Associated with this tradition",
  },
  member_of: {
    forward: "Member of",
    reverse: "Members",
  },
  about: {
    forward: "About",
    reverse: "Works about this topic",
  },
  commemorates: {
    forward: "Commemorates",
    reverse: "Commemorated at",
  },
  related_to: {
    forward: "Related to",
    reverse: "Related to",
  },
};

/** @param {unknown} value @returns {value is (typeof TOPIC_RELATION_TYPES)[number]} */
export function isTopicRelationType(value) {
  return TOPIC_RELATION_TYPES.some((type) => type === value);
}

export function isSymmetricTopicRelation(type) {
  return type === "related_to";
}

export function getMembershipEndpointError(source, target) {
  if (getTopicCategory(source.types ?? []) !== "Person") {
    return "A member_of relation must start at a Person topic";
  }
  if (getTopicCategory(target.types ?? []) !== "Group" || target.subtype !== "Named collective") {
    return "A member_of relation must point to a Group topic with the Named collective subtype";
  }
  return null;
}

export function getTopicRelationSlug(type, sourceTopicSlug, targetTopicSlug) {
  return `${type}--${sourceTopicSlug}--${targetTopicSlug}`;
}
