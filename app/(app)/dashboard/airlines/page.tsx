"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAirlines } from "@/hooks/useAirlines";

export default function AirlinesPage() {
  const { airlines, isLoading } = useAirlines();

  if (isLoading) return <p>Loading...</p>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Airlines</h1>
        <Button asChild>
          <Link href="/dashboard/airlines/new">Add Airline</Link>
        </Button>
      </div>

      <table className="w-full border">
        <thead className="bg-muted">
          <tr>
            <th className="p-2 text-left">Code</th>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Country</th>
            <th className="p-2"></th>
          </tr>
        </thead>

        <tbody>
          {airlines?.map((a: any) => (
            <tr key={a.id} className="border-t">
              <td className="p-2">{a.code}</td>
              <td className="p-2">{a.name}</td>
              <td className="p-2">{a.country}</td>
              <td className="p-2 text-right">
                <Link
                  className="text-blue-600 underline"
                  href={`/dashboard/airlines/${a.id}`}
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
