"use client";

import { SynapseHeader } from "@/components/synapse/synapse-header";
import { ResourceGrid } from "@/components/synapse/resource-grid";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SynapseHeader />
      <main className="container mx-auto px-4 py-8 flex-1 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Discover Resources</h1>
          <p className="text-muted-foreground">
            Real-time, fairness-aware allocation of shared university resources.
          </p>
        </div>
        <ResourceGrid />
      </main>
    </div>
  );
}
