import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import yaml from "js-yaml";

const rootDir = process.cwd();
const contentDir = path.join(rootDir, "src", "content");
const reportDir = path.join(rootDir, "migration");

const TOPIC_TYPE_NORMALIZATION = {
  "Ancient kingdom": "Ancient Kingdom",
};

function readEnvFile() {
  const envPath = path.join(rootDir, ".env");
  return fs.readFile(envPath, "utf8").then((raw) => {
    const env = {};
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#")) continue;
      const index = line.indexOf("=");
      if (index === -1) continue;
      env[line.slice(0, index).trim()] = line.slice(index + 1).trim();
    }
    return env;
  });
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureLeadingArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value].filter(Boolean);
}

function splitMarkdownFile(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: raw };
  }
  return {
    data: yaml.load(match[1]) ?? {},
    body: match[2] ?? "",
  };
}

function dumpMarkdown(data, body = "") {
  const normalizedBody = body.replace(/^\s+/, "");
  const frontmatter = yaml.dump(data, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });
  return `---\n${frontmatter}---\n\n${normalizedBody}`;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function resetDir(dirPath) {
  await fs.rm(dirPath, { recursive: true, force: true });
  await fs.mkdir(dirPath, { recursive: true });
}

async function fetchAllRows(baseUrl, token, tableId, extra = "") {
  let url = `${baseUrl}/api/database/rows/table/${tableId}/?user_field_names=true&size=200${extra}`;
  const rows = [];
  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Token ${token}`,
      },
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(
        `Failed to fetch table ${tableId}: ${response.status} ${JSON.stringify(payload)}`,
      );
    }
    rows.push(...payload.results);
    url = payload.next;
  }
  return rows;
}

function firstCategoryValue(categories) {
  const normalized = ensureLeadingArray(categories).map((item) =>
    typeof item === "string" ? item : item?.value,
  );
  return normalized.find(Boolean);
}

function normalizeTopicType(value) {
  return TOPIC_TYPE_NORMALIZATION[value] ?? value;
}

function buildBookSlug(book) {
  if (book.slug && String(book.slug).trim()) {
    return String(book.slug).trim();
  }
  const nameSlug = slugify(book.name ?? "");
  return nameSlug ? `book-${book.id}-${nameSlug}` : `book-${book.id}`;
}

function buildResourceSlug(resource) {
  const titleSlug = slugify(resource.title ?? "");
  return titleSlug
    ? `resource-${resource.id}-${titleSlug}`
    : `resource-${resource.id}`;
}

async function loadMarkdownFiles(dirPath) {
  const files = await fs.readdir(dirPath);
  return Promise.all(
    files
      .filter((file) => file.endsWith(".md") || file.endsWith(".mdx"))
      .map(async (file) => {
        const raw = await fs.readFile(path.join(dirPath, file), "utf8");
        return {
          file,
          ...splitMarkdownFile(raw),
        };
      }),
  );
}

async function writeMarkdownFile(targetPath, data, body = "") {
  await ensureDir(path.dirname(targetPath));
  await fs.writeFile(targetPath, dumpMarkdown(data, body), "utf8");
}

async function main() {
  const env = await readEnvFile();
  if (!env.BASEROW_URL || !env.BASEROW_TOKEN) {
    throw new Error("Missing BASEROW_URL or BASEROW_TOKEN in .env");
  }

  await ensureDir(reportDir);
  await resetDir(contentDir);

  const [topicRows, storyMetadataRows, bookRows, resourceRows] =
    await Promise.all([
      fetchAllRows(env.BASEROW_URL, env.BASEROW_TOKEN, 740),
      fetchAllRows(
        env.BASEROW_URL,
        env.BASEROW_TOKEN,
        741,
        "&sources__join=name,author,url,library_url,slug,language,category&related_wikidata__join=slug,item,type,description,item_bn,wikidata_id&related_resources__join=title,type,url",
      ),
      fetchAllRows(env.BASEROW_URL, env.BASEROW_TOKEN, 742),
      fetchAllRows(
        env.BASEROW_URL,
        env.BASEROW_TOKEN,
        747,
        "&related_wikidata__join=slug,item,type",
      ),
    ]);

  const topicReport = {
    normalizedTypes: [],
  };

  for (const topic of topicRows) {
    const normalizedType = normalizeTopicType(topic.type);
    if (normalizedType !== topic.type) {
      topicReport.normalizedTypes.push({
        slug: topic.slug,
        from: topic.type,
        to: normalizedType,
      });
    }
    await writeMarkdownFile(
      path.join(contentDir, "topics", `${topic.slug}.md`),
      {
        slug: topic.slug,
        item: topic.item,
        item_bn: topic.item_bn || undefined,
        wikidata_id: topic.wikidata_id || undefined,
        type: normalizedType,
        description: topic.description || undefined,
      },
      "",
    );
  }

  const bookSlugById = new Map();
  const generatedBookSlugs = [];
  for (const book of bookRows) {
    const slug = buildBookSlug(book);
    bookSlugById.set(book.id, slug);
    if (!book.slug || !String(book.slug).trim()) {
      generatedBookSlugs.push({ id: book.id, name: book.name, slug });
    }
    const categories = ensureLeadingArray(book.category).map((item) =>
      typeof item === "string" ? item : item?.value,
    ).filter(Boolean);
    await writeMarkdownFile(
      path.join(contentDir, "books", `${slug}.md`),
      {
        slug,
        name: book.name,
        author: book.author || undefined,
        url: book.url || undefined,
        library_url: book.library_url || undefined,
        language: book.language || "bn",
        category: firstCategoryValue(book.category),
        categories,
      },
      "",
    );
  }

  const resourceSlugById = new Map();
  const resourceSlugByTitle = new Map();
  const generatedResourceSlugs = [];
  for (const resource of resourceRows) {
    const slug = buildResourceSlug(resource);
    resourceSlugById.set(resource.id, slug);
    resourceSlugByTitle.set(resource.title, slug);
    generatedResourceSlugs.push({ id: resource.id, title: resource.title, slug });
    await writeMarkdownFile(
      path.join(contentDir, "resources", `${slug}.md`),
      {
        slug,
        title: resource.title,
        url: resource.url,
        type: resource.type?.value ?? String(resource.type),
        topic_slugs: ensureLeadingArray(resource.related_wikidata).map(
          (topic) => topic.slug || topic.value,
        ).filter(Boolean),
      },
      "",
    );
  }

  const storyMetadataBySlug = new Map(
    storyMetadataRows.map((row) => [row.slug, row]),
  );

  const missingStoryMetadata = [];

  for (const language of ["en", "bn"]) {
    const sourceDir = path.join(rootDir, "src", "stories", language);
    const files = await loadMarkdownFiles(sourceDir);
    for (const file of files) {
      const slug = file.data.slug;
      const metadata = storyMetadataBySlug.get(slug);
      const nextData = {
        title: file.data.title,
        title_bn: file.data.title_bn || undefined,
        category: file.data.category,
        slug,
        language: file.data.language || language,
        cover_image: metadata?.cover_image || undefined,
        source_slug: metadata?.sources?.[0]
          ? bookSlugById.get(metadata.sources[0].id)
          : undefined,
        source_label: !metadata?.sources?.[0] && file.data.source
          ? file.data.source
          : undefined,
        topic_slugs: metadata?.related_wikidata
          ? metadata.related_wikidata
              .map((topic) => topic.slug || topic.value)
              .filter(Boolean)
          : [],
        resource_slugs: metadata?.related_resources
          ? metadata.related_resources
              .map((resource) =>
                resourceSlugById.get(resource.id) ||
                resourceSlugByTitle.get(resource.title || resource.value),
              )
              .filter(Boolean)
          : [],
      };
      if (!metadata) {
        missingStoryMetadata.push({
          slug,
          language: nextData.language,
        });
      }
      await writeMarkdownFile(
        path.join(contentDir, "stories", language, file.file),
        nextData,
        file.body,
      );
    }
  }

  const codexFiles = await loadMarkdownFiles(path.join(rootDir, "src", "codex"));
  for (const file of codexFiles) {
    await writeMarkdownFile(
      path.join(contentDir, "codex", file.file),
      {
        title: file.data.title,
        slug: file.data.slug,
        category: file.data.category,
        language: file.data.language || "en",
        date: file.data.date || undefined,
      },
      file.body,
    );
  }

  const collectionFiles = await loadMarkdownFiles(
    path.join(rootDir, "src", "stories", "collections"),
  );
  for (const file of collectionFiles) {
    await writeMarkdownFile(
      path.join(contentDir, "storyCollections", file.file),
      {
        title: file.data.title,
        slug: file.data.slug,
        order: Number(file.data.order),
        isShow: Boolean(file.data.isShow),
        stories: ensureLeadingArray(file.data.stories).map(String),
      },
      file.body,
    );
  }

  const report = {
    generatedAt: new Date().toISOString(),
    stats: {
      topics: topicRows.length,
      storyMetadata: storyMetadataRows.length,
      books: bookRows.length,
      resources: resourceRows.length,
      missingStoryMetadataRows: missingStoryMetadata,
    },
    generatedBookSlugs,
    generatedResourceSlugs,
    normalizedTopicTypes: topicReport.normalizedTypes,
  };

  await fs.writeFile(
    path.join(reportDir, "baserow-content-report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
