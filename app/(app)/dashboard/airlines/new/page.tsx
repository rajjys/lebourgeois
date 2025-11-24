"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AirlineSchema,
  AirlineInput,
  AirlineFields,
} from "@/lib/validations/airline";
import { createAirline } from "@/services/airlines";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NewAirlinePage() {
  const router = useRouter();
  const form = useForm<AirlineInput>({
    resolver: zodResolver(AirlineSchema),
  });

  async function onSubmit(values: AirlineInput) {
    await createAirline(values);
    router.push("/dashboard/airlines");
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="max-w-md p-6 space-y-4"
    >
      {["code", "name", "country", "logo"].map((field) => (
        <div key={field}>
          <Input placeholder={field} {...form.register(field as AirlineFields)} />
          {form.formState.errors[field as AirlineFields] && (
            <p className="text-red-500 text-sm">
              {form.formState.errors[field as AirlineFields]?.message?.toString()}
            </p>
          )}
        </div>
      ))}

      <Button type="submit">Create</Button>
    </form>
  );
}
