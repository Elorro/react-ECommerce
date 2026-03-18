import { z } from "zod";

const cartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
});

export const cartSyncSchema = z.object({
  items: z.array(cartItemSchema).max(50),
});

export const cartMergeSchema = cartSyncSchema;

export type CartSyncPayload = z.infer<typeof cartSyncSchema>;
