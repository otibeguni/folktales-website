#!/usr/bin/env node
import readline from "node:readline/promises";
import process from "node:process";
import {
  ENTITY_ORDER,
  applyEntityFilters,
  buildDataFromFlags,
  buildGenericInspect,
  buildStoryInspect,
  buildTemplate,
  createEntry,
  findEntry,
  getDoctorReport,
  getEntriesForEntity,
  getFieldDefinitions,
  getRelatedEntries,
  loadContentContext,
  openPathInEditor,
  promptForMissingFields,
  readBodyInput,
  isUserVisibleEntity,
  resolveEntityName,
  searchEntries,
  summarizeEntry,
  updateEntry,
  validateContext,
} from "./lib/local-content.mjs";

function printUsage() {
  console.log(`Usage:
  content list <entity> [filters] [--json]
  content get <entity> <slug> [--language <en|bn>] [--json]
  content search <entity|all> --query <text> [filters] [--field title|body|metadata|all] [--json]
  content create <entity> [flags]
  content update <entity> <slug> [--set field=value] [--add field=value] [--remove field=value]
  content validate [entity|all] [--json]
  content related <entity> <slug> [--language <en|bn>] [--json]
  content template <entity>
  content fields <entity> [--json]
  content doctor [--json]

Entities:
  story, topic, topic-relation, resource, book, story-collection`);
}

function parseArgs(argv) {
  const positionals = [];
  const flags = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    const withoutPrefix = token.slice(2);
    const [rawKey, inlineValue] = withoutPrefix.split("=", 2);
    let value = inlineValue;
    if (value === undefined) {
      const nextToken = argv[index + 1];
      if (nextToken !== undefined && !nextToken.startsWith("--")) {
        value = nextToken;
        index += 1;
      } else {
        value = true;
      }
    }

    if (flags[rawKey] === undefined) {
      flags[rawKey] = value;
    } else if (Array.isArray(flags[rawKey])) {
      flags[rawKey].push(value);
    } else {
      flags[rawKey] = [flags[rawKey], value];
    }
  }

  return { positionals, flags };
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function pickPrimaryLabel(summary) {
  return (
    summary.title ||
    summary.name ||
    summary.item ||
    summary.category ||
    summary.slug
  );
}

function printTable(items) {
  if (items.length === 0) {
    console.log("No results.");
    return;
  }

  const rows = items.map((item) => ({
    entity: item.entity,
    slug: item.routeSlug || item.slug,
    label: pickPrimaryLabel(item),
    detail:
      item.detail ||
      item.language ||
      item.category ||
      item.type ||
      (Array.isArray(item.types) ? item.types.join(", ") : "") ||
      item.path ||
      "",
  }));

  const widths = {
    entity: Math.max(...rows.map((row) => row.entity.length), 6),
    slug: Math.max(...rows.map((row) => row.slug.length), 4),
    label: Math.max(...rows.map((row) => String(row.label).length), 5),
  };

  for (const row of rows) {
    console.log(
      `${row.entity.padEnd(widths.entity)}  ${row.slug.padEnd(widths.slug)}  ${String(
        row.label,
      ).padEnd(widths.label)}  ${row.detail}`,
    );
  }
}

function printInspect(record) {
  const summaryLabel = pickPrimaryLabel(record);
  console.log(`${summaryLabel} (${record.entity || "entry"})`);
  console.log(`slug: ${record.routeSlug || record.slug}`);
  if (record.language) console.log(`language: ${record.language}`);
  if (record.path) console.log(`path: ${record.path}`);
  if (record.metadataCategory) console.log(`category: ${record.metadataCategory}`);
  if (record.category) console.log(`category: ${record.category}`);
  if (record.author) console.log(`author: ${record.author}`);
  if (record.types) console.log(`types: ${record.types.join(", ")}`);
  if (record.sourceSlug) console.log(`source_slug: ${record.sourceSlug}`);
  if (record.sourceLabel) console.log(`source_label: ${record.sourceLabel}`);
  if (record.metadata) {
    console.log(`metadata: ${JSON.stringify(record.metadata)}`);
  } else if (record.data) {
    console.log(`data: ${JSON.stringify(record.data)}`);
  }
  if (record.links) {
    console.log(`links: ${JSON.stringify(record.links)}`);
  }
  if (record.body && record.body.trim()) {
    console.log("");
    console.log(record.body.trim().slice(0, 500));
  }
}

async function withPrompt(callback) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    return await callback(async (question) => {
      const answer = await rl.question(`${question}: `);
      return answer.trim();
    });
  } finally {
    rl.close();
  }
}

function getBooleanFlag(flags, key) {
  return flags[key] === true || flags[key] === "true";
}

function normalizeLimit(flags) {
  return flags.limit ? Number(flags.limit) : undefined;
}

