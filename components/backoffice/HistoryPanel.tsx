import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { HistoryItem } from "@/lib/routeBoard";

const when = new Intl.DateTimeFormat("fr-CD", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Kinshasa" });

/**
 * Who changed what on this route, newest first (plan item S-5). A workspace action opens to show
 * every record it touched; an undone action is marked as such.
 */
export function HistoryPanel({ items }: { items: HistoryItem[] }) {
  return (
    <section aria-labelledby="history-title" className="rounded-lg border bg-card p-5">
      <h2 id="history-title" className="flex items-center gap-2 text-base font-semibold">
        <History className="size-4 text-muted-foreground" aria-hidden="true" />
        Historique
      </h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Aucun changement enregistré sur cette route.</p>
      ) : (
        <ol className="mt-3 divide-y">
          {items.map((item) => (
            <li key={item.id} className="py-2.5 text-sm">
              <details className="group">
                <summary className={item.lines.length > 1 ? "cursor-pointer list-none" : "list-none"}>
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <time dateTime={item.at} className="w-28 shrink-0 text-xs text-muted-foreground">
                      {when.format(new Date(item.at))}
                    </time>
                    {item.airline && <span className="font-mono text-xs font-bold">{item.airline}</span>}
                    <span className={item.undone ? "text-muted-foreground line-through" : "text-foreground"}>{item.summary}</span>
                    {item.undone && <Badge variant="neutral">défait</Badge>}
                    {item.lines.length > 1 && <span className="text-xs text-link group-open:hidden">détail ({item.lines.length})</span>}
                  </span>
                  <span className="block pl-0 text-xs text-muted-foreground sm:pl-30">{item.actor}</span>
                </summary>
                {item.lines.length > 1 && (
                  <ul className="mt-2 space-y-0.5 border-l pl-3 text-xs text-muted-foreground sm:ml-30">
                    {item.lines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                )}
              </details>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
