import { getTopicCategory, getTopicSubtype } from "./topic-taxonomy.mjs";

export function getTopicDisplayLabels(topic: {
  category?: string | null;
  subtype?: string | null;
}): string[] {
  const category = getTopicCategory(topic);
  const subtype = getTopicSubtype(topic);
  const labels: string[] = [];
  if (category) labels.push(category);
  if (subtype && subtype !== category) labels.push(subtype);
  return labels;
}
