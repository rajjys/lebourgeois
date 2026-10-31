import { z } from "zod";

// Optional text fields from back-office forms: "" means "cleared", undefined means "not sent".

export const optionalText = (max: number) => z.string().trim().max(max, `${max} caractères maximum`).optional();

export const optionalUrl = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https?:\/\/[^\s/]+\.[^\s]+$/.test(v), "Lien complet, commençant par https://")
  .optional();

export const optionalDay = z
  .string()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Date invalide")
  .optional();

export const toNullable = (v: string | undefined) => (v === undefined ? undefined : v === "" ? null : v);

/** "2026-06-06" → midnight UTC, the way the seed stores status dates. */
export const toDay = (v: string | undefined) => (v === undefined ? undefined : v === "" ? null : new Date(`${v}T00:00:00Z`));

/** Database date (ISO string over JSON) → value for <input type="date">. */
export const dayValue = (v: string | Date | null | undefined) =>
  v ? (typeof v === "string" ? v : v.toISOString()).slice(0, 10) : "";
