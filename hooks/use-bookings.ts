"use client";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/hooks/use-realtime-table";
import type { Booking } from "@/lib/synapse/types";

export function useBookings(memberId?: string) {
  const { rows, loading, refetch } = useRealtimeTable<Booking>("bookings", async () => {
    const supabase = createClient();
    let q = supabase.from("bookings").select("*").order("created_at", { ascending: false });
    if (memberId) q = q.eq("member_id", memberId);
    const { data } = await q;
    return data ?? [];
  }, [memberId]);
  return { bookings: rows, loading, refetch };
}
