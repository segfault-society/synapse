"use client";

import { SynapseHeader } from "@/components/synapse/synapse-header";
import { MyBookings } from "@/components/synapse/my-bookings";

export default function MePage() {
  return (
    <div className="min-h-screen bg-background">
      <SynapseHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">My space</h1>
          <p className="text-muted-foreground mt-1">
            Manage your bookings, check in, cancel, and propose swaps.
          </p>
        </div>
        <MyBookings />
      </main>
    </div>
  );
}
