"use client";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import type { Resource } from "@/lib/synapse/types";

export function useResources() {
  const { rows, loading, refetch } = useRealtimeTable<Resource>("resources", async () => {
    const supabase = createClient();
    const { data } = await supabase.from("resources").select("*").order("name");
    return data ?? [];
  });
  return { resources: rows, loading, refetch };
}
