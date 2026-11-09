export const SUPERNATURAL_BEING_KINDS = /** @type {const} */ (["individual", "class"]);
export const SUPERNATURAL_BEING_KIND_LABELS = {
  individual: "Named supernatural being",
  class: "Class of supernatural beings",
};

export const PLACE_CATEGORIES = /** @type {const} */ ([
  "Landscape", "Settlement", "Region", "Polity", "Site", "Realm",
]);

export const TOPIC_CATEGORIES = /** @type {const} */ ([
  ...PLACE_CATEGORIES, "Deity", "Person", "Group", "Supernatural being",
  "Work", "Tradition", "Event", "Object",
]);

/** @param {string | null | undefined} category @returns {category is (typeof PLACE_CATEGORIES)[number]} */
export function isPlaceCategory(category) {
  return PLACE_CATEGORIES.some((option) => option === category);
}

export const TOPIC_SUBTYPES_BY_CATEGORY = {
  Landscape: ["River", "Hill or mountain", "Island", "Wetland", "Sea", "Forest", "Other"],
  Settlement: ["City", "Town", "Locality", "Other"],
  Region: ["District", "Administrative area", "Geographic region", "Other"],
  Polity: ["Kingdom", "Other"],
  Site: ["Shrine / mazar", "Temple", "Archaeological site", "Other"],
  Realm: ["Cosmological realm", "Other"],
  "Supernatural being": ["Spirit", "Animal-like being", "Other"],
  Deity: ["Folk deity", "Avatar"],
  Person: ["Saint or mystic", "Prophet", "Other Religious Figure", "Ruler", "Author or collector", "Other"],
  Group: ["Community", "Social group", "Named collective"],
  Work: ["Collection", "Puthi", "Epic", "Narrative poetry", "Scripture", "Other"],
  Tradition: ["Religion", "Ritual", "Devotional school", "Folk tradition"],
  Event: ["Conflict"],
  Object: ["Magical object or substance"],
};

/** @typedef {{category?: string | null, types?: unknown, subtype?: string | null, being_kind?: string}} TopicClassification */

/** @param {TopicClassification} topic */
export function getTopicCategory({ category }) {
  return TOPIC_CATEGORIES.find((option) => option === category) ?? null;
}

/** @param {TopicClassification} topic */
export function getTopicSubtype(topic) {
  return topic.subtype ?? null;
}

/** @param {TopicClassification} topic */
export function validateTopicClassification(topic) {
  const { types, subtype, being_kind: beingKind } = topic;
  if (types !== undefined) return "Topic categories and subtypes replace the types field";
  const category = getTopicCategory(topic);
  if (!category) return "Topics require a valid category";
  if (isPlaceCategory(category) && !subtype) return "Place topics require a subtype";
  if (subtype !== undefined && !TOPIC_SUBTYPES_BY_CATEGORY[category].some((option) => option === subtype)) {
    return `Invalid subtype "${subtype}" for topic category "${category}"`;
  }
  if (category === "Supernatural being") {
    if (beingKind !== "individual" && beingKind !== "class") {
      return 'Supernatural beings require being_kind of "individual" or "class"';
    }
  } else if (beingKind !== undefined) {
    return "being_kind is only valid for supernatural beings";
  }
  return null;
}
