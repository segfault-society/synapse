"use client";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import type { PolicyRow } from "@/lib/synapse/types";

export function usePolicy() {
  const { rows, loading, refetch } = useRealtimeTable<PolicyRow>("policy_settings", async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("policy_settings")
      .select("*")
      .order("category", { ascending: true })
      .order("key", { ascending: true });
    return data ?? [];
  });
  return { rows, loading, refetch };
}
