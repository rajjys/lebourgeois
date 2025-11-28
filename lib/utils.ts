'use client'
import i18n from "@/i18n/config";
import { clsx, type ClassValue } from "clsx";
import { useTranslation } from "react-i18next";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "Schedule TBD";

  // Validate ISO 8601 with offset (YYYY-MM-DDTHH:mm:ss.sss±HH:mm)
  const isoRegex =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?([+-]\d{2}:\d{2}|Z)$/;

  if (!isoRegex.test(date)) {
    return date; // not a valid ISO string
  }

  const parsed = new Date(date);

  if (isNaN(parsed.getTime())) {
    return date; // still invalid after parsing
  }

  try {
    return new Intl.DateTimeFormat(i18n.language, {
      dateStyle: "medium",
    }).format(parsed);
  } catch {
    return date;
  }
}
