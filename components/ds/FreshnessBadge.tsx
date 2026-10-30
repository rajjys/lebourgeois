import { CircleCheck, CircleAlert, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { daysBetween, formatDaysAgo } from "@/lib/format";

/**
 * How recently a human or a trusted source confirmed the data.
 * Default thresholds (7 / 14 days) are provisional until R-3 in docs/PLAN.md sets them.
 */
export function FreshnessBadge({
  verifiedAt,
  now = new Date(),
  freshDays = 7,
  staleDays = 14,
}: {
  verifiedAt: Date;
  now?: Date;
  freshDays?: number;
  staleDays?: number;
}) {
  const age = daysBetween(verifiedAt, now);
  const when = formatDaysAgo(verifiedAt, now);
  if (age <= freshDays)
    return (
      <Badge variant="success">
        <CircleCheck aria-hidden="true" /> Vérifié {when}
      </Badge>
    );
  if (age <= staleDays)
    return (
      <Badge variant="warning">
        <Clock aria-hidden="true" /> À revérifier · vu {when}
      </Badge>
    );
  return (
    <Badge variant="danger">
      <CircleAlert aria-hidden="true" /> Ancien · vu {when}
    </Badge>
  );
}
