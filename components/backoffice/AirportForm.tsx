'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CircleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AirportStatusBadge } from "@/components/AirportCombobox";
import { AirportStatusAlert } from "@/components/search/AirportStatusNotice";
import { DeleteButton, EditorHeader, Field, FormSection, IN_USE_NOTE, describedBy } from "@/components/backoffice/FormParts";
import { AirportSchema, type AirportInput } from "@/lib/validations/airport";
import { dayValue } from "@/lib/validations/fields";
import { createAirport, deleteAirport, updateAirport } from "@/services/airports";
import type { Airport } from "@/lib/generated/prisma/client";

export const AIRPORT_STATUS_LABEL: Record<Airport["status"], string> = {
  OPEN: "Ouvert",
  RESTRICTED: "Activité réduite",
  CLOSED: "Fermé",
};

const PROVINCES = [
  "Bas-Uele", "Équateur", "Haut-Katanga", "Haut-Lomami", "Haut-Uele", "Ituri", "Kasaï", "Kasaï-Central",
  "Kasaï-Oriental", "Kinshasa", "Kongo-Central", "Kwango", "Kwilu", "Lomami", "Lualaba", "Mai-Ndombe",
  "Maniema", "Mongala", "Nord-Kivu", "Nord-Ubangi", "Sankuru", "Sud-Kivu", "Sud-Ubangi", "Tanganyika",
  "Tshopo", "Tshuapa",
];

const text = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));

function formValues(a?: Airport): AirportInput {
  return {
    code: a?.code ?? "",
    slug: a?.slug ?? "",
    name: a?.name ?? "",
    city: a?.city ?? "",
    province: text(a?.province),
    countryCode: a?.countryCode ?? "CD",
    timezone: a?.timezone ?? "Africa/Kinshasa",
    latitude: text(a?.latitude),
    longitude: text(a?.longitude),
    status: a?.status ?? "OPEN",
    statusNote: text(a?.statusNote),
    statusSince: dayValue(a?.statusSince),
    statusSourceUrl: text(a?.statusSourceUrl),
  };
}

