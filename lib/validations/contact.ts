import { z } from "zod";

export const CONTACT_TOPICS = ["QUESTION", "CORRECTION", "AIRLINE", "OTHER"] as const;
export type ContactTopicValue = (typeof CONTACT_TOPICS)[number];

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const phoneDigits = (v: string) => v.replace(/[\s().-]/g, "");
const isPhone = (v: string) => /^\+?\d{9,15}$/.test(phoneDigits(v));

// Messages are i18n keys: the public form translates them (contact.errors.*).
export const ContactSchema = z.object({
  name: z.string().trim().min(2, "contact.errors.name").max(100, "contact.errors.name"),
  reply: z
    .string()
    .trim()
    .refine((v) => isEmail(v) || isPhone(v), "contact.errors.reply"),
  topic: z.enum(CONTACT_TOPICS, { errorMap: () => ({ message: "contact.errors.topic" }) }),
  message: z.string().trim().min(10, "contact.errors.messageShort").max(3000, "contact.errors.messageLong"),
  pageUrl: z.string().trim().max(500).optional(),
  // Honeypot: hidden from people, filled in by bots.
  website: z.string().optional(),
});

export type ContactInput = z.infer<typeof ContactSchema>;

/** One "email or WhatsApp" field, stored in the column it belongs to. */
export function splitReply(reply: string): { email: string | null; phone: string | null } {
  return isEmail(reply) ? { email: reply.toLowerCase(), phone: null } : { email: null, phone: phoneDigits(reply) };
}

export const MessageStatusSchema = z.object({ status: z.enum(["NEW", "ANSWERED", "ARCHIVED"]) });
