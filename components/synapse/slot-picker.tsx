"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface BusyInterval {
  start: Date;
  end: Date;
}

interface SlotPickerProps {
  resourceId: string;
  onSelect: (start: Date, end: Date) => void;
  selected?: { start: Date; end: Date };
}

const BUSINESS_HOUR_START = 8;   // 08:00
const BUSINESS_HOUR_END = 18;    // 18:00 (last slot starts at 17:00)
const DAYS_AHEAD = 7;

/** Parse a PostgreSQL tstzrange string like "[2024-01-01T08:00:00+00,2024-01-01T09:00:00+00)" */
function parseRange(during: unknown): BusyInterval | null {
  if (typeof during !== "string") return null;
  // Strip brackets/parens and split on comma
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

function isBusy(slotStart: Date, slotEnd: Date, busyIntervals: BusyInterval[]): boolean {
  return busyIntervals.some(
    ({ start, end }) => slotStart < end && slotEnd > start,
  );
}

function sameSlot(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Generate all hourly slots for the next DAYS_AHEAD days within business hours */
function generateSlots(): Array<{ start: Date; end: Date }> {
  const slots: Array<{ start: Date; end: Date }> = [];
  const now = new Date();
  // Start from next full hour
  const startBase = new Date(now);
  startBase.setMinutes(0, 0, 0);
  startBase.setHours(startBase.getHours() + 1);

  for (let d = 0; d < DAYS_AHEAD; d++) {
    const day = new Date(startBase);
    day.setDate(day.getDate() + d);

    for (let h = BUSINESS_HOUR_START; h < BUSINESS_HOUR_END; h++) {
      const slotStart = new Date(day);
      slotStart.setHours(h, 0, 0, 0);
      if (slotStart < startBase) continue; // skip past slots
      const slotEnd = new Date(slotStart);
      slotEnd.setHours(h + 1, 0, 0, 0);
      slots.push({ start: slotStart, end: slotEnd });
    }
  }
  return slots;
}

/** Group slots by date label */
function groupByDay(
  slots: Array<{ start: Date; end: Date }>,
): Map<string, Array<{ start: Date; end: Date }>> {
  const map = new Map<string, Array<{ start: Date; end: Date }>>();
  for (const slot of slots) {
    const key = formatDate(slot.start);
    const existing = map.get(key);
    if (existing) {
      existing.push(slot);
    } else {
      map.set(key, [slot]);
    }
  }
  return map;
}

export function SlotPicker({ resourceId, onSelect, selected }: SlotPickerProps) {
  const [busyIntervals, setBusyIntervals] = useState<BusyInterval[]>([]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    async function fetchBusy() {
      const { data } = await supabase
        .from("bookings")
        .select("during")
        .eq("resource_id", resourceId)
        .eq("status", "confirmed");
      if (!active) return;
      const intervals: BusyInterval[] = [];
      for (const row of data ?? []) {
        const interval = parseRange(row.during);
        if (interval) intervals.push(interval);
      }
      setBusyIntervals(intervals);
    }
    void fetchBusy();

    // Realtime subscription to keep busy slots fresh
    const channel = supabase
      .channel(`slot-picker:bookings:${resourceId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `resource_id=eq.${resourceId}` },
        () => { void fetchBusy(); },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [resourceId]);

  const allSlots = useMemo(() => generateSlots(), []);
  const grouped = useMemo(() => groupByDay(allSlots), [allSlots]);

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([dayLabel, daySlots]) => (
        <div key={dayLabel}>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">{dayLabel}</p>
          <div className="flex flex-wrap gap-1.5">
            {daySlots.map(({ start, end }) => {
              const busy = isBusy(start, end, busyIntervals);
              const isSelected =
                selected && sameSlot(selected.start, start) && sameSlot(selected.end, end);

              let slotClass =
                "text-xs px-2.5 py-1 rounded border font-mono transition-colors ";
              if (busy) {
                slotClass +=
                  "bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50";
              } else if (isSelected) {
                slotClass +=
                  "bg-cyan-500 text-white border-cyan-500 cursor-pointer";
              } else {
                slotClass +=
                  "bg-background text-foreground border-border hover:border-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950 cursor-pointer";
              }

              return (
                <button
                  key={start.toISOString()}
                  type="button"
                  disabled={busy}
                  className={slotClass}
                  onClick={() => !busy && onSelect(start, end)}
                  aria-pressed={!!isSelected}
                  aria-label={`${formatDate(start)} ${formatTime(start)}–${formatTime(end)}${busy ? " (busy)" : ""}`}
                >
                  {formatTime(start)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {allSlots.length === 0 && (
        <p className="text-sm text-muted-foreground">No available slots in the next {DAYS_AHEAD} days.</p>
      )}
    </div>
  );
}
