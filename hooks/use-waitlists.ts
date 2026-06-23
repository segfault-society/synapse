"use client";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import type { Waitlist } from "@/lib/synapse/types";

export function useWaitlists(resourceId?: string) {
  const { rows, loading, refetch } = useRealtimeTable<Waitlist>("waitlists", async () => {
    const supabase = createClient();
    let q = supabase.from("waitlists").select("*").order("rank", { ascending: true });
    if (resourceId) q = q.eq("resource_id", resourceId);
    const { data } = await q;
    return data ?? [];
  }, [resourceId]);
  return { waitlists: rows, loading, refetch };
}
