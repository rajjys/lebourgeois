import type { Metadata } from "next";

// These pages are keyed by a database id and will be replaced by /vols/{route}/{airline} (RW-5),
// with permanent redirects (RW-7). Until then they stay out of search indexes.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function FlightDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
