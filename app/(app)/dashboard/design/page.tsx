import type { Metadata } from "next";
import { ArrowRight, Plus, Trash2, TriangleAlert, Info } from "lucide-react";
import tokens from "@/design/tokens.json";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PriceTag } from "@/components/ds/PriceTag";
import { FreshnessBadge } from "@/components/ds/FreshnessBadge";
import { RouteTitle } from "@/components/ds/RouteTitle";
import { AirlineMark } from "@/components/ds/AirlineMark";
import { DayStrip } from "@/components/ds/DayStrip";

export const metadata: Metadata = { title: "Système de design" };

// Living reference for docs/DESIGN-SYSTEM.md. Sample data below is illustrative, not published.
const SCALES = ["brand", "neutral", "blue", "green", "amber", "red"] as const;
type Scale = Record<string, { $value: string }>;

function contrastWithWhite(hex: string) {
  const [r, g, b] = hex.match(/[0-9a-f]{2}/gi)!.map((h) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
}

function resolveRole(ref: string) {
  const [, group, step] = /^\{color\.([a-z]+)(?:\.(\d+))?\}$/.exec(ref) ?? [];
  const color = tokens.color as unknown as Record<string, Scale | { $value: string }>;
  return step ? (color[group] as Scale)[step].$value : (color[group] as { $value: string }).$value;
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 border-t py-10 first:border-t-0 first:pt-0">
      <h2 className="mb-6 text-xl font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

const today = new Date();
const daysAgo = (n: number) => new Date(today.getTime() - n * 86_400_000);

export default function DesignSystemPage() {
  const roles = Object.entries(tokens.role).filter(([k]) => !k.startsWith("$")) as [string, { $value: string; $description?: string }][];

  return (
    <div className="max-w-6xl">
      <header className="mb-10">
        <p className="text-sm font-semibold text-brand">Clerikaa · v1</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Système de design</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Référence vivante. Les couleurs viennent de <code className="text-sm">design/tokens.json</code>; les règles sont
          dans <code className="text-sm">docs/DESIGN-SYSTEM.md</code>. Les données de vol ci-dessous sont des exemples.
        </p>
      </header>

      <Section id="marque" title="Marque">
        <div className="flex flex-wrap items-end gap-8">
          <Logo />
          <Logo className="[&>span:last-child]:text-3xl" markClassName="size-12" />
          <div className="flex items-end gap-4">
            {[4, 6, 8, 12].map((s) => (
              <LogoMark key={s} className={`size-${s}`} />
            ))}
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
          Un « c » tracé comme une trajectoire qui aboutit à sa destination. Rose sur blanc ; jamais déformé, jamais sur une
          photo.
        </p>
      </Section>

      <Section id="couleurs" title="Couleurs">
        <div className="space-y-4">
          {SCALES.map((name) => (
            <div key={name} className="grid grid-cols-[6rem_1fr] items-start gap-4">
              <div className="pt-3 text-sm font-semibold">{name}</div>
              <div className="grid grid-cols-11 gap-1.5">
                {Object.entries(tokens.color[name] as Scale).map(([step, { $value }]) => {
                  const ratio = contrastWithWhite($value);
                  return (
                    <div key={step} className="min-w-0">
                      <div className="h-12 rounded-md border border-black/5" style={{ backgroundColor: $value }} />
                      <div className="mt-1 text-[11px] leading-tight text-muted-foreground">
                        <div className="font-semibold text-foreground">{step}</div>
                        <div className="tabular-nums">{$value}</div>
                        <div className="tabular-nums">{ratio.toFixed(1)}:1</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Le ratio est le contraste avec le blanc. Texte : 4,5:1 minimum.</p>

        <h3 className="mb-3 mt-8 font-semibold">Rôles (ce que les composants utilisent)</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16" />
              <TableHead>Rôle</TableHead>
              <TableHead>Valeur</TableHead>
              <TableHead>Usage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map(([name, t]) => (
              <TableRow key={name}>
                <TableCell>
                  <div className="h-6 w-10 rounded-sm border border-black/10" style={{ backgroundColor: resolveRole(t.$value) }} />
                </TableCell>
                <TableCell className="font-mono text-xs">{name}</TableCell>
                <TableCell className="text-xs text-muted-foreground tabular-nums">
                  {t.$value.replace(/[{}]/g, "").replace("color.", "")} · {resolveRole(t.$value)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.$description ?? ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section id="typographie" title="Typographie · Plus Jakarta Sans">
        <div className="space-y-5">
          {[
            ["text-4xl font-extrabold tracking-tight", "Display · 36", "Vols intérieurs en RDC"],
            ["text-3xl font-bold tracking-tight", "Titre de page · 30", "Vols Kinshasa – Lubumbashi"],
            ["text-xl font-bold tracking-tight", "Section · 20", "Horaires de la semaine"],
            ["text-base font-semibold", "Sous-titre · 16", "CAA · 4 vols par semaine"],
            ["text-base", "Texte · 16", "Les prix sont relevés sur le site de la compagnie et datés. La compagnie confirme le tarif final."],
            ["text-sm text-muted-foreground", "Méta · 14", "Source : programme CAA du 20 octobre 2026"],
            ["text-xs text-muted-foreground", "Légende · 12", "Heures locales de départ et d'arrivée"],
          ].map(([cls, label, sample]) => (
            <div key={label} className="grid grid-cols-[10rem_1fr] items-baseline gap-4">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className={cls}>{sample}</div>
            </div>
          ))}
          <div className="grid grid-cols-[10rem_1fr] items-baseline gap-4">
            <div className="text-xs text-muted-foreground">Chiffres tabulaires</div>
            <div className="text-lg font-semibold tabular-nums">
              07:45 → 10:20 · 11:11 → 18:08 · 1 244 $ · BU 1611
            </div>
          </div>
        </div>
      </Section>

      <Section id="boutons" title="Boutons">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Voir les vols</Button>
            <Button variant="secondary">Secondaire</Button>
            <Button variant="outline">Demander un devis</Button>
            <Button variant="ghost">Fantôme</Button>
            <Button variant="link">Lien</Button>
            <Button variant="destructive">
              <Trash2 /> Supprimer
            </Button>
            <Button disabled>Désactivé</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">
              <Plus /> Petit
            </Button>
            <Button>Normal</Button>
            <Button size="lg">
              Grand (public, 48 px) <ArrowRight />
            </Button>
            <Button size="icon" variant="outline" aria-label="Ajouter">
              <Plus />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">Un seul bouton principal (rose) par écran. Supprimer : rouge, avec libellé et confirmation.</p>
        </div>
      </Section>

      <Section id="champs" title="Champs">
        <div className="grid max-w-3xl gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ds-price">Prix observé (USD)</Label>
            <Input id="ds-price" inputMode="numeric" placeholder="244" />
            <p className="text-xs text-muted-foreground">Montant entier, tel qu&apos;affiché par la compagnie.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ds-flight">Numéro de vol</Label>
            <Input id="ds-flight" defaultValue="BU16" aria-invalid="true" aria-describedby="ds-flight-error" className="border-danger" />
            <p id="ds-flight-error" className="flex items-center gap-1 text-xs font-medium text-danger">
              <TriangleAlert className="size-3.5" aria-hidden="true" /> Format attendu : code compagnie + numéro (BU 1611).
            </p>
          </div>
        </div>
      </Section>

      <Section id="statuts" title="Badges et statuts">
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Opéré</Badge>
          <Badge variant="warning">À confirmer</Badge>
          <Badge variant="danger">Aéroport fermé</Badge>
          <Badge variant="info">Nouveau</Badge>
          <Badge variant="brand">Prix le plus bas</Badge>
          <Badge variant="neutral">Brouillon</Badge>
          <Badge variant="outline">Escale à Kindu</Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <FreshnessBadge verifiedAt={today} />
          <FreshnessBadge verifiedAt={daysAgo(2)} />
          <FreshnessBadge verifiedAt={daysAgo(10)} />
          <FreshnessBadge verifiedAt={daysAgo(30)} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          La couleur n&apos;est jamais seule : le libellé dit toujours ce qu&apos;elle signifie. Seuils de fraîcheur provisoires (7 et 14 jours).
        </p>
      </Section>

      <Section id="alertes" title="Bandeaux">
        <div className="max-w-3xl space-y-3">
          <Alert variant="danger">
            <TriangleAlert className="size-4" />
            <AlertTitle>Aéroport de Goma fermé</AlertTitle>
            <AlertDescription>
              Fermé aux vols commerciaux depuis janvier 2025, en raison du conflit armé dans la région.{" "}
              <a href="#" className="font-semibold text-link underline underline-offset-2">Source</a>
            </AlertDescription>
          </Alert>
          <Alert variant="info">
            <Info className="size-4" />
            <AlertTitle>Prix indicatifs</AlertTitle>
            <AlertDescription>Nous ne vendons pas de billets. La compagnie ou votre agence confirme le tarif final.</AlertDescription>
          </Alert>
        </div>
      </Section>

      <Section id="donnees" title="Données de vol (exemple d'affichage public)">
        <div className="max-w-md rounded-lg border bg-card p-4 shadow-card">
          <RouteTitle origin="Kinshasa" destination="Lubumbashi" as="h3" className="text-xl" />
          <p className="mt-1 text-sm text-muted-foreground">2 compagnies · vol direct · 2 h 30</p>
          <div className="mt-4 space-y-4">
            {[
              { code: "BU", name: "CAA", days: ["TUE", "WED", "THU", "FRI"] as const, price: 260, seen: 3 },
              { code: "4H", name: "Air Congo", days: ["MON", "WED", "SAT"] as const, price: 244, seen: 0 },
            ].map((a) => (
              <div key={a.code} className="flex items-start justify-between gap-4 border-t pt-4 first:border-t-0 first:pt-0">
                <div className="space-y-2">
                  <AirlineMark code={a.code} name={a.name} />
                  <DayStrip days={a.days} />
                </div>
                <PriceTag amount={a.price} observedAt={daysAgo(a.seen)} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t pt-3">
            <FreshnessBadge verifiedAt={daysAgo(2)} />
            <Button variant="link" className="h-auto p-0">
              Voir les horaires <ArrowRight />
            </Button>
          </div>
        </div>

        <h3 className="mb-3 mt-8 font-semibold">Tableau d&apos;horaires</h3>
        <div className="max-w-3xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vol</TableHead>
                <TableHead>Jours</TableHead>
                <TableHead>Départ</TableHead>
                <TableHead>Arrivée</TableHead>
                <TableHead>Escales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell><AirlineMark code="BU" /> <span className="ml-1 font-semibold tabular-nums">1611</span></TableCell>
                <TableCell><DayStrip days={["TUE", "WED", "THU", "FRI"]} /></TableCell>
                <TableCell><time className="font-semibold">13:45</time> <span className="text-xs text-muted-foreground">FIH</span></TableCell>
                <TableCell><time className="font-semibold">17:15</time> <span className="text-xs text-muted-foreground">FBM</span></TableCell>
                <TableCell><Badge variant="neutral">Direct</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell><AirlineMark code="BU" /> <span className="ml-1 font-semibold tabular-nums">1671</span></TableCell>
                <TableCell><DayStrip days={["MON"]} /></TableCell>
                <TableCell><time className="font-semibold">16:30</time> <span className="text-xs text-muted-foreground">FIH</span></TableCell>
                <TableCell><time className="font-semibold">20:00</time> <span className="text-xs text-muted-foreground">FBM</span></TableCell>
                <TableCell><Badge variant="neutral">Direct</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="mt-2 text-xs text-muted-foreground">Heures locales. Kinshasa UTC+1, Lubumbashi UTC+2.</p>
        </div>
      </Section>

      <Section id="back-office" title="Back office : densité">
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          Le back office est conçu pour un ordinateur : tableaux denses, lignes de 40 px, actions au clavier. Exemple du futur
          tableau des routes (docs/ROUTE-MODEL.md).
        </p>
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>Route</TableHead>
              <TableHead>Priorité</TableHead>
              <TableHead>Compagnies</TableHead>
              <TableHead>Prochain vol</TableHead>
              <TableHead>Fraîcheur</TableHead>
              <TableHead>Publiée</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ["Kinshasa", "Lubumbashi", "1", "BU · 4H", "mar. 3 nov.", 2, true],
              ["Kinshasa", "Mbuji-Mayi", "1", "BU", "lun. 2 nov.", 10, true],
              ["Kinshasa", "Kalemie", "2", "BU (via Kindu)", "mer. 4 nov.", 30, false],
            ].map(([from, to, tier, airlines, next, age, pub]) => (
              <TableRow key={to as string}>
                <TableCell className="py-2">
                  <RouteTitle origin={from as string} destination={to as string} as="span" className="text-sm" />
                </TableCell>
                <TableCell className="py-2 tabular-nums">P{tier}</TableCell>
                <TableCell className="py-2">{airlines}</TableCell>
                <TableCell className="py-2">{next}</TableCell>
                <TableCell className="py-2"><FreshnessBadge verifiedAt={daysAgo(age as number)} /></TableCell>
                <TableCell className="py-2">{pub ? <Badge variant="success">Oui</Badge> : <Badge variant="neutral">Non</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </div>
  );
}
