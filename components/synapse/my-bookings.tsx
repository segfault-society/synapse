"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { usePersonaStore } from "@/lib/store/persona-store";
import { useBookings } from "@/hooks/use-bookings";
import { useWaitlists } from "@/hooks/use-waitlists";
import { useResources } from "@/hooks/use-resources";
import type { Booking } from "@/lib/synapse/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/** Parse a PostgreSQL tstzrange like `["2026-06-24 14:00:00+00","2026-06-24 15:00:00+00")` */
function parseTstzrange(during: unknown): { start: Date; end: Date } | null {
  if (typeof during !== "string") return null;
  const inner = during.replace(/^[\[(]/, "").replace(/[\])]$/, "");
  const comma = inner.indexOf(",");
  if (comma === -1) return null;
  const startStr = inner.slice(0, comma).trim();
  const endStr = inner.slice(comma + 1).trim();
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  return { start, end };
}

function formatSlot(during: unknown): string {
  const range = parseTstzrange(during);
  if (!range) return "Unknown time";
  const dateStr = range.start.toLocaleDateString("en-AU", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startTime = range.start.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const endTime = range.end.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${dateStr} · ${startTime}–${endTime}`;
}

function isUpcoming(during: unknown): boolean {
  const range = parseTstzrange(during);
  if (!range) return false;
  return range.end > new Date();
}

interface SwapSelectProps {
  bookingId: string;
  otherBookings: Booking[];
  resourceMap: Map<string, string>;
  onSwap: (bookingA: string, bookingB: string) => Promise<void>;
}

function SwapSelect({ bookingId, otherBookings, resourceMap, onSwap }: SwapSelectProps) {
  const [selectedSwap, setSelectedSwap] = useState<string>("");
  const [swapping, setSwapping] = useState(false);

  const handleSwap = async () => {
    if (!selectedSwap) return;
    setSwapping(true);
    try {
      await onSwap(bookingId, selectedSwap);
    } finally {
      setSwapping(false);
      setSelectedSwap("");
    }
  };

  if (otherBookings.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">No other bookings to swap with</span>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={selectedSwap} onValueChange={setSelectedSwap}>
        <SelectTrigger size="sm" className="w-56">
          <SelectValue placeholder="Pick booking to swap…" />
        </SelectTrigger>
        <SelectContent>
          {otherBookings.map((b) => {
            const name = resourceMap.get(b.resource_id) ?? b.resource_id.slice(0, 8);
            return (
              <SelectItem key={b.id} value={b.id}>
                {name} · {formatSlot(b.during)}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="outline"
        disabled={!selectedSwap || swapping}
        onClick={handleSwap}
        className="text-cyan-600 border-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950"
      >
        {swapping ? "Proposing…" : "Propose swap"}
      </Button>
    </div>
  );
}

export function MyBookings() {
  const [hasMounted, setHasMounted] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const { persona } = usePersonaStore();
  const { bookings, loading: bookingsLoading } = useBookings(persona?.id);
  const { waitlists, loading: waitlistsLoading } = useWaitlists();
  const { resources } = useResources();

  const resourceMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of resources) m.set(r.id, r.name);
    return m;
  }, [resources]);

  // My waitlist entries (filter client-side to this member)
  const myWaitlists = useMemo(() => {
    if (!persona) return [];
    return waitlists.filter((w) => w.member_id === persona.id && w.status === "waiting");
  }, [waitlists, persona]);

  // Confirmed upcoming bookings
  const confirmedUpcoming = useMemo(
    () =>
      bookings.filter((b) => b.status === "confirmed" && isUpcoming(b.during)),
    [bookings],
  );

  async function handleCheckIn(bookingId: string) {
    if (!persona) return;
    setCheckingIn(bookingId);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("check_in", {
        p_actor_id: persona.id,
        p_booking_id: bookingId,
      });
      if (error) {
        toast.error(`Check-in failed: ${error.message}`);
      } else {
        const result = data as { ok?: boolean; reason?: string } | null;
        if (result?.ok === false) {
          toast.error(`Check-in rejected: ${result.reason ?? "Unknown reason"}`);
        } else {
          toast.success("Checked in successfully");
        }
      }
    } finally {
      setCheckingIn(null);
    }
  }

  async function handleCancel(bookingId: string) {
    if (!persona) return;
    const supabase = createClient();
    const { data, error } = await supabase.rpc("cancel_booking", {
      p_actor_id: persona.id,
      p_booking_id: bookingId,
    });
    if (error) {
      toast.error(`Cancel failed: ${error.message}`);
    } else {
      const result = data as { ok?: boolean; reason?: string } | null;
      if (result?.ok === false) {
        toast.error(`Cancel rejected: ${result.reason ?? "Unknown reason"}`);
      } else {
        toast.success("Booking cancelled");
      }
    }
    setCancelId(null);
  }

  async function handleProposeSwap(bookingA: string, bookingB: string) {
    if (!persona) return;
    const supabase = createClient();
    const { data, error } = await supabase.rpc("propose_swap", {
      p_actor_id: persona.id,
      p_booking_a: bookingA,
      p_booking_b: bookingB,
    });
    if (error) {
      toast.error(`Swap failed: ${error.message}`);
      return;
    }
    const result = data as {
      ok?: boolean;
      both_gained?: boolean;
      reason?: string;
      deltas?: unknown;
    } | null;
    if (result?.ok === false) {
      toast.error(`Swap rejected: ${result.reason ?? "Unknown reason"}`);
    } else if (result?.both_gained === true) {
      toast.success("Swap accepted — both parties gained fairness score");
    } else {
      toast.success("Swap proposed successfully");
    }
  }

  if (!hasMounted) {
    return null;
  }

  if (!persona) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          Select a persona from the header to view your bookings.
        </p>
      </Card>
    );
  }

  const loading = bookingsLoading || waitlistsLoading;

  return (
    <div className="space-y-8">
      {/* Section: My bookings */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">My bookings</h2>
          <p className="text-sm text-muted-foreground">
            Upcoming confirmed bookings for {persona.full_name}
          </p>
        </div>

        {loading && confirmedUpcoming.length === 0 ? (
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Loading…</p>
          </Card>
        ) : confirmedUpcoming.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">No upcoming bookings</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {confirmedUpcoming.map((booking) => {
              const resourceName = resourceMap.get(booking.resource_id) ?? "Unknown resource";
              const checkedIn = !!booking.checked_in_at;
              const otherBookings = confirmedUpcoming.filter((b) => b.id !== booking.id);

              return (
                <Card key={booking.id}>
                  <CardHeader className="pb-2 flex flex-row items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{resourceName}</CardTitle>
                      <p className="text-sm text-muted-foreground font-mono">
                        {formatSlot(booking.during)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {checkedIn && (
                        <Badge className="bg-cyan-500 text-white border-0">Checked in</Badge>
                      )}
                      <Badge variant="outline">{booking.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {booking.purpose && (
                      <p className="text-xs text-muted-foreground">
                        Purpose: {booking.purpose}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={checkedIn || checkingIn === booking.id}
                        onClick={() => handleCheckIn(booking.id)}
                        className={
                          checkedIn
                            ? "opacity-50 cursor-not-allowed"
                            : "text-cyan-600 border-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950"
                        }
                      >
                        {checkingIn === booking.id ? "Checking in…" : "Check in"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => setCancelId(booking.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">
                        Propose swap with:
                      </p>
                      <SwapSelect
                        bookingId={booking.id}
                        otherBookings={otherBookings}
                        resourceMap={resourceMap}
                        onSwap={handleProposeSwap}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Section: Waitlist */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">My waitlist</h2>
          <p className="text-sm text-muted-foreground">
            Slots you are queued for
          </p>
        </div>

        {myWaitlists.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">Not on any waitlists</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {myWaitlists.map((entry) => {
              const resourceName = resourceMap.get(entry.resource_id) ?? "Unknown resource";
              return (
                <Card key={entry.id}>
                  <CardHeader className="pb-2 flex flex-row items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{resourceName}</CardTitle>
                      <p className="text-sm text-muted-foreground font-mono">
                        {formatSlot(entry.during)}
                      </p>
                    </div>
                    <Badge variant="secondary">Waitlisted</Badge>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      {entry.rank != null && (
                        <span>
                          Rank: <span className="font-medium text-foreground">#{entry.rank}</span>
                        </span>
                      )}
                      {entry.score != null && (
                        <span>
                          Score:{" "}
                          <span className="font-medium text-foreground">
                            {entry.score.toFixed(2)}
                          </span>
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Cancel confirmation dialog */}
      <AlertDialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will release your slot. If someone is waitlisted they may be automatically
              promoted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => cancelId && handleCancel(cancelId)}
            >
              Cancel booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
