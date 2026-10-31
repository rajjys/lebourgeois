import { z } from "zod";
import { optionalText, toNullable } from "./fields";

const code = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Choisissez un aéroport");
const tier = z.coerce.number().int().min(1, "Priorité 1, 2 ou 3").max(3, "Priorité 1, 2 ou 3");

/** New route from two airports; the return route is usually created with it (ROUTE-MODEL §5.2). */
export const NewRouteSchema = z
  .object({ originCode: code, destinationCode: code, tier, withReturn: z.boolean().default(true) })
  .refine((v) => v.originCode !== v.destinationCode, { path: ["destinationCode"], message: "Choisissez deux aéroports différents" });

export type NewRouteInput = z.input<typeof NewRouteSchema>;

export const RouteSettingsSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  tier,
  note: optionalText(1000),
});

export type RouteSettingsInput = z.input<typeof RouteSettingsSchema>;

export const routeSettingsData = (input: z.output<typeof RouteSettingsSchema>) => ({
  status: input.status,
  tier: input.tier,
  note: toNullable(input.note),
});
