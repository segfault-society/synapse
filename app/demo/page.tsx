"use client";

import { SynapseHeader } from "@/components/synapse/synapse-header";
import { DemoControlRoom } from "@/components/synapse/demo-control-room";

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <SynapseHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Demo: N-way contention</h1>
          <p className="text-muted-foreground max-w-2xl">
            This control room lets you fire multiple simultaneous booking requests at the same
            resource slot and watch the SYNAPSE arbiter resolve the conflict in real time. Every
            request arrives at the same instant — the winner is not determined by who clicked
            first, but by a transparent, multi-factor fairness score that weighs role, urgency,
            historical usage, and academic purpose. Select a resource, choose your contenders, and
            hit <strong className="text-foreground">Fire simultaneous requests</strong> to see the
            full score breakdown and ranked outcome.
          </p>
        </div>
        <DemoControlRoom />
      </main>
    </div>
  );
}
