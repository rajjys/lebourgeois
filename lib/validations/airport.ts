import { z } from "zod";

export const AirportSchema = z.object({
  code: z
    .string()
    .min(3, "Code must be 3+ characters")
    .max(10, "Code too long"),
  name: z.string().min(2, "Name required"),
  city: z.string().min(2, "City required"),
  country: z.string().min(2, "Country required"),
  timezone: z.string().min(2, "Timezone required"),
});

export type AirportInput = z.infer<typeof AirportSchema>;
export type AirportFields = "code" | "name" | "city" | "country" | "timezone";