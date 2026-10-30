import { z } from "zod";

// Accepts IANA zone names (incl. links like Africa/Lubumbashi); rejects "+2", "UTC+2", etc.
export function isIanaTimeZone(value: string) {
  if (!value.includes("/")) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const AirportSchema = z.object({
  code: z
    .string()
    .min(3, "Code must be 3+ characters")
    .max(10, "Code too long"),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, digits and dashes").optional(),
  name: z.string().min(2, "Name required"),
  city: z.string().min(2, "City required"),
  countryCode: z.string().min(2, "Country required"),
  timezone: z.string().refine(isIanaTimeZone, "Use an IANA time zone, e.g. Africa/Kinshasa or Africa/Lubumbashi"),
});

export type AirportInput = z.infer<typeof AirportSchema>;
export type AirportFields = "code" | "name" | "city" | "countryCode" | "timezone";
