"use client";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import type { FairnessRow } from "@/lib/synapse/types";

export function useFairness() {
  const { rows, loading, refetch } = useRealtimeTable<FairnessRow>("fairness_ledger", async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("fairness_ledger")
      .select("*")
      .order("fairness_term", { ascending: false });
    return data ?? [];
  });
  return { rows, loading, refetch };
}
