import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { loadEnvFile } from "node:process";
import { DatabaseSync } from "node:sqlite";
import SftpClient from "ssh2-sftp-client";
import { uploadFileToR2 } from "./lib/r2-upload.mjs";

try {
  loadEnvFile();
} catch {
  // Optional local convenience only.
}

const DEFAULT_CALIBRE_BASE_DIR = "books";
const DEFAULT_PUBLIC_BASE_URL = "https://data.otibeguni.com/books/";
const BOOKS_DIR = "src/content/books";
const TEMP_DIR = ".tmp/calibre-pdf-sync";
const METADATA_DB_LOCAL_PATH = ".tmp/calibre-pdf-sync/metadata.db";

function usage() {
  console.error(`Usage:
  node scripts/sync-book-pdf-from-calibre.mjs --slug <book-slug> [options]

Options:
  --remote-book-id <id>     Exact Calibre book id from metadata.db
  --dry-run                 Resolve and print the match without downloading or updating files
  --keep-temp               Keep the downloaded local temp file

Environment:
  CALIBRE_SFTP_HOST
  CALIBRE_SFTP_PORT
  CALIBRE_SFTP_USERNAME
  CALIBRE_SFTP_PASSWORD
  CALIBRE_SFTP_BASE_DIR     Optional, defaults to "books"
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
  R2_BUCKET                 Optional
  R2_ENDPOINT               Optional
  BOOKS_PUBLIC_BASE_URL     Optional, defaults to ${DEFAULT_PUBLIC_BASE_URL}`);
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
  const bengaliDigits = "০১২৩৪৫৬৭৮৯";
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

function loadBookFile(slug) {
  const filePath = join(BOOKS_DIR, `${slug}.md`);
  const source = readFileSync(filePath, "utf8");
  const frontmatterMatch = source.match(/^---\r?\n([\s\S]*?)\r?\n---/u);

  if (!frontmatterMatch) {
    throw new Error(`Missing frontmatter in ${filePath}`);
  }

  const frontmatter = frontmatterMatch[1];
  const book = {
    filePath,
    source,
    slug: parseFrontmatterValue(frontmatter, "slug"),
    name: parseFrontmatterValue(frontmatter, "name"),
    author: parseFrontmatterValue(frontmatter, "author"),
    libraryUrl: parseFrontmatterValue(frontmatter, "library_url"),
  };

  if (!book.slug || !book.name) {
    throw new Error(`Missing required book metadata in ${filePath}`);
  }

  return book;
}

function updateLibraryUrl(filePath, nextLibraryUrl) {
  const source = readFileSync(filePath, "utf8");

  if (!/^library_url:\s+/m.test(source)) {
    throw new Error(`No library_url field found in ${filePath}`);
  }

  const updated = source.replace(/^library_url:\s+.*$/m, `library_url: ${nextLibraryUrl}`);
  writeFileSync(filePath, updated, "utf8");
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

function getPdfMetadataMatch(metadataDbPath, book, args, calibreConfig) {
  const database = new DatabaseSync(metadataDbPath, {
    readOnly: true,
  });

  try {
    const query = `
      SELECT
        b.id AS id,
        b.title AS title,
        b.path AS path,
        b.author_sort AS authorSort,
        d.name AS fileBaseName,
        d.format AS format
      FROM books b
      JOIN data d ON d.book = b.id
      WHERE d.format = 'PDF'
    `;
    const rows = database.prepare(query).all();
    const requestedId = args["remote-book-id"] ? Number(args["remote-book-id"]) : undefined;
    const filteredRows = rows.filter((row) => {
      if (requestedId) {
        return row.id === requestedId;
      }

      return normalizeForMatch(row.title) === normalizeForMatch(book.name);
    });

    if (filteredRows.length === 0) {
      throw new Error(
        `No PDF metadata match found for "${book.name}". Use --remote-book-id if Calibre metadata differs from the site title.`,
      );
    }

    if (filteredRows.length > 1) {
      throw new Error(
        `Multiple PDF metadata matches found for "${book.name}". Use --remote-book-id to disambiguate.`,
      );
    }

    const row = filteredRows[0];
    const extension = String(row.format || "PDF").toLowerCase();

    return {
      source: "metadata-db",
      calibreBookId: row.id,
      authorDir: row.path.split("/")[0],
      titleDir: row.path.split("/").slice(1).join("/"),
      pdfName: `${row.fileBaseName}.${extension}`,
      remotePath: `${calibreConfig.baseDir}/${row.path}/${row.fileBaseName}.${extension}`,
    };
  } finally {
    database.close();
  }
}

async function findRemotePdf(sftp, book, args, calibreConfig) {
  const metadataDbPath = await downloadMetadataDb(sftp, calibreConfig);
  return {
    ...getPdfMetadataMatch(metadataDbPath, book, args, calibreConfig),
    alternatives: [],
  };
}

function buildPublicUrl(pdfName) {
  const baseUrl = process.env.BOOKS_PUBLIC_BASE_URL || DEFAULT_PUBLIC_BASE_URL;
  return `${baseUrl}${encodeURIComponent(pdfName)}`;
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

  if (!args.slug) {
    usage();
    process.exit(1);
  }

  const calibreConfig = getCalibreConfig();
  const book = loadBookFile(args.slug);
  const sftp = new SftpClient();
  let localTempPath;

  try {
    await sftp.connect({
      host: calibreConfig.host,
      port: calibreConfig.port,
      username: calibreConfig.username,
      password: calibreConfig.password,
    });

    const match = await findRemotePdf(sftp, book, args, calibreConfig);
    const targetFileName = `${book.slug}.pdf`;
    const key = `books/${targetFileName}`;
    const publicUrl = buildPublicUrl(targetFileName);

    if (args.dryRun) {
      console.log(
        JSON.stringify(
          {
            slug: book.slug,
            bookName: book.name,
            author: book.author,
            remotePath: match.remotePath,
            remotePdfName: match.pdfName,
            targetFileName,
            r2Key: key,
            publicUrl,
            alternatives: match.alternatives,
          },
          null,
          2,
        ),
      );
      return;
    }

    mkdirSync(join(TEMP_DIR, book.slug), { recursive: true });
    localTempPath = join(TEMP_DIR, book.slug, basename(match.pdfName));
    await sftp.fastGet(match.remotePath, localTempPath);

    const upload = await uploadFileToR2(localTempPath, key);
    updateLibraryUrl(book.filePath, publicUrl);

    console.log(
      JSON.stringify(
        {
          slug: book.slug,
          bookFile: book.filePath,
          previousLibraryUrl: book.libraryUrl,
          nextLibraryUrl: publicUrl,
          remotePath: match.remotePath,
          remotePdfName: match.pdfName,
          targetFileName,
          localTempPath,
          upload,
        },
        null,
        2,
      ),
    );
  } finally {
    await sftp.end().catch(() => {});

    if (localTempPath && !args.keepTemp) {
      rmSync(join(TEMP_DIR, book.slug), { recursive: true, force: true });
    }
  }
}

await main();
