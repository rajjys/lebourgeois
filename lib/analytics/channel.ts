/**
 * Where a visit came from (docs/ANALYTICS.md §3). Pure and shared: the browser uses it to keep
 * first and last touch, the server re-runs it on the raw fields it receives (it never trusts a
 * channel sent by the browser).
 *
 * Order: UTM tags first (someone tagged the link on purpose), then the referrer, then "direct".
 * "direct" means the browser sent no referrer and the link had no tags: typed address, bookmark,
 * or an app that hides where the link was (WhatsApp often does). It is never counted as Google.
 */

export const CHANNELS = ["search", "ai", "social", "whatsapp", "email", "paid", "campaign", "referral", "internal", "direct"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABEL: Record<Channel, string> = {
  search: "Moteurs de recherche",
  ai: "Assistants IA",
  social: "Réseaux sociaux",
  whatsapp: "WhatsApp",
  email: "E-mail",
  paid: "Publicité payante",
  campaign: "Lien tagué (UTM)",
  referral: "Autres sites",
  internal: "Autre adresse du site",
  direct: "Direct / inconnu",
};

export type Utm = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
};

/** The facts a channel is decided from. */
export type TouchInput = Utm & { referrerHost: string | null };

/** One identified arrival: what the browser keeps as first and last touch. */
export type Touch = TouchInput & { channel: Channel; landingPath: string; at: string };

const host = (patterns: RegExp[]) => (h: string) => patterns.some((p) => p.test(h));

// Checked before search: gemini.google.com is an AI assistant, mail.google.com is e-mail.
const isAi = host([
  /(^|\.)chatgpt\.com$/, /^chat\.openai\.com$/, /(^|\.)perplexity\.ai$/, /^gemini\.google\.com$/, /^bard\.google\.com$/,
  /^copilot\.microsoft\.com$/, /(^|\.)claude\.ai$/, /^chat\.deepseek\.com$/, /(^|\.)meta\.ai$/, /(^|\.)you\.com$/, /(^|\.)mistral\.ai$/,
]);
const isEmail = host([/^mail\.google\.com$/, /^outlook\.(live|office|office365)\.com$/, /^mail\.yahoo\.com$/, /^com\.google\.android\.gm$/]);
const isWhatsapp = host([/(^|\.)whatsapp\.com$/, /^wa\.me$/, /^com\.whatsapp(\.w4b)?$/]);
const isSearch = host([
  /(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/, /(^|\.)bing\.com$/, /(^|\.)duckduckgo\.com$/, /(^|\.)yahoo\.com$/, /(^|\.)ecosia\.org$/,
  /(^|\.)yandex\.[a-z]+$/, /(^|\.)baidu\.com$/, /(^|\.)qwant\.com$/, /^search\.brave\.com$/, /(^|\.)startpage\.com$/,
  /^com\.google\.android\.googlequicksearchbox$/,
]);
const isSocial = host([
  /(^|\.)facebook\.com$/, /(^|\.)fb\.com$/, /(^|\.)instagram\.com$/, /^t\.co$/, /(^|\.)twitter\.com$/, /(^|\.)x\.com$/,
  /(^|\.)linkedin\.com$/, /^lnkd\.in$/, /(^|\.)tiktok\.com$/, /(^|\.)youtube\.com$/, /^youtu\.be$/, /(^|\.)reddit\.com$/,
  /(^|\.)pinterest\.[a-z.]+$/, /(^|\.)snapchat\.com$/, /(^|\.)threads\.(net|com)$/, /^t\.me$/, /^web\.telegram\.org$/,
  /^com\.facebook\.(katana|orca|lite)$/, /^com\.instagram\.android$/, /^org\.telegram\.messenger$/,
]);

/** The site's own addresses: moving between them is not a new source. */
export const isOwnHost = (h: string, currentHost: string) =>
  h === currentHost ||
  h === "localhost" ||
  /(^|\.)lebourgeois\.cd$/.test(h) ||
  /^(lebourgeois|clerikaa)[a-z0-9-]*\.vercel\.app$/.test(h);

const SOCIAL_SOURCES = /^(facebook|fb|instagram|ig|tiktok|twitter|x|linkedin|youtube|telegram|snapchat|threads)$/;

export function classify(input: TouchInput, currentHost: string): Channel {
  const source = input.utmSource?.toLowerCase() ?? "";
  const medium = input.utmMedium?.toLowerCase() ?? "";
  if (source || medium || input.utmCampaign) {
    if (/whatsapp/.test(source) || /whatsapp/.test(medium) || source === "wa") return "whatsapp";
    if (/^(cpc|ppc|paid|paidsocial|paid_social|paid-social|display|ads?|banner)$/.test(medium)) return "paid";
    if (/^(e-?mail|newsletter)$/.test(medium)) return "email";
    if (/^(social|social-network|social_network|social-media|social_media|sm)$/.test(medium) || SOCIAL_SOURCES.test(source)) return "social";
    if (medium === "organic") return "search";
    return "campaign";
  }
  const h = input.referrerHost?.toLowerCase();
  if (!h) return "direct";
  if (isOwnHost(h, currentHost)) return "internal";
  if (isAi(h)) return "ai";
  if (isEmail(h)) return "email";
  if (isWhatsapp(h)) return "whatsapp";
  if (isSearch(h)) return "search";
  if (isSocial(h)) return "social";
  return "referral";
}

/** A touch that says where the visitor came from; "direct" and "internal" say nothing new. */
export const isKnownSource = (channel: Channel) => channel !== "direct" && channel !== "internal";

const clip = (v: string | null | undefined, n = 100) => {
  const t = v?.trim();
  return t ? t.slice(0, n) : null;
};

/** UTM tags of a URL's query, trimmed; null when absent. */
export function utmOf(params: URLSearchParams): Utm {
  return {
    utmSource: clip(params.get("utm_source")),
    utmMedium: clip(params.get("utm_medium")),
    utmCampaign: clip(params.get("utm_campaign")),
    utmTerm: clip(params.get("utm_term")),
    utmContent: clip(params.get("utm_content")),
  };
}

/**
 * The referrer's host only ("https://www.google.com/search?q=…" → "www.google.com"): the path and
 * query can carry search words or personal data, so they are dropped. "android-app://com.whatsapp/"
 * gives "com.whatsapp".
 */
export function referrerHostOf(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}
