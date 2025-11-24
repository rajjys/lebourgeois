import { z } from "zod";

export const WeekdayEnum = z.enum([
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
]);

export const FlightPatternSchema = z.object({
  airlineId: z.string().min(1).uuid(),
  originId: z.string().min(1).uuid(),
  destinationId: z.string().min(1).uuid(),
  flightNumber: z.string().min(1),
  departureTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  arrivalTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  daysOfWeek: z.array(WeekdayEnum).optional(),
  startDate: z.preprocess((v) => (typeof v === "string" ? new Date(v) : v), z.date()),
  endDate: z.preprocess((v) => (typeof v === "string" ? new Date(v) : v), z.date()),

  price: z.preprocess((v) => (v !== "" ? Number(v) : undefined), z.number().optional()),
  currency: z.string().optional(),
  aircraft: z.string().optional(),
  capacity: z.preprocess((v) => (v !== "" ? Number(v) : undefined), z.number().optional()),
  distanceInKm: z.preprocess((v) => (v !== "" ? Number(v) : undefined), z.number().optional()),
  durationInMin: z.preprocess((v) => (v !== "" ? Number(v) : undefined), z.number().optional()),
  stops: z.preprocess((v) => (v !== "" ? Number(v) : undefined), z.number().optional()),
  
  active: z.boolean().optional(),
});
export const FlightPatternResponseSchema = FlightPatternSchema.extend({
  id: z.string(),
  aircraft: z.string().optional(),
  stops: z.number().optional(),
  airline: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    country: z.string(),
    color: z.string().optional(),
    logo: z.string().optional()
  }),
  origin: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    city: z.string(),
    timezone: z.string(),
    country: z.string()
  }),
  destination: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    city: z.string(),
    timezone: z.string(),
    country: z.string()
  })
})

export type FlightPatternInput = z.infer<typeof FlightPatternSchema>;
export type FlightPatternResponse = z.infer<typeof FlightPatternResponseSchema>