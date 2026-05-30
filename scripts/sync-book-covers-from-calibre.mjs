import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { loadEnvFile } from "node:process";
import { DatabaseSync } from "node:sqlite";
import SftpClient from "ssh2-sftp-client";

try {
  loadEnvFile();
} catch {
  // Optional local convenience only.
}

const DEFAULT_CALIBRE_BASE_DIR = "books";
const BOOKS_DIR = "src/content/books";
const OUTPUT_DIR = "public/images/books";
const TEMP_DIR = ".tmp/calibre-cover-sync";
const METADATA_DB_LOCAL_PATH = ".tmp/calibre-cover-sync/metadata.db";

function usage() {
  console.error(`Usage:
  node scripts/sync-book-covers-from-calibre.mjs [options]

Options:
  --slug <book-slug>        Sync a single book entry
  --dry-run                 Resolve matches without downloading or editing files
  --keep-temp               Keep downloaded temp files

Environment:
  CALIBRE_SFTP_HOST
  CALIBRE_SFTP_PORT
  CALIBRE_SFTP_USERNAME
  CALIBRE_SFTP_PASSWORD
  CALIBRE_SFTP_BASE_DIR     Optional, defaults to "books"`);
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    keepTemp: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (arg === "--keep-temp") {
      args.keepTemp = true;
      continue;
    }

    if (!arg.startsWith("--")) {
      throw new Error(`Unknown argument: ${arg}`);
    }

    const key = arg.slice(2);
    const value = argv[index + 1];

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }

    args[key] = value;
    index += 1;
  }

  return args;
}

function normalizeDigits(value) {
  const bengaliDigits = "\u09E6\u09E7\u09E8\u09E9\u09EA\u09EB\u09EC\u09ED\u09EE\u09EF";
  return [...value]
    .map((char) => {
      const digitIndex = bengaliDigits.indexOf(char);
      return digitIndex === -1 ? char : String(digitIndex);
    })
    .join("");
}

function normalizeForMatch(value) {
  return normalizeDigits(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/iu, "")
    .replace(/\(\d+\)$/u, "")
    .replace(/[_.,:;()[\]{}'"’`-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function parseFrontmatterValue(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!match) {
    return undefined;
  }

  const rawValue = match[1].trim();
  return rawValue.replace(/^"(.*)"$/u, "$1").replace(/^'(.*)'$/u, "$1");
}

function loadBookFile(fileName) {
  const filePath = join(BOOKS_DIR, fileName);
  const source = readFileSync(filePath, "utf8");
  const frontmatterMatch = source.match(/^---\r?\n([\s\S]*?)\r?\n---/u);

  if (!frontmatterMatch) {
    throw new Error(`Missing frontmatter in ${filePath}`);
  }

  const frontmatter = frontmatterMatch[1];
  const slug = parseFrontmatterValue(frontmatter, "slug") || fileName.replace(/\.md$/u, "");
  const name = parseFrontmatterValue(frontmatter, "name");

  if (!slug || !name) {
    throw new Error(`Missing required book metadata in ${filePath}`);
  }

  return {
    fileName,
    filePath,
    source,
    slug,
    name,
    author: parseFrontmatterValue(frontmatter, "author"),
    coverImage: parseFrontmatterValue(frontmatter, "cover_image"),
  };
}

function loadBookFiles(slug) {
  if (slug) {
    return [loadBookFile(`${slug}.md`)];
  }

  return readdirSync(BOOKS_DIR)
    .filter((fileName) => fileName.endsWith(".md"))
    .sort()
    .map((fileName) => loadBookFile(fileName));
}

function updateCoverImage(filePath, nextCoverImage) {
  const source = readFileSync(filePath, "utf8");

  if (/^cover_image:\s+/m.test(source)) {
    const updated = source.replace(/^cover_image:\s+.*$/m, `cover_image: "${nextCoverImage}"`);
    writeFileSync(filePath, updated, "utf8");
    return;
  }

  const frontmatterMatch = source.match(/^---\r?\n([\s\S]*?)\r?\n---/u);
  if (!frontmatterMatch) {
    throw new Error(`Missing frontmatter in ${filePath}`);
  }

  const frontmatter = frontmatterMatch[1];
  const lines = frontmatter.split(/\r?\n/u);
  const insertIndex = lines.findIndex((line) => /^(library_url|url):\s+/u.test(line));
  const targetIndex = insertIndex === -1 ? lines.length : insertIndex + 1;
  lines.splice(targetIndex, 0, `cover_image: "${nextCoverImage}"`);

  const updatedFrontmatter = `---\n${lines.join("\n")}\n---`;
  const updatedSource = source.replace(/^---\r?\n[\s\S]*?\r?\n---/u, updatedFrontmatter);
  writeFileSync(filePath, updatedSource, "utf8");
}

function getCalibreConfig() {
  const host = process.env.CALIBRE_SFTP_HOST;
  const port = Number(process.env.CALIBRE_SFTP_PORT || "22");
  const username = process.env.CALIBRE_SFTP_USERNAME;
  const password = process.env.CALIBRE_SFTP_PASSWORD;
  const baseDir = process.env.CALIBRE_SFTP_BASE_DIR || DEFAULT_CALIBRE_BASE_DIR;

  if (!host || !username || !password) {
    throw new Error("Missing one or more Calibre SFTP environment variables.");
  }

  return { host, port, username, password, baseDir };
}

async function downloadMetadataDb(sftp, calibreConfig) {
  mkdirSync(TEMP_DIR, { recursive: true });
  await sftp.fastGet(`${calibreConfig.baseDir}/metadata.db`, METADATA_DB_LOCAL_PATH);
  return METADATA_DB_LOCAL_PATH;
}

function loadCalibreBooks(metadataDbPath) {
  const database = new DatabaseSync(metadataDbPath, {
    readOnly: true,
  });

  try {
    return database.prepare(`
      SELECT
        id,
        title,
        path,
        has_cover AS hasCover
      FROM books
    `).all();
  } finally {
    database.close();
  }
}

function groupCalibreBooksByTitle(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const key = normalizeForMatch(row.title);
    const current = grouped.get(key) || [];
    current.push(row);
    grouped.set(key, current);
  }

  return grouped;
}

