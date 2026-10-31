import { z } from "zod";
import { optionalDay, optionalText, optionalUrl, toDay, toNullable } from "@/lib/validations/fields";

// The back office sends every field as text; airlineData() turns it into database values.
export const AirlineSchema = z.object({
  name: z.string().trim().min(2, "Nom requis"),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,3}$/, "Code IATA de 2 caractères (BU, 4H), ou 3 si la compagnie n'en a pas"),
  icao: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^[A-Z]{3}$/.test(v), "Code OACI de 3 lettres")
    .optional(),
  slug: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v), "Minuscules, chiffres et tirets")
    .optional(),
  countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Code pays à 2 lettres (CD)"),
  logo: optionalUrl,
  website: optionalUrl,
  bookingUrl: optionalUrl,
  status: z.enum(["OPERATING", "SUSPENDED", "CEASED"]).optional(),
  statusNote: optionalText(500),
  statusSince: optionalDay,
  statusSourceUrl: optionalUrl,
  isPublished: z.boolean().optional(),
});

export type AirlineInput = z.infer<typeof AirlineSchema>;

export function airlineData(input: AirlineInput) {
  return {
    ...input,
    slug: input.slug || undefined, // empty: keep the current one, or derive it on create
    icao: toNullable(input.icao),
    logo: toNullable(input.logo),
    website: toNullable(input.website),
    bookingUrl: toNullable(input.bookingUrl),
    statusNote: toNullable(input.statusNote),
    statusSince: toDay(input.statusSince),
    statusSourceUrl: toNullable(input.statusSourceUrl),
  };
}
