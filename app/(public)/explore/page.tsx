import { permanentRedirect } from "next/navigation";
import { routeSlugForCodes } from "@/lib/routePages";
import { dateParam } from "@/lib/routeSlug";

type Props = { searchParams: Promise<{ [key: string]: string | string[] | undefined }> };

/** Retired in RW-5: /explore?from=FIH&to=FBM[&date=] → /vols/kinshasa-lubumbashi[?date=], anything else → /vols. */
export default async function ExploreRedirect({ searchParams }: Props) {
  const { from, to, date } = await searchParams;
  const slug = typeof from === "string" && typeof to === "string" ? await routeSlugForCodes(from.toUpperCase(), to.toUpperCase()) : null;
  const day = dateParam(date);
  permanentRedirect(slug ? `/vols/${slug}${day ? `?date=${day}` : ""}` : "/vols");
}
