import { z } from "zod";
import { optionalDay, optionalText, optionalUrl, toDay, toNullable } from "@/lib/validations/fields";

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

const coordinate = (limit: number) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (Number.isFinite(Number(v)) && Math.abs(Number(v)) <= limit), `Nombre entre -${limit} et ${limit}`)
    .optional();

// The back office sends every field as text; airportData() turns it into database values.
export const AirportSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Code IATA de 3 lettres"),
  slug: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v), "Minuscules, chiffres et tirets")
    .optional(),
  name: z.string().trim().min(2, "Nom requis"),
  city: z.string().trim().min(2, "Ville requise"),
  province: optionalText(80),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Code pays à 2 lettres (CD)"),
  timezone: z.string().refine(isIanaTimeZone, "Fuseau IANA, par exemple Africa/Kinshasa ou Africa/Lubumbashi"),
  latitude: coordinate(90),
  longitude: coordinate(180),
  status: z.enum(["OPEN", "RESTRICTED", "CLOSED"]).optional(),
  statusNote: optionalText(500),
  statusSince: optionalDay,
  statusSourceUrl: optionalUrl,
});

export type AirportInput = z.infer<typeof AirportSchema>;

const toNumber = (v: string | undefined) => (v === undefined ? undefined : v === "" ? null : Number(v));

export function airportData(input: AirportInput) {
  return {
    ...input,
    slug: input.slug || undefined, // empty: keep the current one, or derive it on create
    province: toNullable(input.province),
    latitude: toNumber(input.latitude),
    longitude: toNumber(input.longitude),
    statusNote: toNullable(input.statusNote),
    statusSince: toDay(input.statusSince),
    statusSourceUrl: toNullable(input.statusSourceUrl),
  };
}
