"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { usePersonaStore } from "@/lib/store/persona-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SlotPicker } from "@/components/synapse/slot-picker";
import { DecisionModal } from "@/components/synapse/decision-modal";
import type { Decision } from "@/lib/synapse/types";

interface BookingFormProps {
  resourceId: string;
}

export function BookingForm({ resourceId }: BookingFormProps) {
  const { persona } = usePersonaStore();
  const [selected, setSelected] = useState<{ start: Date; end: Date } | undefined>();
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const canBook = !!selected && !!persona && !loading;

  async function handleBook() {
    if (!selected || !persona) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("book_request", {
        p_actor_id: persona.id,
        p_resource_id: resourceId,
        p_start: selected.start.toISOString(),
        p_end: selected.end.toISOString(),
        p_purpose: purpose.trim() || undefined,
        p_request_id: crypto.randomUUID(),
      });

      if (error) {
        toast.error(error.message ?? "Booking failed");
        return;
      }

      const result = data as unknown as Decision;
      setDecision(result);
      setModalOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  function handleSlotSelect(start: Date, end: Date) {
    setSelected({ start, end });
  }

  function formatSlotLabel(slot: { start: Date; end: Date }): string {
    return `${slot.start.toLocaleDateString("en-AU", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })} ${slot.start.toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })}–${slot.end.toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })}`;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <h2 className="text-base font-semibold">Book a slot</h2>
          {!persona && (
            <p className="text-sm text-amber-500">Select a persona to book.</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <SlotPicker
            resourceId={resourceId}
            onSelect={handleSlotSelect}
            selected={selected}
          />

          {selected && (
            <p className="text-xs text-cyan-600 dark:text-cyan-400 font-mono">
              Selected: {formatSlotLabel(selected)}
            </p>
          )}

          <div className="space-y-1">
            <label htmlFor="purpose" className="text-sm font-medium">
              Purpose <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              id="purpose"
              placeholder="e.g. Dissertation research session"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button
            onClick={handleBook}
            disabled={!canBook}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            {loading ? "Processing…" : "Request booking"}
          </Button>
        </CardContent>
      </Card>

      <DecisionModal
        decision={decision}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
