"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormLabel
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { WeekdayEnum } from "@/lib/validations/flightPattern";
import { useAirports } from "@/hooks/useAirports";
import { useAirlines } from "@/hooks/useAirlines";
import { Airline, Airport } from "@/lib/generated/prisma/client";
import { useFlightPattern } from "@/hooks/useFlightPatterns";
import { updateFlightPattern } from "@/services/flightPatterns";

// ------------------------------------------------------------
// Weekday Enum
// ------------------------------------------------------------
const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

const formSchema = z.object({
  airlineId: z.string().min(1, "Required").uuid(),
  originId: z.string().min(1, "Required").uuid(),
  destinationId: z.string().min(1, "Required").uuid(),
  flightNumber: z.string().min(1, "Required"),
  departureTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  arrivalTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),

  price: z.preprocess((v) => (v !== "" ? Number(v) : undefined), z.number().optional()),
  capacity: z.preprocess((v) => (v !== "" ? Number(v) : undefined), z.number().optional()),
  distanceInKm: z.preprocess((v) => (v !== "" ? Number(v) : undefined), z.number().optional()),
  durationInMin: z.preprocess((v) => (v !== "" ? Number(v) : undefined), z.number().optional()),
  
  daysOfWeek: z.array(WeekdayEnum).min(1, "Pick at least one day").optional(),
  startDate: z.preprocess((v) => (typeof v === "string" ? new Date(v) : v), z.date()),
  endDate: z.preprocess((v) => (typeof v === "string" ? new Date(v) : v), z.date()),
});

type FlightPatternFormValues = z.infer<typeof formSchema>;

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------
export default function EditFlightPatternPage() {
  const router = useRouter();
  const { id } = useParams();

  const { airlines } = useAirlines();
  const { airports } = useAirports();
  const { pattern, error, isLoading } = useFlightPattern(id as string);

  const form = useForm<FlightPatternFormValues>({
    resolver: zodResolver(formSchema),
    values: pattern,
  });

  // ------------------------------------------------------------
  // Submit Handler
  // ------------------------------------------------------------
  const onSubmit = async (values: FlightPatternFormValues) => {
    await updateFlightPattern(id as string, values);
    router.push("/dashboard/flight-patterns");
  };

  // ------------------------------------------------------------
  // Delete Handler
  // ------------------------------------------------------------
  const onDelete = async () => {
    if (!confirm("Delete this flight schedule permanently?")) return;

    try {
      const res = await fetch(`/api/flight-patterns/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();

      toast.success("Deleted successfully");
      router.push("/dashboard/flight-patterns");
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  if (isLoading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">Erreur</div>
  console.log(pattern)
  return (
    <div className="max-w-3xl mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Edit Flight Pattern</CardTitle>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Airline */}
              <FormField
                control={form.control}
                name="airlineId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Airline</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select airline" />
                        </SelectTrigger>
                        <SelectContent>
                          {airlines?.map((a: Airline) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name} ({a.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Origin */}
              <FormField
                control={form.control}
                name="originId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origin</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select origin" />
                        </SelectTrigger>
                        <SelectContent>
                          {airports?.map((a: Airport) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.code} - {a.city}, {a.country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Destination */}
              <FormField
                control={form.control}
                name="destinationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select destination" />
                        </SelectTrigger>
                        <SelectContent>
                          {airports?.map((a: Airport) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.code} - {a.city}, {a.country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Flight Number */}
              <FormField
                control={form.control}
                name="flightNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Flight Number</FormLabel>
                    <FormControl>
                      <Input placeholder="ET305" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Times */}
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="departureTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departure Time (HH:mm)</FormLabel>
                      <FormControl>
                        <Input placeholder="10:00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="arrivalTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arrival Time (HH:mm)</FormLabel>
                      <FormControl>
                        <Input placeholder="14:35" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Duration & Capacity */}
              <div className="grid grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="durationInMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (min)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Price</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Distance */}
              <FormField
                control={form.control}
                name="distanceInKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distance (km)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Days of week */}
              <FormField
                control={form.control}
                name="daysOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days of Operation</FormLabel>
                    <div className="grid grid-cols-3 gap-3">
                      {WEEKDAYS.map((day) => {
                        const checked = field.value?.includes(day);
                        return (
                          <label
                            key={day}
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                const val = v === true;
                                let newDays = field.value || [];
                                if (val) {
                                  newDays = [...newDays, day];
                                } else {
                                  newDays = newDays.filter((d) => d !== day);
                                }
                                field.onChange(newDays);
                              }}
                            />
                            <span>{day}</span>
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dates */}
              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          // 1. FIX: logic to handle both Date objects and ISO Strings
                          value={
                            field.value
                              ? new Date(field.value).toISOString().split("T")[0]
                              : ""
                          }
                          // 2. FIX: Ensure we send a string back to valid form state, 
                          // or let Zod preprocess handle the conversion.
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          // 1. FIX: Same logic here
                          value={
                            field.value
                              ? new Date(field.value).toISOString().split("T")[0]
                              : ""
                          }
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={onDelete}
                >
                  Delete
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
