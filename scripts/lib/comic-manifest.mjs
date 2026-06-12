import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const COMIC_MANIFESTS_DIR = join(REPO_ROOT, "src", "data", "comics");
export const COMIC_IMAGES_DIR = join(REPO_ROOT, "public", "images", "comics");
const COMIC_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value) {
  const text = normalizeText(value);
  return text.length > 0 ? text : undefined;
}

function normalizePage(page, index) {
  invariant(isPlainObject(page), `Page ${index + 1} must be an object.`);

  const id = normalizeText(page.id);
  const src = normalizeText(page.src);
  const width = Number(page.width);
  const height = Number(page.height);

  invariant(id.length > 0, `Page ${index + 1} is missing an id.`);
  invariant(src.startsWith("/images/comics/"), `Page ${id} must use a /images/comics/... src.`);
  invariant(Number.isFinite(width) && width > 0, `Page ${id} has an invalid width.`);
  invariant(Number.isFinite(height) && height > 0, `Page ${id} has an invalid height.`);

  return {
    id,
    src,
    width: Math.round(width),
    height: Math.round(height),
  };
}

function normalizePoint(point, panelId, pointIndex) {
  invariant(isPlainObject(point), `Panel ${panelId} point ${pointIndex + 1} must be an object.`);

  const x = Number(point.x);
  const y = Number(point.y);

  invariant(Number.isFinite(x) && x >= 0 && x <= 1, `Panel ${panelId} point ${pointIndex + 1} has an invalid x.`);
  invariant(Number.isFinite(y) && y >= 0 && y <= 1, `Panel ${panelId} point ${pointIndex + 1} has an invalid y.`);

  return {
    x: roundCoordinate(x),
    y: roundCoordinate(y),
  };
}

function getPanelPoints(panel, panelId) {
  if (Array.isArray(panel.points) && panel.points.length > 0) {
    return panel.points.map((point, pointIndex) => normalizePoint(point, panelId, pointIndex));
  }

  throw new Error(`Panel ${panelId} must define points.`);
}

function getPolygonBounds(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    left: Math.min(...xs),
    top: Math.min(...ys),
    right: Math.max(...xs),
    bottom: Math.max(...ys),
  };
}

function normalizePanel(panel, index, pageIdSet) {
  invariant(isPlainObject(panel), `Panel ${index + 1} must be an object.`);

  const id = normalizeText(panel.id);
  const pageId = normalizeText(panel.pageId);
  const order = Number(panel.order);

  invariant(id.length > 0, `Panel ${index + 1} is missing an id.`);
  invariant(pageIdSet.has(pageId), `Panel ${id} references unknown page ${pageId}.`);
  invariant(Number.isInteger(order) && order > 0, `Panel ${id} has an invalid order.`);

  const points = getPanelPoints(panel, id);

  invariant(points.length >= 3, `Panel ${id} must have at least three points.`);

  const bounds = getPolygonBounds(points);
  invariant(bounds.right - bounds.left > 0, `Panel ${id} must span a non-zero width.`);
  invariant(bounds.bottom - bounds.top > 0, `Panel ${id} must span a non-zero height.`);

  return {
    id,
    pageId,
    order,
    points,
    label: normalizeOptionalText(panel.label),
    notes: normalizeOptionalText(panel.notes),
  };
}

function roundCoordinate(value) {
  return Number(value.toFixed(6));
}

function dedupeIds(items, kind) {
  const seen = new Set();

  for (const item of items) {
    invariant(!seen.has(item.id), `Duplicate ${kind} id: ${item.id}.`);
    seen.add(item.id);
  }
}

function resequencePanels(panels) {
  return [...panels]
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
    .map((panel, index) => ({
      ...panel,
      order: index + 1,
    }));
}

function stripUndefinedFields(panel) {
  return Object.fromEntries(Object.entries(panel).filter(([, value]) => value !== undefined));
}

export function ensureComicDirectories() {
  mkdirSync(COMIC_MANIFESTS_DIR, { recursive: true });
  mkdirSync(COMIC_IMAGES_DIR, { recursive: true });
}

export function getComicManifestPath(slug) {
  return join(COMIC_MANIFESTS_DIR, `${slug}.json`);
}

export function getComicImagesPath(slug) {
  return join(COMIC_IMAGES_DIR, slug);
}

export function validateComicManifest(input) {
  invariant(isPlainObject(input), "Comic manifest must be an object.");

  const slug = normalizeText(input.slug);
  const title = normalizeText(input.title);
  invariant(COMIC_SLUG_PATTERN.test(slug), "Comic slug must be lowercase kebab-case.");
  invariant(title.length > 0, "Comic title is required.");

  const pagesInput = Array.isArray(input.pages) ? input.pages : [];
  const panelsInput = Array.isArray(input.panels) ? input.panels : [];
  const pages = pagesInput.map((page, index) => normalizePage(page, index));

  dedupeIds(pages, "page");
  const pageIdSet = new Set(pages.map((page) => page.id));
  const panels = panelsInput.map((panel, index) => normalizePanel(panel, index, pageIdSet));

  dedupeIds(panels, "panel");

  return {
    slug,
    title,
    pages,
    panels: resequencePanels(panels).map(stripUndefinedFields),
  };
}

export function createComicManifest({ slug, title, pages, panels = [] }) {
  return validateComicManifest({
    slug,
    title,
    pages,
    panels,
  });
}

export function createComicManifestFromPages({ slug, title, pages, existingManifest }) {
  const pageIds = new Set(pages.map((page) => page.id));
  const preservedPanels = Array.isArray(existingManifest?.panels)
    ? existingManifest.panels.filter((panel) => pageIds.has(panel.pageId))
    : [];

  return createComicManifest({
    slug,
    title: title || existingManifest?.title || slug,
    pages,
    panels: preservedPanels,
  });
}

export function readComicManifest(slug) {
  const manifest = JSON.parse(readFileSync(getComicManifestPath(slug), "utf8"));
  return validateComicManifest(manifest);
}

export function writeComicManifest(manifest) {
  ensureComicDirectories();
  const normalized = validateComicManifest(manifest);
  writeFileSync(getComicManifestPath(normalized.slug), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

export function getNormalizedPanelBounds(panel) {
  return getPolygonBounds(panel.points);
}

export function listComicManifestSlugs() {
  ensureComicDirectories();

  return readdirSync(COMIC_MANIFESTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".json")
    .map((entry) => basename(entry.name, ".json"))
    .sort((left, right) => left.localeCompare(right));
}

export function listComicManifestSummaries() {
  return listComicManifestSlugs().map((slug) => {
    const manifest = readComicManifest(slug);

    return {
      slug: manifest.slug,
      title: manifest.title,
      pageCount: manifest.pages.length,
      panelCount: manifest.panels.length,
    };
  });
}
