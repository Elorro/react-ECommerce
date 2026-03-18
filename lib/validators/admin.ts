import { z } from "zod";
import { sanitizePlainText } from "@/lib/sanitize";

export const updateProductSchema = z.object({
  stock: z.number().int().min(0).max(9999),
  featured: z.boolean(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
});

const sanitizedString = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .transform((value) => sanitizePlainText(value));

export const createProductSchema = z.object({
  name: sanitizedString(3, 120),
  slug: sanitizedString(3, 120),
  description: sanitizedString(10, 500),
  imageUrl: z.string().trim().url(),
  price: z.number().min(1).max(99999),
  stock: z.number().int().min(0).max(9999),
  featured: z.boolean(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
  categoryId: z.string().min(1),
});

export const createCategorySchema = z.object({
  name: sanitizedString(3, 80),
  slug: sanitizedString(3, 80),
  imageUrl: z.string().trim().url(),
});

export const updateCategorySchema = createCategorySchema;

export const updateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "PAID", "PROCESSING", "FULFILLED", "CANCELED"]),
});

export const bulkProductActionSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50),
  action: z.enum(["FEATURE", "UNFEATURE", "ARCHIVE", "ACTIVATE"]),
});

export const bulkOrderStatusSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50),
  status: z.enum(["PAID", "PROCESSING", "FULFILLED", "CANCELED"]),
});

export const createOrderNoteSchema = z.object({
  content: sanitizedString(3, 1000),
});

export const refundOrderSchema = z.object({
  reason: sanitizedString(5, 500),
});

export const manageReturnSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("REQUEST"),
    reason: sanitizedString(5, 500),
  }),
  z.object({
    action: z.literal("RECEIVE"),
  }),
  z.object({
    action: z.literal("REFUND"),
    reason: sanitizedString(5, 500),
  }),
]);
