"use client";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import type { AuditRow } from "@/lib/synapse/types";

export function useAuditLog(limit?: number) {
  const { rows, loading, refetch } = useRealtimeTable<AuditRow>("audit_log", async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("audit_log")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(limit ?? 50);
    return data ?? [];
  }, [limit]);
  return { rows, loading, refetch };
}
