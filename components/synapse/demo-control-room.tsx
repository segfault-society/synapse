"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useResources } from "@/hooks/use-resources";
import { usePersonaStore } from "@/lib/store/persona-store";
import type { Explainer, ScoredMember } from "@/lib/synapse/types";
import { ScoreBars } from "@/components/synapse/score-bars";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── helpers ─────────────────────────────────────────────────────────────────

/** Returns local YYYY-MM-DDTHH:MM strings for tomorrow 14:00 and 15:00. */
function defaultSlot(): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const y = tomorrow.getFullYear();
  const m = pad(tomorrow.getMonth() + 1);
  const d = pad(tomorrow.getDate());
  const localStart = `${y}-${m}-${d}T14:00`;
  const localEnd = `${y}-${m}-${d}T15:00`;
  return { start: localStart, end: localEnd };
}

const DEFAULT_NAMES = ["Sarah", "Mihir", "Dr. Perera"];

/** A contender row from simulate_contention: a scored member plus its rank. */
type RankedContender = Partial<ScoredMember> & { rank?: number };

// ── component ────────────────────────────────────────────────────────────────

export function DemoControlRoom() {
  // ── data ──
  const { resources, loading: resourcesLoading } = useResources();
  const personas = usePersonaStore((s) => s.personas);
  const loadPersonas = usePersonaStore((s) => s.loadPersonas);

  useEffect(() => {
    loadPersonas();
  }, [loadPersonas]);

  // ── form state ──
  const [resourceId, setResourceId] = useState<string>("");
  const defaults = useMemo(() => defaultSlot(), []);
  const [startVal, setStartVal] = useState<string>(defaults.start);
  const [endVal, setEndVal] = useState<string>(defaults.end);

  // default-checked member IDs: those whose name matches DEFAULT_NAMES
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const seeded = useRef(false);

  // seed defaults once personas load (runs only once)
  useEffect(() => {
    if (seeded.current || !personas.length) return;
    seeded.current = true;
    const ids = personas
      .filter((p) =>
        DEFAULT_NAMES.some((n) => p.full_name?.toLowerCase().includes(n.toLowerCase()))
      )
      .map((p) => p.id);
    setSelectedIds(new Set(ids));
  }, [personas]);

  // ── fire state ──
  const [firing, setFiring] = useState(false);
  const [explainer, setExplainer] = useState<Explainer | null>(null);

  // ── handlers ──
  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const canFire = resourceId.length > 0 && selectedIds.size >= 2 && !firing;

  async function handleFire() {
    if (!canFire) return;
    setFiring(true);
    setExplainer(null);
    try {
      const supabase = createClient();
      const start = new Date(startVal).toISOString();
      const end = new Date(endVal).toISOString();
      const { data, error } = await supabase.rpc("simulate_contention", {
        p_resource_id: resourceId,
        p_start: start,
        p_end: end,
        p_member_ids: Array.from(selectedIds),
      });
      if (error) {
        toast.error(error.message ?? "Simulation failed");
        return;
      }
      setExplainer((data as unknown as Explainer) ?? null);
    } finally {
      setFiring(false);
    }
  }

  // ── derived ──
  // Contenders carry the full member identity (name/role) plus a `rank` from
  // simulate_contention. Keep name/role optional + rank optional for crash-safety.
  const contenders: RankedContender[] = explainer?.contenders ?? [];
  const counterfactuals = explainer?.counterfactuals ?? [];
  const winner = explainer?.winner ?? null;

  // ── render ──
  return (
    <div className="space-y-8">
      {/* ── Controls ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Simulation controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resource picker */}
          <div className="space-y-1.5">
            <Label htmlFor="resource-select">Resource</Label>
            <Select
              value={resourceId}
              onValueChange={setResourceId}
              disabled={resourcesLoading}
            >
              <SelectTrigger id="resource-select" className="w-full sm:w-72">
                <SelectValue placeholder={resourcesLoading ? "Loading…" : "Pick a resource"} />
              </SelectTrigger>
              <SelectContent>
                {resources.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Slot */}
          <div className="space-y-1.5">
            <Label>Time slot</Label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Start</span>
                <Input
                  type="datetime-local"
                  value={startVal}
                  onChange={(e) => setStartVal(e.target.value)}
                  className="w-52"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">End</span>
                <Input
                  type="datetime-local"
                  value={endVal}
                  onChange={(e) => setEndVal(e.target.value)}
                  className="w-52"
                />
              </div>
            </div>
          </div>

          {/* Member multi-select */}
          <div className="space-y-1.5">
            <Label>Contenders ({selectedIds.size} selected)</Label>
            <p className="text-xs text-muted-foreground">
              Select at least 2 members to fire simultaneous requests.
            </p>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {personas.map((p) => {
                const checked = selectedIds.has(p.id);
                return (
                  <label
                    key={p.id}
                    className={[
                      "flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer text-sm transition-colors",
                      checked
                        ? "border-cyan-500/60 bg-cyan-500/5"
                        : "border-border hover:border-cyan-500/30",
                    ].join(" ")}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleMember(p.id)}
                    />
                    <span className="flex-1 truncate">{p.full_name}</span>
                    <span className="text-xs text-muted-foreground truncate">{p.role}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Fire button */}
          <div className="flex items-center gap-4 pt-2">
            <Button
              onClick={handleFire}
              disabled={!canFire}
              className="bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40"
            >
              {firing ? "Simulating…" : "Fire simultaneous requests"}
            </Button>
            {!canFire && !firing && (
              <p className="text-xs text-muted-foreground">
                Select a resource and at least 2 members to proceed.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Results ───────────────────────────────────────────────────── */}
      {explainer && (
        <div className="space-y-6">
          {/* Caption */}
          <p className="text-sm text-muted-foreground italic border-l-2 border-cyan-500 pl-3">
            All requests arrived together — the winner is chosen by score, not arrival time.
          </p>

          {/* Winner card */}
          {winner && (
            <Card className="border-cyan-500/40 bg-cyan-500/5">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    Winner
                    <Badge className="bg-cyan-600 text-white text-xs">
                      {winner.name}
                    </Badge>
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {winner.role} · total score{" "}
                    <span className="font-semibold text-foreground">
                      {winner.score.toFixed(3)}
                    </span>
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <ScoreBars components={winner.components ?? ({} as any)} />
              </CardContent>
            </Card>
          )}

          {/* Ranked contenders */}
          {contenders.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                All contenders (ranked)
              </h3>
              {contenders.map((c, i) => (
                <Card key={c.member_id ?? i} className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <span className="text-muted-foreground">#{c.rank ?? i + 1}</span>
                        <span>{c.name ?? "Member"}</span>
                        {c.member_id === winner?.member_id && (
                          <Badge className="bg-cyan-600 text-white text-xs">Winner</Badge>
                        )}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground">
                        {c.role} · score{" "}
                        <span className="font-semibold text-foreground">
                          {(c.score ?? 0).toFixed(3)}
                        </span>
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScoreBars components={c.components ?? ({} as any)} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Counterfactuals */}
          {counterfactuals.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Counterfactuals
              </h3>
              <div className="rounded-md border divide-y">
                {counterfactuals.map((cf, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-2.5 text-sm"
                  >
                    <span className="text-muted-foreground">{cf.label}</span>
                    <span className="tabular-nums font-medium">
                      {cf.score.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
