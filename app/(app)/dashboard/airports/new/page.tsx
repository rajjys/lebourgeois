"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AirportSchema,
  AirportInput,
  AirportFields,
} from "@/lib/validations/airport";
import { createAirport } from "@/services/airports";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NewAirportPage() {
  const router = useRouter();
  const form = useForm<AirportInput>({
    resolver: zodResolver(AirportSchema),
  });

  async function onSubmit(values: AirportInput) {
    await createAirport(values);
    router.push("/dashboard/airports");
  }

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

      <Button type="submit">Create</Button>
    </form>
  );
}
