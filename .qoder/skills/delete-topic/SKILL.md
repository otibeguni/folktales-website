---
name: delete-topic
description: Delete an existing topic in this folktales repo by slug, label, or partial name using the content CLI, cascading removal of every reference (story metadata, book and resource topic links, and topic relations). Use when asked to delete, remove, purge, or clean up a topic, or when a topic is rejected as invalid, duplicated, or provenance-only. Finds candidates, disambiguates with the user, previews the cascade with --dry-run, confirms, deletes, and validates.
argument-hint: "<topic-slug-or-name>"
---

# Delete Topic

## Overview

Find the right topic, show exactly what deletion will cascade, then remove the topic
and all references through the content CLI. Never delete content files by hand.

## Prerequisites

- Run every command from the **repo root**.
- Content CLI: `node tools/content-cli/cli.mjs` (equivalently `npm run content -- <args>`).
- Deletion is destructive and irreversible in the working tree. Preview first and get
  explicit user confirmation before the real delete.
- The CLI contract: `delete topic <slug>` removes the topic from `topic_slugs` in story
  metadata, books, and resources, deletes topic relations touching the slug, then deletes
  the topic file. `--dry-run` reports the same plan without writing.

## Workflow

### 1. Resolve the target

If the user supplied something that looks like an exact slug, verify it first:

```bash
node tools/content-cli/cli.mjs get topic <slug> --json
```

If that fails, or the argument is a human name or partial name, search for candidates.

### 2. Search by name or partial name

Search titles first (slug, `item`, `item_bn`):

```bash
node tools/content-cli/cli.mjs search topic --query "<name>" --field title --json
```

If that returns nothing, retry across metadata (description, category, subtype):

```bash
node tools/content-cli/cli.mjs search topic --query "<name>" --json
```

A result record contains `slug`, `summary.item`, `summary.category`, `summary.subtype`,
`summary.path`, and `score`. Bengali names work because `item_bn` is searched.

If there are no results, stop and report that no topic matched. Do not guess a slug.

### 3. Disambiguate

- **One plausible match:** use it.
- **Several matches:** present them (slug, label, category/subtype, file path) and ask the
  user to pick one. Use AskUserQuestion when available; otherwise show a numbered list and
  wait. Never pick a partial match silently, even if one ranks highest.
- **Matches only in description/metadata:** call that out and confirm the intended topic,
  since prose matches often point at a different entity.

### 4. Preview the cascade

```bash
node tools/content-cli/cli.mjs delete topic <slug> --dry-run --json
```

Summarize for the user:

- topic slug, label, and file path
- number and names of affected `story-metadata`, `book`, and `resource` entries
- topic relations that would be deleted
- a reminder that prose mentions (descriptions, book `author` fields) are **not** changed

### 5. Confirm, then delete

Ask for explicit confirmation of the previewed plan. On approval:

```bash
node tools/content-cli/cli.mjs delete topic <slug> --json
```

Use the returned `removedReferences` report rather than re-deriving what changed. Do not
fall back to `rm`, `git rm`, or manual frontmatter edits if the command fails; report the
error instead.

### 6. Validate and report

```bash
node tools/content-cli/cli.mjs validate all
```

Expect `No validation issues.` If validation fails, report the issues and do not claim
success. Finish with: topic deleted, references removed by type, validation result, and any
remaining prose mentions the user may want to reword.

## Guardrails

- **One topic per run.** Do not bulk-delete unless the user explicitly asks; repeat the
  workflow for each slug.
- **Never bypass the CLI.** It is the only path that cleans up references safely.
- **Never delete on an ambiguous match.** Resolve to one slug first.
- **Always preview with `--dry-run` and confirm** before writing.
- `delete` supports only topics and topic relations; other entity types are rejected on
  purpose to avoid broken links.
- Topic relations are deleted as part of the cascade; mention that in the confirmation.
- If a replacement topic will be created, suggest the `enrich-story-topics` skill instead
  of deleting with nothing to replace it.

## Resources

- CLI implementation: `tools/content-cli/cli.mjs`, `tools/content-cli/lib/local-content.mjs`
- CLI tests: `tools/content-cli/content-cli.test.mjs`
- Related skill: `.qoder/skills/enrich-story-topics/` for creating and linking topics
