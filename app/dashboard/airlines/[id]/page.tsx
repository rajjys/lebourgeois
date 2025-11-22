"use client";

import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAirline } from "@/hooks/useAirlines";
import {
  AirlineSchema,
  AirlineInput,
  AirlineFields,
} from "@/lib/validations/airline";
import {
  updateAirline,
  deleteAirline,
} from "@/services/airlines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function EditAirlinePage() {
  const router = useRouter();
  const { id } = useParams();
  const { airline } = useAirline(id as string);

  const form = useForm<AirlineInput>({
    resolver: zodResolver(AirlineSchema),
    values: airline,
  });

  async function onSubmit(values: AirlineInput) {
    await updateAirline(id as string, values);
    router.push("/dashboard/airlines");
  }

  async function handleDelete() {
    await deleteAirline(id as string);
    router.push("/dashboard/airlines");
  }

  if (!airline) return <p>Loading...</p>;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="max-w-md p-6 space-y-4"
    >
      {["code", "name", "country"].map((field) => (
        <div key={field}>
          <Input placeholder={field} {...form.register(field as AirlineFields)} />
          {form.formState.errors[field as AirlineFields] && (
            <p className="text-red-500 text-sm">
              {form.formState.errors[field as AirlineFields]?.message?.toString()}
            </p>
          )}
        </div>
      ))}

      <div className="flex gap-4">
        <Button type="submit">Save</Button>
        <Button variant="destructive" onClick={handleDelete}>
          Delete
        </Button>
      </div>
    </form>
  );
}
