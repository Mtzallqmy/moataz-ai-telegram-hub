import { z } from "zod";

export const contentKindSchema = z.enum(["article", "post", "book_summary"]);
export const contentStatusSchema = z.enum(["draft", "review", "published", "archived"]);

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || undefined);

export const contentCreateSchema = z.object({
  kind: contentKindSchema,
  slug: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{1,140}$/),
  titleAr: z.string().trim().min(3).max(220),
  titleEn: optionalText(220),
  excerptAr: optionalText(600),
  excerptEn: optionalText(600),
  bodyAr: z.string().trim().min(20),
  bodyEn: optionalText(100000),
  categoryId: z.string().uuid().nullable().optional(),
  status: contentStatusSchema.default("draft"),
  featured: z.boolean().default(false),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  seoTitleAr: optionalText(70),
  seoDescriptionAr: optionalText(180),
});

export const contentUpdateSchema = contentCreateSchema.partial().extend({
  changeSummary: optionalText(300),
});

export type ContentCreateInput = z.infer<typeof contentCreateSchema>;
export type ContentUpdateInput = z.infer<typeof contentUpdateSchema>;
