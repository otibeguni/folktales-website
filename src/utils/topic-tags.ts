import { TOPIC_TYPE_OPTIONS as TOPIC_TAG_ORDER } from "./topic-taxonomy.mjs";

export { TOPIC_TAG_ORDER };

const TOPIC_TAG_ORDER_INDEX = new Map<string, number>(
  TOPIC_TAG_ORDER.map((tag, index) => [tag, index]),
);

export function sortTopicTags(tags: string[]) {
  return [...tags].sort((a, b) => {
    const aIndex = TOPIC_TAG_ORDER_INDEX.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = TOPIC_TAG_ORDER_INDEX.get(b) ?? Number.MAX_SAFE_INTEGER;

    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }

    return a.localeCompare(b);
  });
}

export function formatTopicTags(tags: string[]) {
  return sortTopicTags(tags).join(" · ");
}

export function getPrimaryTopicTag(tags: string[]) {
  return sortTopicTags(tags)[0] ?? "";
}
