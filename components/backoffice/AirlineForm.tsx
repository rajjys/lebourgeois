'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CircleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteButton, EditorHeader, Field, FormSection, IN_USE_NOTE, describedBy } from "@/components/backoffice/FormParts";
import { AirlineSchema, type AirlineInput } from "@/lib/validations/airline";
import { dayValue } from "@/lib/validations/fields";
import { createAirline, deleteAirline, updateAirline } from "@/services/airlines";
import type { Airline } from "@/lib/generated/prisma/client";

export const AIRLINE_STATUS_LABEL: Record<Airline["status"], string> = {
  OPERATING: "En activité",
  SUSPENDED: "Suspendue",
  CEASED: "A cessé ses activités",
};
export const airlineStatusVariant = { OPERATING: "success", SUSPENDED: "warning", CEASED: "danger" } as const;

const text = (v: string | null | undefined) => v ?? "";

function formValues(a?: Airline): AirlineInput {
  return {
    name: a?.name ?? "",
    code: a?.code ?? "",
    icao: text(a?.icao),
    slug: a?.slug ?? "",
    countryCode: a?.countryCode ?? "CD",
    logo: text(a?.logo),
    website: text(a?.website),
    bookingUrl: text(a?.bookingUrl),
    status: a?.status ?? "OPERATING",
    statusNote: text(a?.statusNote),
    statusSince: dayValue(a?.statusSince),
    statusSourceUrl: text(a?.statusSourceUrl),
    isPublished: a?.isPublished ?? true,
  };
}

export function AirlineForm({ airline }: { airline?: Airline }) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [saveError, setSaveError] = useState<string | null>(null);
  const refreshAirlines = () => mutate((key) => typeof key === "string" && key.startsWith("/api/airlines"));
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<AirlineInput>({ resolver: zodResolver(AirlineSchema), defaultValues: formValues(airline) });

  const err = (name: keyof AirlineInput) => errors[name]?.message;

  async function onSubmit(values: AirlineInput) {
    setSaveError(null);
    try {
      if (airline) await updateAirline(airline.id, values);
      else await createAirline(values);
      await refreshAirlines();
      toast.success(airline ? "Compagnie enregistrée" : "Compagnie ajoutée");
      router.push("/dashboard/airlines");
    } catch (e) {
      setSaveError((e as Error).message);
    }
  }

  async function onDelete() {
    if (!airline) return;
    try {
      await deleteAirline(airline.id);
      await refreshAirlines();
      toast.success("Compagnie supprimée");
      router.push("/dashboard/airlines");
    } catch (e) {
      setSaveError((e as Error).message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-5xl space-y-6" noValidate>
      <EditorHeader
        backHref="/dashboard/airlines"
        backLabel="Compagnies"
        title={airline ? airline.name : "Nouvelle compagnie"}
        meta={
          airline && (
            <>
              <Badge variant={airlineStatusVariant[airline.status]}>{AIRLINE_STATUS_LABEL[airline.status]}</Badge>
              {!airline.isPublished && <Badge variant="neutral">Masquée du site</Badge>}
            </>
          )
        }
      />

      {saveError && (
        <Alert variant="danger">
          <CircleAlert className="size-4" aria-hidden="true" />
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <div className="space-y-6">
          <FormSection title="Identité">
            <Field id="name" label="Nom" error={err("name")} className="sm:col-span-2">
              <Input {...describedBy("name", err("name"))} {...register("name")} placeholder="Compagnie Africaine d'Aviation (CAA)" />
            </Field>
            <Field id="code" label="Code IATA" error={err("code")} hint="Préfixe des numéros de vol : BU, 4H.">
              <Input {...describedBy("code", err("code"))} {...register("code")} maxLength={3} className="uppercase" />
            </Field>
            <Field id="icao" label="Code OACI" optional error={err("icao")}>
              <Input {...describedBy("icao", err("icao"))} {...register("icao")} maxLength={3} className="uppercase" />
            </Field>
            <Field id="countryCode" label="Pays" error={err("countryCode")} hint="Code à 2 lettres : CD pour la RDC.">
              <Input {...describedBy("countryCode", err("countryCode"))} {...register("countryCode")} maxLength={2} className="uppercase" />
            </Field>
            <Field
              id="slug"
              label="Adresse web"
              optional
              error={err("slug")}
              hint={airline ? "La changer casse les liens déjà partagés." : "Laisser vide : créée à partir du nom."}
            >
              <Input {...describedBy("slug", err("slug"))} {...register("slug")} placeholder="caa" />
            </Field>
          </FormSection>

          <FormSection title="Liens" description="Où le voyageur réserve. Nous ne vendons pas de billets." columns={1}>
            <Field id="website" label="Site officiel" optional error={err("website")}>
              <Input {...describedBy("website", err("website"))} {...register("website")} type="url" placeholder="https://" />
            </Field>
            <Field id="bookingUrl" label="Page de réservation" optional error={err("bookingUrl")}>
              <Input {...describedBy("bookingUrl", err("bookingUrl"))} {...register("bookingUrl")} type="url" placeholder="https://" />
            </Field>
            <Field
              id="logo"
              label="Logo (lien)"
              optional
              error={err("logo")}
              hint="Gardé pour plus tard : le site n'affiche pas de logo sans l'accord de la compagnie."
            >
              <Input {...describedBy("logo", err("logo"))} {...register("logo")} type="url" placeholder="https://" />
            </Field>
          </FormSection>
        </div>

        <div className="space-y-6 lg:sticky lg:top-6">
          <FormSection title="Statut public" description="Pas encore affiché sur le site : il le sera avec ses vols et sur la page de la compagnie." columns={1}>
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
                      {Object.entries(AIRLINE_STATUS_LABEL).map(([value, label]) => (
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
            <Field id="statusNote" label="Explication publique" optional error={err("statusNote")}>
              <Textarea {...describedBy("statusNote", err("statusNote"))} {...register("statusNote")} rows={3} />
            </Field>
            <Field id="statusSourceUrl" label="Source" optional error={err("statusSourceUrl")}>
              <Input {...describedBy("statusSourceUrl", err("statusSourceUrl"))} {...register("statusSourceUrl")} type="url" placeholder="https://" />
            </Field>
          </FormSection>

          <FormSection title="Visibilité" columns={1}>
            <Controller
              control={control}
              name="isPublished"
              render={({ field }) => (
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="isPublished">Affichée sur le site</Label>
                    <p className="text-xs text-muted-foreground">
                      Désactivé : ses vols n&apos;apparaissent plus au public.
                    </p>
                  </div>
                  <Switch id="isPublished" checked={field.value} onCheckedChange={field.onChange} />
                </div>
              )}
            />
          </FormSection>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <Button type="submit" disabled={isSubmitting || (!!airline && !isDirty)}>
          {isSubmitting ? "Enregistrement…" : airline ? "Enregistrer" : "Ajouter la compagnie"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/dashboard/airlines")}>
          Annuler
        </Button>
        {airline && (
          <div className="ml-auto">
            <DeleteButton what={airline.name} onConfirm={onDelete} description={IN_USE_NOTE} />
          </div>
        )}
      </div>
    </form>
  );
}
