import { z } from "zod";

export const RequestSchema = z.object({
  clientName: z.string().min(2, "Client name is required"),
  clientEmail: z.string().email("Invalid email").optional().nullable(),
  clientPhone: z.string().optional().nullable(),
  prefersWhatsapp: z.boolean().default(true),
  flightNumber: z.string().min(1, "Flight number is required"),
  originCity: z.string().min(1, "Origin city is required"),
  destinationCity: z.string().min(1, "Destination city is required"),
  travelDate: z.date(),
  travelClass: z.enum(["economy", "business", "first"]),
  travelers: z.number().min(1).max(9),
  source: z.string().default("web"),
});

export type RequestInput = z.infer<typeof RequestSchema>;
export type RequestFields = "clientName" | "clientEmail" | "clientPhone" | "prefersWhatsapp" | "flightNumber" | "originCity" | "destinationCity" | "travelDate" | "travelClass" | "travelers" | "source";