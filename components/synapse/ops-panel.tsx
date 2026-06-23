"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useResources } from "@/hooks/use-resources";
import { usePersonaStore } from "@/lib/store/persona-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type OpResult = Record<string, unknown> | null;

function ResultCard({ result }: { result: OpResult }) {
  if (!result) return null;
  return (
    <pre className="mt-3 text-xs font-mono bg-muted rounded p-3 overflow-x-auto border border-border/40 whitespace-pre-wrap">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}

export function OpsPanel() {
  const { resources } = useResources();
  const { persona } = usePersonaStore();

  const [rebalanceLoading, setRebalanceLoading] = useState(false);
  const [reaperLoading, setReaperLoading] = useState(false);
  const [massCancelLoading, setMassCancelLoading] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");

  const [rebalanceResult, setRebalanceResult] = useState<OpResult>(null);
  const [reaperResult, setReaperResult] = useState<OpResult>(null);
  const [massCancelResult, setMassCancelResult] = useState<OpResult>(null);

  const handleRebalance = async () => {
    setRebalanceLoading(true);
    setRebalanceResult(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("run_fairness_rebalance", {});
      if (error) {
        toast.error(`Rebalance failed: ${error.message}`);
      } else {
        const result = data as OpResult;
        setRebalanceResult(result);
        toast.success("Fairness rebalance complete");
      }
    } finally {
      setRebalanceLoading(false);
    }
  };

  const handleReaper = async () => {
    setReaperLoading(true);
    setReaperResult(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("run_no_show_reaper", {});
      if (error) {
        toast.error(`No-show reaper failed: ${error.message}`);
      } else {
        const result = data as OpResult;
        setReaperResult(result);
        toast.success("No-show reaper complete");
      }
    } finally {
      setReaperLoading(false);
    }
  };

  const handleMassCancel = async () => {
    if (!selectedResourceId) {
      toast.error("Select a resource first");
      return;
    }
    if (!persona) {
      toast.error("No persona selected");
      return;
    }
    setMassCancelLoading(true);
    setMassCancelResult(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("mass_cancel", {
        p_actor_id: persona.id,
        p_resource_id: selectedResourceId,
        p_reason: "Admin mass cancel via ops panel",
      });
      if (error) {
        toast.error(`Mass cancel failed: ${error.message}`);
      } else {
        const result = data as OpResult;
        setMassCancelResult(result);
        toast.success("Mass cancel complete");
      }
    } finally {
      setMassCancelLoading(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Fairness rebalance */}
      <Card className="p-5 space-y-3">
        <div>
          <h3 className="font-semibold text-sm">Run Fairness Rebalance</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Recalculates fairness terms for all members across the default window.
          </p>
        </div>
        <Button
          onClick={handleRebalance}
          disabled={rebalanceLoading}
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
        >
          {rebalanceLoading ? "Running…" : "Run rebalance"}
        </Button>
        <ResultCard result={rebalanceResult} />
      </Card>

      {/* No-show reaper */}
      <Card className="p-5 space-y-3">
        <div>
          <h3 className="font-semibold text-sm">Run No-Show Reaper</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cancels bookings where the member did not check in within the grace period.
          </p>
        </div>
        <Button
          onClick={handleReaper}
          disabled={reaperLoading}
          variant="outline"
          className="w-full"
        >
          {reaperLoading ? "Running…" : "Run reaper"}
        </Button>
        <ResultCard result={reaperResult} />
      </Card>

      {/* Mass cancel */}
      <Card className="p-5 space-y-3">
        <div>
          <h3 className="font-semibold text-sm">Mass Cancel Resource</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cancels all upcoming confirmed bookings for a specific resource.
          </p>
        </div>
        <Select value={selectedResourceId} onValueChange={setSelectedResourceId}>
          <SelectTrigger className="w-full text-sm">
            <SelectValue placeholder="Pick a resource…" />
          </SelectTrigger>
          <SelectContent>
            {resources.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={handleMassCancel}
          disabled={massCancelLoading || !selectedResourceId}
          variant="destructive"
          className="w-full"
        >
          {massCancelLoading ? "Cancelling…" : "Mass cancel"}
        </Button>
        <ResultCard result={massCancelResult} />
      </Card>
    </div>
  );
}
