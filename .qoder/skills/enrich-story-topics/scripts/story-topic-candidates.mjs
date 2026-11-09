#!/usr/bin/env node
// Run from the repo root. Prints a deduped choice menu of stories with a low topic count.
// Stories and their translations share one metadata record, so each routeSlug appears once.
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      flags[key] = next;
      i += 1;
    } else {
      flags[key] = true;
    }
  }
  return flags;
}

const flags = parseArgs(process.argv.slice(2));
const max = flags.max !== undefined ? Number(flags.max) : 4;
const min = flags.min !== undefined ? Number(flags.min) : 0;
const limit = flags.limit !== undefined ? Number(flags.limit) : 0;
if (!Number.isInteger(max) || !Number.isInteger(min) || max < 0 || min < 0) {
  console.error("--max and --min must be non-negative integers");
  process.exit(1);
}

const root = process.env.CONTENT_CLI_ROOT || process.cwd();
const libPath = path.join(root, "tools", "content-cli", "lib", "local-content.mjs");
const { loadContentContext } = await import(pathToFileURL(libPath).href);
const ctx = await loadContentContext(root);

const byRoute = new Map();
for (const story of ctx.resolvedStories) {
  if (!byRoute.has(story.routeSlug)) {
    byRoute.set(story.routeSlug, {
      routeSlug: story.routeSlug,
      titles: {},
      languages: new Set(),
      topicSlugs: story.metadata?.topic_slugs || [],
    });
  }
  const record = byRoute.get(story.routeSlug);
  record.languages.add(story.language);
  if (story.data?.title) record.titles[story.language] = story.data.title;
}

let rows = [...byRoute.values()]
  .map((r) => ({
    routeSlug: r.routeSlug,
    title: r.titles.en || r.titles.bn || r.routeSlug,
    title_bn: r.titles.bn || null,
    languages: [...r.languages].sort(),
    topicCount: r.topicSlugs.length,
    topicSlugs: r.topicSlugs,
  }))
  .filter((r) => r.topicCount >= min && r.topicCount <= max)
  .sort((a, b) => a.topicCount - b.topicCount || a.routeSlug.localeCompare(b.routeSlug));

const total = rows.length;
if (limit > 0) rows = rows.slice(0, limit);

if (flags.json) {
  console.log(JSON.stringify({ total, shown: rows.length, stories: rows }, null, 2));
} else {
  const shownNote = limit > 0 && total > rows.length ? ` (showing first ${rows.length})` : "";
  console.log(`Stories with ${min}-${max} topics: ${total} match${total === 1 ? "" : "es"}${shownNote}.`);
  rows.forEach((r, i) => {
    console.log(
      `${String(i + 1).padStart(3)}. ${r.routeSlug}  —  ${r.title}  [${r.languages.join(",")}]  (${r.topicCount} topics)`,
    );
  });
}