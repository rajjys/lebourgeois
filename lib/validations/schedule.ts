import { z } from "zod";
import { TIME_RE, normalizeFlightNumber } from "../flights";

// Route workspace forms (docs/ROUTE-MODEL.md §6.2). Messages in French: the back office shows them as they are.

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide");
const weekday = z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]);
const time = z.string().regex(TIME_RE, "Heure au format 07:45");
const MAX_DAYS = 182; // half a year: past that, a typo in a year is more likely than a real schedule

/** Empty means "no number published"; anything else must read like a flight number. */
const flightNumber = z
  .string()
  .nullish()
  .transform((v, ctx) => {
    const n = normalizeFlightNumber(v);
    if (n === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Numéro de vol comme BU1611 ou ET60" });
      return z.NEVER;
    }
    return n;
  });

export const flightFieldsSchema = z.object({
  flightNumber,
  departureTime: time,
  arrivalTime: time,
  arrivalDayOffset: z.coerce.number().int().min(0).max(1).default(0),
  via: z.array(z.string().regex(/^[A-Z]{3}$/, "Escale inconnue")).max(3, "Trois escales au plus").default([]),
  aircraft: z
    .string()
    .trim()
    .max(40, "40 caractères maximum")
    .nullish()
    .transform((v) => v || null),
});

const mode = z.enum(["preview", "apply"]).default("preview");
const sourceUrl = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\/[^\s/]+\.[^\s]+$/.test(v), "Lien complet, commençant par https://")
  .nullish()
  .transform((v) => v || null);

const span = (v: { from: string; to: string }) => v.from <= v.to;
const notTooLong = (v: { from: string; to: string }) =>
  (new Date(v.to).getTime() - new Date(v.from).getTime()) / 86_400_000 <= MAX_DAYS;

export const ScheduleSchema = flightFieldsSchema
  .extend({ days: z.array(weekday).min(1, "Choisissez au moins un jour"), from: day, to: day, sourceUrl, mode })
  .refine(span, { path: ["to"], message: "La fin doit suivre le début" })
  .refine(notTooLong, { path: ["to"], message: "Six mois au plus à la fois" });

export const CopyWeekSchema = z.object({
  weekStart: day,
  weeks: z.coerce.number().int().min(1, "Une semaine au moins").max(12, "Douze semaines au plus"),
  mode,
});

export const CancelSchema = z
  .object({
    from: day,
    to: day,
    days: z.array(weekday).default([]),
    flightNumber, // a typo must not widen the filter to every flight
    mode,
  })
  .refine(span, { path: ["to"], message: "La fin doit suivre le début" })
  .refine(notTooLong, { path: ["to"], message: "Six mois au plus à la fois" });

export const DaySchema = z.object({
  date: day,
  flights: z.array(flightFieldsSchema.extend({ id: z.string().optional(), status: z.enum(["SCHEDULED", "CANCELLED"]) })).max(20),
});

export const VerifySchema = z.object({ sourceUrl });

export const RouteAirlineSettingsSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "ENDED"]),
  isPublished: z.boolean(),
});

export const AddAirlineSchema = z.object({ airlineId: z.string().min(1, "Choisissez une compagnie") });

export type ScheduleForm = z.input<typeof ScheduleSchema>;

const optionalLine = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum`)
    .nullish()
    .transform((v) => v || null);

/** "+ Prix observé": amount, fare name and source up front; the rest is optional. */
export const FareSchema = z.object({
  amount: z.coerce.number({ invalid_type_error: "Montant en dollars, par exemple 244" }).positive("Montant en dollars, par exemple 244").max(5000, "Montant trop élevé pour un vol intérieur"),
  fareName: optionalLine(60),
  sourceUrl,
  observedAt: day.nullish().transform((v) => v ?? null),
  travelDate: day.nullish().transform((v) => v ?? null),
  flightNumber,
  roundTrip: z.boolean().default(false),
  note: optionalLine(300),
});

export const FareReviewSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Choisissez au moins un prix").max(100),
  decision: z.enum(["APPROVED", "REJECTED"]),
});

export const FareDeleteSchema = z.object({ id: z.string().min(1) });

export const NoteSchema = z.object({ note: optionalLine(1000) });
