import { z } from "zod";
import { sanitizePlainText } from "@/lib/sanitize";

const sanitizedString = (label: string, min: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} is required.`)
    .max(240)
    .transform((value) => sanitizePlainText(value));

export const clientCheckoutSchema = z.object({
  customerName: sanitizedString("Name", 3).refine((value) => value.length <= 80, {
    message: "Name is too long.",
  }),
  shippingAddress: sanitizedString("Address", 10),
});

export type ClientCheckoutValues = z.infer<typeof clientCheckoutSchema>;

export const orderCheckoutSchema = clientCheckoutSchema.extend({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1, "At least one item is required."),
});

export type OrderCheckoutPayload = z.infer<typeof orderCheckoutSchema>;
