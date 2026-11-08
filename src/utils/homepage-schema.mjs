import { z } from "zod";

const slugSource = (type) =>
  z.object({
    type: z.literal(type),
    slug: z.string().trim().min(1),
  });

const storySourceSchema = z.object({
  type: z.literal("story"),
  slug: z.string().trim().min(1),
  language: z.enum(["en", "bn"]),
});

const illustrationSourceSchema = z.object({
  type: z.literal("illustration"),
  key: z.string().trim().min(1),
  filename: z.string().trim().min(1),
  thumbnailUrl: z.string().url(),
  fullUrl: z.string().url(),
});

export const homepageSourceSchema = z.discriminatedUnion("type", [
  storySourceSchema,
  slugSource("book"),
  slugSource("sourceText"),
  slugSource("topic"),
  slugSource("mazarTradition"),
  slugSource("resource"),
  slugSource("storyCollection"),
  slugSource("publication"),
  slugSource("blogPost"),
  illustrationSourceSchema,
]);

export const homepageTileSchema = z.object({
  id: z.string().trim().min(1),
  source: homepageSourceSchema,
  titleOverride: z.string().trim().min(1).optional(),
  descriptionOverride: z.string().trim().min(1).optional(),
  imageOverride: z
    .string()
    .regex(/^\/images\/homepage\/[A-Za-z0-9._-]+$/)
    .optional(),
});

export function getHomepageSourceKey(source) {
  if (source.type === "story") {
    return `story:${source.language}:${source.slug}`;
  }

  if (source.type === "illustration") {
    return `illustration:${source.key}`;
  }

  return `${source.type}:${source.slug}`;
}

export const homepageConfigSchema = z
  .object({
    version: z.literal(1),
    tiles: z.array(homepageTileSchema),
  })
  .superRefine((config, context) => {
    const ids = new Set();
    const sourceKeys = new Set();

    config.tiles.forEach((tile, index) => {
      if (ids.has(tile.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate tile id "${tile.id}"`,
          path: ["tiles", index, "id"],
        });
      }
      ids.add(tile.id);

      const sourceKey = getHomepageSourceKey(tile.source);
      if (sourceKeys.has(sourceKey)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate homepage source "${sourceKey}"`,
          path: ["tiles", index, "source"],
        });
      }
      sourceKeys.add(sourceKey);
    });
  });

export function parseHomepageConfig(value) {
  return homepageConfigSchema.parse(value);
}
