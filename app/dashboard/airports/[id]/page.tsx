"use client";

import { useForm } from "react-hook-form";
import { useRouter, useParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAirport } from "@/hooks/useAirports";
import {
  AirportSchema,
  AirportInput,
  AirportFields,
} from "@/lib/validations/airport";
import { updateAirport, deleteAirport } from "@/services/airports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function EditAirportPage() {
  const router = useRouter();
  const { id } = useParams();
  const { airport } = useAirport(id as string);

  const form = useForm<AirportInput>({
    resolver: zodResolver(AirportSchema),
    values: airport,
  });

  async function onSubmit(values: AirportInput) {
    await updateAirport(id as string, values);
    router.push("/dashboard/airports");
  }

  async function handleDelete() {
    await deleteAirport(id as string);
    router.push("/dashboard/airports");
  }

  if (!airport) return <p>Loading...</p>;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="max-w-md p-6 space-y-4"
    >
      {["code", "name", "city", "country", "timezone"].map((field) => (
        <div key={field}>
          <Input placeholder={field} {...form.register(field as AirportFields)} />
          {form.formState.errors[field as AirportFields] && (
            <p className="text-red-500 text-sm">
              {form.formState.errors[field as AirportFields]?.message?.toString()}
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
