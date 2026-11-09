---
name: enrich-story-topics
description: Curate reusable topics for folktales in this repo via the content CLI. Use when asked to find stories with few/low topics, enrich or expand a story's topics, suggest topics to link or create, or populate topic metadata. Workflow lists low-topic stories, lets the user pick one, reads it, then proposes existing topics to link and new reusable topics to create (significant figures, places, traditions, deities, supernatural beings, communities, source works) — never one-off characters or single-story fictional places — and finally creates, links, and validates.
argument-hint: "[story-slug] [--max N]"
---

# Enrich Story Topics

## Overview

Find stories that have few topics, read one with the user, and enrich it with **reusable**
topics — linking existing ones and creating new ones with complete, valid metadata.

## Prerequisites

- Run every command from the **repo root**.
- Content CLI: `node tools/content-cli/cli.mjs` (equivalently `npm run content -- <args>`).
- **Load `references/topic-guide.md` before proposing or creating any topic.** It holds the
  selection criteria, taxonomy, metadata rules, and worked examples.
- Authoritative sources if needed: `src/utils/topic-taxonomy.mjs`, `src/content.config.ts`.
- If a story slug was passed as an argument, skip step 1 and start at step 2 with that story.

## Workflow

### 1. Find low-topic stories and let the user choose

Run the candidate menu (dedupes translations, sorts by topic count):

```bash
node .qoder/skills/enrich-story-topics/scripts/story-topic-candidates.mjs
```

- Defaults to stories with **0–4 topics** (i.e. fewer than 5). Options: `--max N`, `--min N`,
  `--limit N`, `--json`.
- Equivalent CLI: `node tools/content-cli/cli.mjs list story --max-topics 4 --json`.

Present a numbered list (slug, title, languages, topic count) and **ask the user to pick one**.
If the list is long, show the lowest-count entries first or offer to narrow by language/category
rather than dumping all of them. Wait for the user's choice before continuing.

### 2. Read the chosen story

```bash
node tools/content-cli/cli.mjs get story <slug> --json
```

Returns the body, metadata, and current `links.topics`. Add `--language en` or `--language bn`
to read a specific translation. **Read the full body.** Note the existing topics, the source
work/collection, and the cultural, religious, and geographic setting.

### 3. Propose topics (load `references/topic-guide.md`)

- Identify **reusable entities only**: significant figures, communities, places (real and
  recurring mythic), traditions/religions, deities, supernatural beings, source works/texts,
  and recurring magical objects.
- **Exclude** one-off characters and fictional places unique to this single tale.
- For each candidate, **search existing topics first** (`search topic --query ...`). Decide
  **link existing** vs **create new**; avoid near-duplicates.
- For each new topic, draft full metadata: `slug`, `item`, `item_bn` (if known), `category`,
  `subtype`, `being_kind` (supernatural only), `description`,
  `wikidata_id` (only if verified), and `latitude`/`longitude` (real places).
- Present the proposal grouped into **Link existing** and **Create new** (with the drafted
  metadata and a one-line rationale each). **Ask the user to approve or adjust before writing.**
  Do not create files or modify metadata until approved.

### 4. Create and link (only after approval)

Create each approved new topic. Flags use underscores.

```bash
node tools/content-cli/cli.mjs create topic --slug <slug> --item "<Label>" \
  --category "<Category>" [--subtype "<Subtype>"] [--being_kind class|individual] \
  [--item_bn "<বাংলা>"] [--wikidata_id Q...] [--description "<single line>"] \
  [--latitude <n> --longitude <n>]
```

Link every approved topic (existing or newly created) to the story — repeat `--add` as needed:

```bash
node tools/content-cli/cli.mjs update story <slug> --add topic_slugs=<topic-slug>
```

This edits the shared metadata, so it applies to both translations. See the guide for
category-specific examples and shell-quoting tips.

### 5. Validate and report

```bash
node tools/content-cli/cli.mjs validate topic
node tools/content-cli/cli.mjs validate story
node tools/content-cli/cli.mjs get story <slug> --json
```

Expect no validation issues. Confirm the story's `links.topics` now includes the additions.
Report: topics created, topics linked, and the story's new topic count.

## Guardrails

- **Confirm before any write** (creating topics or changing story metadata).
- **Reuse** existing topics; search before creating.
- **Never fabricate `wikidata_id`** — omit it when unsure.
- Give each topic one category. Use `being_kind` for supernatural beings.
- Keep descriptions single-line; mind shell quoting (edit the file directly for complex text).
- Quality over quantity: a few well-chosen reusable topics beat many one-off entities.

## Resources

- `scripts/story-topic-candidates.mjs` — deduped, sorted menu of low-topic stories
  (`--max`, `--min`, `--limit`, `--json`). Run from the repo root.
- `references/topic-guide.md` — selection criteria, taxonomy table, metadata fields, slug
  conventions, worked create/link/validate commands. Load before step 3.
