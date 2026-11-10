'use client';

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { flush, takeSearch, track } from "@/lib/analytics/browser";

// /vols/kinshasa-lubumbashi and /vols/kinshasa-lubumbashi/caa
const ROUTE = /^\/vols\/([a-z0-9-]+)\/?$/;
const AIRLINE = /^\/vols\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Last page counted, so React running an effect twice, or a re-render, does not count it again.
let lastCounted = "";

function countPage(pathname: string, params: URLSearchParams) {
  const key = `${pathname}?${params.toString()}`;
  if (key === lastCounted) return;
  lastCounted = key;

  const date = params.get("date");
  const travelDate = date && DAY.test(date) ? date : null;
  const route = pathname.match(ROUTE);
  const airline = pathname.match(AIRLINE);
  const routeSlug = route?.[1] ?? airline?.[1] ?? null;

  track("page_view", { routeSlug, airline: airline?.[2] ?? null });
  if (!routeSlug) return;
  track("route_view", { routeSlug, airline: airline?.[2] ?? null, travelDate });
  if (airline) track("flight_option_view", { routeSlug, airline: airline[2], travelDate, props: { time: params.get("heure") } });
  else if (takeSearch()) track("flight_search_results_view", { routeSlug, travelDate });
}

/** Links that leave for WhatsApp, e-mail or the phone, wherever they are on the page. */
function onClick(e: MouseEvent) {
  const link = (e.target as Element | null)?.closest?.("a[href]");
  if (!link) return;
  const href = link.getAttribute("href") ?? "";
  const placement = link.closest("header, footer, main")?.tagName.toLowerCase() ?? null;
  if (/^(https?:\/\/)?(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\//i.test(href) || href.startsWith("whatsapp:")) {
    track("whatsapp_click", { props: { placement } });
  } else if (href.startsWith("mailto:")) {
    track("contact_click", { props: { kind: "email", placement } });
  } else if (href.startsWith("tel:")) {
    track("contact_click", { props: { kind: "phone", placement } });
  } else return;
  // The visitor may be leaving the page for the app.
  flush(true);
}

/**
 * Counts public pages and outgoing contact links (docs/ANALYTICS.md). Mounted once, in the public
 * layout: the back office and the login page are never counted.
 */
export function Tracker() {
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    countPage(pathname, new URLSearchParams(params.toString()));
  }, [pathname, params]);

  useEffect(() => {
    const hidden = () => document.visibilityState === "hidden" && flush(true);
    const leave = () => flush(true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", leave);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", leave);
    };
  }, []);

  return null;
}
