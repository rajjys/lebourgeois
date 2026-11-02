import { notFound, permanentRedirect } from "next/navigation";
import { pathForOldFlight } from "@/lib/routePages";

type Props = { params: Promise<{ id: string }> };

/** Retired in RW-5: one departure now opens on its airline page, /vols/{route}/{airline}?date=&heure=. */
export default async function OldFlightRedirect({ params }: Props) {
  const path = await pathForOldFlight((await params).id);
  if (!path) notFound();
  permanentRedirect(path);
}
