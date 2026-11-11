---
name: enrich-story-topics
description: Curate reusable topics for folktales in this repo via the content CLI. Use when asked to find stories with few/low topics, enrich or expand a story's topics, suggest topics to link or create, or populate topic metadata. Workflow lists low-topic stories, lets the user pick one, reads it, then proposes existing topics to link and new reusable topics to create (significant figures, places, traditions, deities, supernatural beings, communities) — never one-off characters or eponymous leads, single-story fictional places or plot props, granular place nodes, source collections/works, authors or compilers, or catch-all culture labels like "Bengali folklore" — and finally creates, links, and validates.
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

- This skill enriches **one story per run**. New topics start with one story link and are not
  back-filled onto stories processed earlier. Do not use link counts to justify a topic. For
  every new topic, name a **specific unprocessed or planned story** that would link it; if you
  cannot, drop the candidate. "It might recur" is not enough.
- Identify **reusable entities only** — `Person` figures, `Group` communities, the place
  categories (`Landscape`, `Settlement`, `Region`, `Polity`, `Site`, `Realm`), `Tradition`,
  `Deity`, `Supernatural being`, `Event`, `Object`, and `Work` texts that appear inside stories.
  Category/subtype names live in `src/utils/topic-taxonomy.mjs`; the guide mirrors them.
- **Class before individual.** Search for the type (`pari`, `daitya-asura`, `rakshasa`, `jinn`,
  `pir`, `zamindar`) before naming an instance. If the class exists, link it unless the
  individual has independent significance outside the plot. An individual created now may stay
  a one-story node forever.
- **Exclude one-off cast**, including the protagonist, antagonist, eponymous ruler, or
  supporting character of a single tale. Historical/religious figures with independent
  significance are the exception, not fictional leads.
- **Exclude single-tale fictional places and one-off plot props.** For real places, use the
  coarsest node that carries the geography; skip villages, wards, upazilas, and one-legend
  landmarks when a city/region hub covers the setting.
- `Object` is only for magical objects/substances. Create the reusable motif, not the named
  prop. Mundane food, drink, and clothing are not Objects.
- **Never create provenance or catch-all topics**: no topics for the source collection/work a
  story is published in, none for its author/compiler/translator, and none for broad culture
  labels ("Bengali folklore", "Chakma folklore"). A broad label may be linked only when it
  anchors concrete children or already spans multiple stories.
- For each candidate, **search existing topics first** (`search topic --query ...`). Decide
  **link existing** vs **create new**; avoid near-duplicates.
- For each new topic, draft full metadata: `slug`, `item`, `item_bn` (if known), `category`,
  `subtype`, `being_kind` (supernatural only), `description`,
  `wikidata_id` (only if verified), and `latitude`/`longitude` (real places).
- Aim for **4–6 new topics per story**. If you have more candidates, rank them by the future
  story that would link them, class/hub coverage, and concreteness; keep the strongest.
- Present the proposal grouped into **Link existing** and **Create new** (with the drafted
  metadata and a one-line rationale each, including why an existing class/hub is not enough).
  **Ask the user to approve or adjust before writing.** Do not create files or modify metadata
  until approved.

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

Every new topic will have exactly one story link in a one-story run; that is expected, not a
quality signal. Do not add a retroactive link-count audit.

## Guardrails

- **Confirm before any write** (creating topics or changing story metadata).
- **One-story scope**: a new topic starts with one link and is not back-filled; require a
  concrete future story, not "might recur."
- **Reuse** existing topics; search before creating.
- **Class before individual**: link the type (`pari`, `daitya-asura`, `rakshasa`, `pir`) before
  creating a named instance.
- **No one-off cast or eponymous leads**: a story title is not evidence of reuse. Historical or
  religious figures with independent significance are the exception.
- **Coarse places only**: no single-tale fictional places, villages, wards, upazilas, or
  one-legend landmarks when a city/region hub exists.
- **Objects are magical**: create the reusable motif (`Magic Mirror`), not the plot prop
  (`Bakawali Flower`); mundane food, drink, and clothing are not Objects.
- **Broad labels must anchor something**: `pir` and `fakir` do; `Hindustan` and `Alcohol` did not.
- **Budget**: aim for 4–6 new topics per story; rank candidates instead of creating all.
- **No provenance topics**: never create `Work`/collection topics or author/compiler
  (`Author or collector`) topics, and never link an existing one merely because the story comes
  from that book or was written by that person.
- **No catch-all culture topics**: avoid broad labels like "Bengali folklore", "Chakma
  folklore", "Indian mythology", or "puthi literature"; link or create the specific entity
  instead.
- **Never fabricate `wikidata_id`** — omit it when unsure.
- **Respect the taxonomy**: one category per topic; the subtype must come from that category's
  list and is required only for the six place categories (omit it when nothing fits — `Deity`
  has no `Other`). Set `being_kind` (`class`/`individual`) only on supernatural beings. Never
  write the removed `types` field.
- Keep descriptions single-line; mind shell quoting (edit the file directly for complex text).
- Quality over quantity: a few well-chosen reusable topics beat many one-off entities.

## Resources

- `scripts/story-topic-candidates.mjs` — deduped, sorted menu of low-topic stories
  (`--max`, `--min`, `--limit`, `--json`). Run from the repo root.
- `references/topic-guide.md` — selection criteria, taxonomy table, metadata fields, slug
  conventions, worked create/link/validate commands. Load before step 3.
