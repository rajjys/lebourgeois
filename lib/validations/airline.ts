import { z } from "zod";

export const AirlineSchema = z.object({
  name: z.string().min(2, "Name is required"),
  code: z.string().min(2, "Airline code required").max(10),
  country: z.string().min(2, "Country is required"),
  logo: z.string()
});

export type AirlineInput = z.infer<typeof AirlineSchema>;
export type AirlineFields = "name" | "code" | "country"