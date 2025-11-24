"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FlightPatternSchema, FlightPatternInput } from "@/lib/validations/flightPattern";
import { createFlightPattern } from "@/services/flightPatterns";
import { useAirlines } from "@/hooks/useAirlines";
import { useAirports } from "@/hooks/useAirports";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const WEEKDAYS = ["MON","TUE","WED","THU","FRI","SAT","SUN"] as const;

export default function NewFlightPatternPage() {
  const router = useRouter();
  const { airlines } = useAirlines();
  const { airports } = useAirports();

  const { register, handleSubmit, control, formState } = useForm<FlightPatternInput>({
    resolver: zodResolver(FlightPatternSchema),
    defaultValues: {
      daysOfWeek: [],
      currency: "USD",
    }
  });

  async function onSubmit(values: FlightPatternInput) {
    await createFlightPattern(values);
    router.push("/dashboard/flight-patterns");
  }
  if(formState.errors) console.log(formState.errors);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <select {...register("airlineId")} className="p-2 border">
          <option value="">Select airline</option>
          {airlines?.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
        </select>

        <input {...register("flightNumber")} placeholder="Flight number" className="p-2 border" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <select {...register("originId")} className="p-2 border">
          <option value="">Origin</option>
          {airports?.map((a: any) => <option key={a.id} value={a.id}>{a.iata} — {a.city}</option>)}
        </select>

        <select {...register("destinationId")} className="p-2 border">
          <option value="">Destination</option>
          {airports?.map((a: any) => <option key={a.id} value={a.id}>{a.iata} — {a.city}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input {...register("departureTime")} placeholder="Departure (HH:MM)" className="p-2 border" />
        <input {...register("arrivalTime")} placeholder="Arrival (HH:MM)" className="p-2 border" />
      </div>

      <div>
        <label className="block mb-2">Days of operation</label>
        <div className="flex gap-2">
          {WEEKDAYS.map((d) => (
            <Controller
              key={d}
              control={control}
              name="daysOfWeek"
              render={({ field }) => {
                const checked = field.value?.includes(d);
                return (
                  <label className="flex items-center gap-1">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(val) => {
                        const set = new Set(field.value || []);
                        if (val) set.add(d);
                        else set.delete(d);
                        field.onChange(Array.from(set));
                      }}
                    />
                    <span className="text-sm">{d}</span>
                  </label>
                );
              }}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input type="date" {...register("startDate")} className="p-2 border" />
        <input type="date" {...register("endDate")} className="p-2 border" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <input {...register("price")} placeholder="Prix" className="p-2 border" type="number" />
        <input {...register("currency")} placeholder="Devise" className="p-2 border" />
        <input {...register("capacity")} placeholder="Capacite" className="p-2 border" type="number" />
        <input {...register("stops")} placeholder="Escales" className="p-2 border" type="number" />
        <input {...register("distanceInKm")} placeholder="Distance en Km" className="p-2 border" type="number" />
        <input {...register("durationInMin")} placeholder="Duree de vol" className="p-2 border" type="number" />
        <input {...register("aircraft")} placeholder="Appareil" className="p-2 border" />
      </div>
      <div className="flex gap-4">
        <Button type="submit">Create</Button>
      </div>
    </form>
  );
}