function describeCandidates(rows) {
  return rows.map((row) => ({
    calibreBookId: row.id,
    title: row.title,
    path: row.path,
    hasCover: Boolean(row.hasCover),
  }));
}

function resolveBook(book, groupedRows, calibreConfig) {
  const candidates = groupedRows.get(normalizeForMatch(book.name)) || [];

  if (candidates.length === 0) {
    return {
      slug: book.slug,
      bookName: book.name,
      status: "unmatched",
      candidates: [],
    };
  }

  if (candidates.length > 1) {
    return {
      slug: book.slug,
      bookName: book.name,
      status: "ambiguous",
      candidates: describeCandidates(candidates),
    };
  }

  const match = candidates[0];
  if (!match.hasCover) {
    return {
      slug: book.slug,
      bookName: book.name,
      status: "no-cover",
      calibreBookId: match.id,
      remotePath: `${calibreConfig.baseDir}/${match.path}/cover.jpg`,
      candidates: describeCandidates(candidates),
    };
  }

  return {
    slug: book.slug,
    bookName: book.name,
    status: "matched",
    calibreBookId: match.id,
    remotePath: `${calibreConfig.baseDir}/${match.path}/cover.jpg`,
    outputPath: `/images/books/${book.slug}.jpg`,
    candidates: describeCandidates(candidates),
  };
}

function summarize(results) {
  const summary = {
    total: results.length,
    matched: 0,
    updated: 0,
    unchanged: 0,
    ambiguous: 0,
    unmatched: 0,
    noCover: 0,
    missingRemote: 0,
    errors: 0,
  };

  for (const result of results) {
    if (result.status === "matched") summary.matched += 1;
    if (result.status === "updated") summary.updated += 1;
    if (result.status === "unchanged") summary.unchanged += 1;
    if (result.status === "ambiguous") summary.ambiguous += 1;
    if (result.status === "unmatched") summary.unmatched += 1;
    if (result.status === "no-cover") summary.noCover += 1;
    if (result.status === "missing-remote-cover") summary.missingRemote += 1;
    if (result.status === "error") summary.errors += 1;
  }

  return summary;
}

async function main() {
  let args;

  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    usage();
    process.exit(1);
  }

  const calibreConfig = getCalibreConfig();
  const books = loadBookFiles(args.slug);
  const sftp = new SftpClient();
  const downloadedTempDirs = new Set();

  try {
    await sftp.connect({
      host: calibreConfig.host,
      port: calibreConfig.port,
      username: calibreConfig.username,
      password: calibreConfig.password,
    });

    const metadataDbPath = await downloadMetadataDb(sftp, calibreConfig);
    const groupedRows = groupCalibreBooksByTitle(loadCalibreBooks(metadataDbPath));
    const resolvedResults = books.map((book) => ({
      ...resolveBook(book, groupedRows, calibreConfig),
      bookFile: book.filePath,
      previousCoverImage: book.coverImage,
    }));

    if (args.dryRun) {
      console.log(
        JSON.stringify(
          {
            mode: "dry-run",
            summary: summarize(resolvedResults),
            results: resolvedResults,
          },
          null,
          2,
        ),
      );
      return;
    }

    mkdirSync(OUTPUT_DIR, { recursive: true });
    const finalResults = [];

    for (const result of resolvedResults) {
      if (result.status !== "matched") {
        finalResults.push(result);
        continue;
      }

      try {
        const remoteExists = await sftp.exists(result.remotePath);
        if (!remoteExists) {
          finalResults.push({
            ...result,
            status: "missing-remote-cover",
          });
          continue;
        }

        const tempDir = join(TEMP_DIR, result.slug);
        const localTempPath = join(tempDir, basename(result.remotePath));
        const localOutputPath = join(OUTPUT_DIR, `${result.slug}.jpg`);

        mkdirSync(tempDir, { recursive: true });
        downloadedTempDirs.add(tempDir);
        await sftp.fastGet(result.remotePath, localTempPath);
        writeFileSync(localOutputPath, readFileSync(localTempPath));

        if (result.previousCoverImage === result.outputPath) {
          finalResults.push({
            ...result,
            status: "unchanged",
            localOutputPath,
          });
          continue;
        }

        updateCoverImage(result.bookFile, result.outputPath);
        finalResults.push({
          ...result,
          status: "updated",
          localOutputPath,
        });
      } catch (error) {
        finalResults.push({
          ...result,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log(
      JSON.stringify(
        {
          mode: "sync",
          summary: summarize(finalResults),
          results: finalResults,
        },
        null,
        2,
      ),
    );
  } finally {
    await sftp.end().catch(() => {});

    if (!args.keepTemp) {
      for (const tempDir of downloadedTempDirs) {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  }
}

await main();