export function AirportForm({ airport }: { airport?: Airport }) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [saveError, setSaveError] = useState<string | null>(null);
  // Lists and the public picker read the same SWR keys; refetch them after a write.
  const refreshAirports = () => mutate((key) => typeof key === "string" && key.startsWith("/api/airports"));
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<AirportInput>({ resolver: zodResolver(AirportSchema), defaultValues: formValues(airport) });

  const preview = useWatch({ control });
  const err = (name: keyof AirportInput) => errors[name]?.message;

  async function onSubmit(values: AirportInput) {
    setSaveError(null);
    try {
      if (airport) await updateAirport(airport.id, values);
      else await createAirport(values);
      await refreshAirports();
      toast.success(airport ? "Aéroport enregistré" : "Aéroport ajouté");
      router.push("/dashboard/airports");
    } catch (e) {
      setSaveError((e as Error).message);
    }
  }

  async function onDelete() {
    if (!airport) return;
    try {
      await deleteAirport(airport.id);
      await refreshAirports();
      toast.success("Aéroport supprimé");
      router.push("/dashboard/airports");
    } catch (e) {
      setSaveError((e as Error).message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-5xl space-y-6" noValidate>
      <EditorHeader
        backHref="/dashboard/airports"
        backLabel="Aéroports"
        title={airport ? `${airport.city} (${airport.code})` : "Nouvel aéroport"}
        meta={airport && <AirportStatusBadge status={airport.status} />}
      />

      {saveError && (
        <Alert variant="danger">
          <CircleAlert className="size-4" aria-hidden="true" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <div className="space-y-6">
          <FormSection title="Identité" description="Comment l'aéroport apparaît dans la recherche et sur le site.">
            <Field id="city" label="Ville" error={err("city")}>
              <Input {...describedBy("city", err("city"))} {...register("city")} placeholder="Kinshasa" />
            </Field>
            <Field id="code" label="Code IATA" error={err("code")} hint="3 lettres, par exemple FIH.">
              <Input {...describedBy("code", err("code"))} {...register("code")} maxLength={3} className="uppercase" />
            </Field>
            <Field id="name" label="Nom de l'aéroport" error={err("name")} className="sm:col-span-2">
              <Input {...describedBy("name", err("name"))} {...register("name")} placeholder="Aéroport international de N'Djili" />
            </Field>
            <Field id="province" label="Province" optional error={err("province")}>
              <Input {...describedBy("province", err("province"))} {...register("province")} list="provinces" />
              <datalist id="provinces">
                {PROVINCES.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </Field>
            <Field id="countryCode" label="Pays" error={err("countryCode")} hint="Code à 2 lettres : CD pour la RDC.">
              <Input {...describedBy("countryCode", err("countryCode"))} {...register("countryCode")} maxLength={2} className="uppercase" />
            </Field>
            <Field
              id="timezone"
              label="Fuseau horaire"
              error={err("timezone")}
              hint="Ouest (UTC+1) : Africa/Kinshasa. Centre et est (UTC+2) : Africa/Lubumbashi."
            >
              <Input {...describedBy("timezone", err("timezone"))} {...register("timezone")} list="timezones" />
              <datalist id="timezones">
                <option value="Africa/Kinshasa" />
                <option value="Africa/Lubumbashi" />
              </datalist>
            </Field>
            <Field
              id="slug"
              label="Adresse web"
              optional
              error={err("slug")}
              hint={airport ? "La changer casse les liens déjà partagés." : "Laisser vide : créée à partir de la ville."}
            >
              <Input {...describedBy("slug", err("slug"))} {...register("slug")} placeholder="kinshasa" />
            </Field>
          </FormSection>

          <FormSection title="Position" description="Pour la carte de la future page de l'aéroport. En degrés décimaux.">
            <Field id="latitude" label="Latitude" optional error={err("latitude")}>
              <Input {...describedBy("latitude", err("latitude"))} {...register("latitude")} inputMode="decimal" placeholder="-4.3858" />
            </Field>
            <Field id="longitude" label="Longitude" optional error={err("longitude")}>
              <Input {...describedBy("longitude", err("longitude"))} {...register("longitude")} inputMode="decimal" placeholder="15.4446" />
            </Field>
          </FormSection>
        </div>

        <div className="space-y-6 lg:sticky lg:top-6">
          <FormSection
            title="Statut public"
            description="Affiché dans le choix d'aéroport et sur chaque recherche qui passe par cet aéroport."
            columns={1}
          >
            <Field id="status" label="Statut" error={err("status")}>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger {...describedBy("status", err("status"))}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AIRPORT_STATUS_LABEL).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field id="statusSince" label="Depuis le" optional error={err("statusSince")}>
              <Input {...describedBy("statusSince", err("statusSince"))} {...register("statusSince")} type="date" />
            </Field>
            <Field
              id="statusNote"
              label="Explication publique"
              optional
              error={err("statusNote")}
              hint="Une ou deux phrases : pourquoi, et ce que le voyageur peut faire."
             
            >
              <Textarea {...describedBy("statusNote", err("statusNote"))} {...register("statusNote")} rows={3} />
            </Field>
            <Field
              id="statusSourceUrl"
              label="Source"
              optional
              error={err("statusSourceUrl")}
              hint="Article ou communiqué qui confirme le statut."
             
            >
              <Input {...describedBy("statusSourceUrl", err("statusSourceUrl"))} {...register("statusSourceUrl")} type="url" placeholder="https://" />
            </Field>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Aperçu sur le site</p>
              {preview.status === "OPEN" ? (
                <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  Ouvert : aucun message n&apos;est affiché.
                </p>
              ) : (
                <AirportStatusAlert
                  airport={{
                    code: preview.code || "???",
                    city: preview.city || "Ville",
                    status: preview.status ?? "OPEN",
                    statusNote: preview.statusNote || null,
                    statusSince: preview.statusSince || null,
                    statusSourceUrl: preview.statusSourceUrl || null,
                  }}
                />
              )}
            </div>
          </FormSection>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <Button type="submit" disabled={isSubmitting || (!!airport && !isDirty)}>
          {isSubmitting ? "Enregistrement…" : airport ? "Enregistrer" : "Ajouter l'aéroport"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/dashboard/airports")}>
          Annuler
        </Button>
        {airport && (
          <div className="ml-auto">
            <DeleteButton what={`l'aéroport de ${airport.city}`} onConfirm={onDelete} description={IN_USE_NOTE} />
          </div>
        )}
      </div>
    </form>
  );
}