async function main() {
  const { positionals, flags } = parseArgs(process.argv.slice(2));
  const [command, entityArg, maybeSlug] = positionals;

  if (!command || command === "help" || command === "--help") {
    printUsage();
    return;
  }

  if (command === "template") {
    if (!isUserVisibleEntity(entityArg)) throw new Error("template requires a supported entity");
    process.stdout.write(buildTemplate(entityArg));
    return;
  }

  if (command === "fields") {
    if (!isUserVisibleEntity(entityArg)) throw new Error("fields requires a supported entity");
    const fields = getFieldDefinitions(entityArg);
    if (getBooleanFlag(flags, "json")) {
      printJson(fields);
    } else {
      for (const field of fields) {
        console.log(
          `${field.name}  type=${field.type}  required=${field.required ? "yes" : "no"}`,
        );
      }
    }
    return;
  }

  const context = await loadContentContext();

  if (command === "doctor") {
    const report = getDoctorReport(context);
    if (getBooleanFlag(flags, "json")) {
      printJson(report);
    } else {
      console.log(`root: ${report.rootDir}`);
      printTable(
        Object.entries(report.counts).map(([entity, count]) => ({
          entity,
          slug: String(count),
          path: "",
        })),
      );
      console.log(`issues: ${report.issues.length}`);
    }
    return;
  }

  if (command === "validate") {
    const scope = entityArg ? resolveEntityName(entityArg) || entityArg : "all";
    const issues = validateContext(context, scope);
    if (getBooleanFlag(flags, "json")) {
      printJson(issues);
    } else if (issues.length === 0) {
      console.log("No validation issues.");
    } else {
      for (const issue of issues) {
        console.log(`${issue.severity}  ${issue.entity}  ${issue.slug}  ${issue.message}`);
      }
    }
    if (issues.length > 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (entityArg !== "all" && !isUserVisibleEntity(entityArg)) {
    throw new Error(`Unknown entity: ${entityArg}`);
  }

  if (command === "list") {
    const entries = applyEntityFilters(
      getEntriesForEntity(context, entityArg),
      context,
      entityArg,
      flags,
    );
    const summaries = entries.map((entry) => summarizeEntry(entry, context));
    if (getBooleanFlag(flags, "json")) {
      printJson(summaries);
    } else if (getBooleanFlag(flags, "quiet")) {
      for (const summary of summaries) {
        console.log(summary.path || summary.slug);
      }
    } else {
      printTable(summaries);
    }
    return;
  }

  if (command === "get") {
    if (!maybeSlug) throw new Error("get requires a slug");
    const entry = findEntry(context, entityArg, maybeSlug, { language: flags.language });
    if (!entry) throw new Error(`Could not find ${entityArg} "${maybeSlug}"`);
    const record =
      entry.entity === "story"
        ? buildStoryInspect(context, entry)
        : buildGenericInspect(context, entry);
    if (getBooleanFlag(flags, "json")) {
      printJson(record);
    } else {
      printInspect(record);
    }
    return;
  }

  if (command === "related") {
    if (!maybeSlug) throw new Error("related requires a slug");
    const related = getRelatedEntries(context, entityArg, maybeSlug, { language: flags.language });
    if (!related) throw new Error(`Could not find ${entityArg} "${maybeSlug}"`);
    if (getBooleanFlag(flags, "json")) {
      printJson(related);
    } else {
      console.log(`Entry: ${pickPrimaryLabel(related.entry)} (${related.entry.slug})`);
      console.log("Outbound:");
      printTable(related.outbound.map((item) => ({ ...item, path: "" })));
      console.log("Inbound:");
      printTable(related.inbound.map((item) => ({ ...item, path: "" })));
    }
    return;
  }

  if (command === "search") {
    const query = flags.query;
    if (!query) throw new Error("search requires --query");
    const results = searchEntries(context, entityArg, query, {
      ...flags,
      limit: normalizeLimit(flags),
    });
    if (getBooleanFlag(flags, "json")) {
      printJson(results);
    } else if (results.length === 0) {
      console.log("No results.");
    } else {
      for (const result of results) {
        console.log(
          `${result.entity}  ${result.summary.routeSlug || result.slug}  ${pickPrimaryLabel(
            result.summary,
          )}  score=${result.score}  fields=${result.matchedFields.join(",") || "-"}`,
        );
        if (result.snippet) {
          console.log(`  ${result.snippet}`);
        }
      }
    }
    return;
  }

  if (command === "create") {
    const entityName = entityArg;
    let data = buildDataFromFlags(entityName, flags);
    const body = await readBodyInput(flags);

    if (process.stdin.isTTY) {
      data = await withPrompt((prompt) => promptForMissingFields(entityName, data, prompt));
    }

    const created = await createEntry(context.rootDir, entityName, data, body);
    if (getBooleanFlag(flags, "open")) {
      await openPathInEditor(created.path);
    }
    if (getBooleanFlag(flags, "json")) {
      printJson(created);
    } else {
      console.log(created.relativePath);
    }
    return;
  }

  if (command === "update") {
    if (!maybeSlug) throw new Error("update requires a slug");
    const body = flags.body !== undefined || flags["body-file"] !== undefined
      ? await readBodyInput(flags)
      : undefined;
    const updated = await updateEntry(
      context.rootDir,
      entityArg,
      maybeSlug,
      {
        set: flags.set,
        add: flags.add,
        remove: flags.remove,
        body,
      },
      { language: flags.language },
    );
    if (getBooleanFlag(flags, "open")) {
      await openPathInEditor(updated.path);
    }
    if (getBooleanFlag(flags, "json")) {
      printJson(updated);
    } else {
      console.log(updated.relativePath);
    }
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
