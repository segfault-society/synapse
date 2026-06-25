"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SynapseHeader } from "@/components/synapse/synapse-header";
import { BookingForm } from "@/components/synapse/booking-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBookings } from "@/hooks/use-bookings";
import { useWaitlists } from "@/hooks/use-waitlists";
import type { Resource } from "@/lib/synapse/types";
import type { Json } from "@/lib/types/database.types";
import { MapPin, Users, Clock, ListOrdered } from "lucide-react";

function humanizeClass(cls: string): string {
  return cls
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function toStringArray(value: Json): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function formatRange(during: unknown): string {
  if (typeof during !== "string") return "—";
  const inner = during.replace(/^[\[(]/, "").replace(/[\])]$/, "");
  const comma = inner.indexOf(",");
  if (comma === -1) return "—";
  const start = new Date(inner.slice(0, comma).trim());
  const end = new Date(inner.slice(comma + 1).trim());
  if (isNaN(start.getTime())) return "—";
  const dateStr = start.toLocaleDateString("en-AU", {
    weekday: "short", month: "short", day: "numeric",
  });
  const startTime = start.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false });
  const endTime = end.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${dateStr} ${startTime}–${endTime}`;
}

export default function ResourceDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const [resource, setResource] = useState<Resource | null>(null);
  const [resourceLoading, setResourceLoading] = useState(true);

  const { bookings } = useBookings();
  const { waitlists } = useWaitlists(id);

  const confirmedBookings = bookings.filter(
    (b) => b.resource_id === id && b.status === "confirmed",
  );

  useEffect(() => {
    if (!id) return;
    let active = true;
    async function fetchResource() {
      setResourceLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("resources")
        .select("*")
        .eq("id", id)
        .single();
      if (active) {
        setResource(data ?? null);
        setResourceLoading(false);
      }
    }
    void fetchResource();
    return () => { active = false; };
  }, [id]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SynapseHeader />

      <main className="container mx-auto px-4 py-8 flex-1 space-y-6 max-w-3xl">
        {/* Resource header */}
        {resourceLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : resource ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{resource.name}</h1>
              <Badge
                variant={resource.is_available ? "secondary" : "outline"}
                className={resource.is_available ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : ""}
              >
                {resource.is_available ? "Available" : "Unavailable"}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="font-medium text-foreground">{humanizeClass(resource.resource_class)}</span>
              </span>
              {resource.building && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {resource.building}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 shrink-0" />
                {resource.capacity} {resource.capacity === 1 ? "seat" : "seats"}
              </span>
            </div>

            {toStringArray(resource.equipment).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {toStringArray(resource.equipment).map((item) => (
                  <Badge key={item} variant="outline" className="text-xs">
                    {item}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">Resource not found.</p>
        )}

        {/* Booking form */}
        {resource && <BookingForm resourceId={id} />}

        {/* Live bookings & waitlist */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Current confirmed bookings */}
          <Card>
            <CardHeader className="pb-2">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-cyan-500" />
                Current bookings
                <Badge variant="secondary" className="ml-auto text-xs">
                  {confirmedBookings.length}
                </Badge>
              </h3>
            </CardHeader>
            <CardContent className="space-y-2">
              {confirmedBookings.length === 0 ? (
                <p className="text-xs text-muted-foreground">No confirmed bookings.</p>
              ) : (
                confirmedBookings.map((b) => (
                  <div
                    key={b.id}
                    className="rounded border bg-muted/30 px-2.5 py-1.5 text-xs space-y-0.5"
                  >
                    <p className="font-mono text-foreground">{formatRange(b.during)}</p>
                    {b.purpose && (
                      <p className="text-muted-foreground truncate">{b.purpose}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Waitlist */}
          <Card>
            <CardHeader className="pb-2">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <ListOrdered className="h-4 w-4 text-amber-500" />
                Waitlist
                <Badge variant="secondary" className="ml-auto text-xs">
                  {waitlists.filter((w) => w.status === "waiting").length}
                </Badge>
              </h3>
            </CardHeader>
            <CardContent className="space-y-2">
              {waitlists.filter((w) => w.status === "waiting").length === 0 ? (
                <p className="text-xs text-muted-foreground">No one waiting.</p>
              ) : (
                waitlists
                  .filter((w) => w.status === "waiting")
                  .map((w) => (
                    <div
                      key={w.id}
                      className="rounded border bg-muted/30 px-2.5 py-1.5 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-foreground truncate">
                          {formatRange(w.during)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {w.rank != null && (
                          <Badge variant="outline" className="text-xs">
                            #{w.rank}
                          </Badge>
                        )}
                        {w.score != null && (
                          <span className="text-muted-foreground tabular-nums">
                            {(w.score as number).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
