export const TOPIC_TYPE_OPTIONS = /** @type {const} */ ([
  "Deity", "Person", "People", "Place", "Site", "Kingdom", "Supernatural being", "Work", "Sacred text",
  "Religion", "Tradition", "Event", "Object", "Sacred", "Historical", "Legendary", "Mythic",
  "Natural", "Literary",
]);

export const SUPERNATURAL_BEING_KINDS = /** @type {const} */ (["individual", "class"]);
export const SUPERNATURAL_BEING_KIND_LABELS = {
  individual: "Named supernatural being",
  class: "Class of supernatural beings",
};

const CATEGORY_TAGS = {
  "Supernatural being": ["Supernatural being"],
  Deity: ["Deity"],
  Person: ["Person"],
  Group: ["People"],
  Place: ["Place", "Site", "Kingdom"],
  Work: ["Work"],
  "Sacred text": ["Sacred text"],
  Tradition: ["Religion", "Tradition"],
  Event: ["Event"],
  Object: ["Object"],
};

export const TOPIC_SUBTYPES_BY_CATEGORY = {
  "Supernatural being": ["Angel", "Spirit", "Ghost", "Asura", "Ogre or demon", "Mythic creature", "Mythic figure"],
  Deity: ["Deity", "Folk deity"],
  Person: ["Saint or mystic", "Prophet", "Ruler or leader", "Story character"],
  Group: ["Community", "Social group", "Named collective"],
  Place: ["Settlement or region", "Polity", "Natural feature", "Sacred site", "Archaeological site", "Mythic place"],
  Work: ["Narrative poem", "Story collection"],
  "Sacred text": ["Collection of sacred texts"],
  Tradition: ["Religion", "Ritual", "Devotional school", "Folk tradition"],
  Event: ["Conflict"],
  Object: ["Magical object or substance"],
};

/** @param {readonly string[]} types */
export function getTopicCategory(types) {
  const categories = /** @type {(keyof typeof CATEGORY_TAGS)[]} */ (Object.keys(CATEGORY_TAGS));
  const matches = categories.filter((category) => CATEGORY_TAGS[category].some((tag) => types.includes(tag)));
  return matches.length === 1 ? matches[0] : null;
}

/** @param {{types?: readonly string[], subtype?: string}} topic */
export function getTopicSubtype(topic) {
  return topic.subtype ?? (topic.types?.includes("Deity") ? "Deity" : null);
}

/** @param {readonly string[]} types @param {string} [subtype] @param {string} [beingKind] */
export function validateTopicClassification(types, subtype, beingKind) {
  const category = getTopicCategory(types);
  if (!category) return "Topic tags must resolve to exactly one category";
  if (subtype !== undefined && !TOPIC_SUBTYPES_BY_CATEGORY[category].includes(subtype)) {
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
