'use client';

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteButton, Field, FormSection, describedBy } from "@/components/backoffice/FormParts";
import { ROUTE_STATUS } from "@/components/backoffice/RouteParts";
import { RouteSettingsSchema, type RouteSettingsInput } from "@/lib/validations/route";
import { sendJson } from "@/services/http";

type Props = {
  route: { id: string; status: RouteSettingsInput["status"]; tier: number; note: string | null };
  /** Only a draft with no airline and no request can be deleted (a mistake); the rest is archived. */
  canDelete: boolean;
};

export function RouteSettingsForm({ route, canDelete }: Props) {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<RouteSettingsInput>({
    resolver: zodResolver(RouteSettingsSchema),
    defaultValues: { status: route.status, tier: route.tier, note: route.note ?? "" },
  });

  async function onSubmit(values: RouteSettingsInput) {
    try {
      await sendJson(`/api/routes/${route.id}`, "PUT", values);
      reset(values);
      toast.success("Route enregistrée");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function remove() {
    try {
      await sendJson(`/api/routes/${route.id}`, "DELETE");
      toast.success("Route supprimée");
      router.push("/dashboard/routes");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormSection title="Réglages" description="Statut, priorité et note de la route." columns={1}>
        <Field id="route-status" label="Statut" hint="Aucune page publique pour l'instant : « Publiée » prendra effet quand les pages des routes seront en ligne.">
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger {...describedBy("route-status")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROUTE_STATUS) as (keyof typeof ROUTE_STATUS)[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {ROUTE_STATUS[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field id="route-tier" label="Priorité" error={errors.tier?.message}>
          <Controller
            control={control}
            name="tier"
            render={({ field }) => (
              <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                <SelectTrigger {...describedBy("route-tier", errors.tier?.message)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">P1 : en premier</SelectItem>
                  <SelectItem value="2">P2</SelectItem>
                  <SelectItem value="3">P3</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </Field>
        <Field
          id="route-note"
          label="Note sur la route"
          optional
          error={errors.note?.message}
          hint="Publique avec la page de la route. Par exemple : « Pas de vol direct ; correspondance possible via Lubumbashi. »"
        >
          <Textarea rows={3} {...describedBy("route-note", errors.note?.message)} {...register("note")} />
        </Field>
      </FormSection>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {isDirty && (
          <Button type="button" variant="ghost" onClick={() => reset()}>
            Annuler
          </Button>
        )}
        {canDelete && (
          <div className="ml-auto">
            <DeleteButton
              what="cette route"
              onConfirm={remove}
              description="Possible tant qu'elle est en brouillon, sans compagnie ni demande. Ensuite, archivez-la."
            />
          </div>
        )}
      </div>
    </form>
  );
}
