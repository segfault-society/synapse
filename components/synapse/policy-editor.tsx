"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePolicy } from "@/hooks/use-policy";
import { usePersonaStore } from "@/lib/store/persona-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { PolicyRow } from "@/lib/synapse/types";

function humanizeLabel(label: string | null, key: string): string {
  if (label) return label;
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function humanizeCategory(cat: string | null): string {
  if (!cat) return "General";
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PolicyEditor() {
  const { rows, loading, refetch } = usePolicy();
  const { persona } = usePersonaStore();

  // Local edits: key → numeric string
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground py-4">Loading policy settings…</p>
    );
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No policy settings found.</p>;
  }

  // Group by category
  const byCategory: Record<string, PolicyRow[]> = {};
  for (const row of rows) {
    const cat = row.category ?? "general";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(row);
  }

  const handleSave = async (row: PolicyRow) => {
    if (!persona) {
      toast.error("No persona selected");
      return;
    }
    const rawVal = edits[row.key];
    const numVal = rawVal !== undefined ? parseFloat(rawVal) : (row.numeric_value ?? 0);
    if (isNaN(numVal)) {
      toast.error(`Invalid number for "${humanizeLabel(row.label, row.key)}"`);
      return;
    }

    setSaving((s) => ({ ...s, [row.key]: true }));
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("update_policy", {
        p_actor_id: persona.id,
        p_key: row.key,
        p_value: numVal,
      });
      if (error) {
        toast.error(`Save failed: ${error.message}`);
      } else {
        const result = data as { ok: boolean; reason?: string };
        if (result?.ok) {
          toast.success(`Saved "${humanizeLabel(row.label, row.key)}" → ${numVal}`);
          setEdits((e) => {
            const next = { ...e };
            delete next[row.key];
            return next;
          });
          await refetch();
        } else {
          toast.error(result?.reason ?? "Not authorised");
        }
      }
    } finally {
      setSaving((s) => ({ ...s, [row.key]: false }));
    }
  };

  return (
    <div className="space-y-8">
      {Object.entries(byCategory).map(([cat, catRows]) => (
        <div key={cat}>
          <h3 className="text-sm font-semibold text-cyan-600 uppercase tracking-wide mb-4">
            {humanizeCategory(cat)}
          </h3>
          <div className="space-y-3">
            {catRows.map((row) => {
              const currentVal =
                edits[row.key] !== undefined
                  ? edits[row.key]
                  : String(row.numeric_value ?? 0);
              const isDirty = edits[row.key] !== undefined;

              return (
                <div
                  key={row.key}
                  className="flex items-center gap-3 rounded-lg border border-border/60 px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {humanizeLabel(row.label, row.key)}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">{row.key}</p>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    value={currentVal}
                    onChange={(e) =>
                      setEdits((prev) => ({ ...prev, [row.key]: e.target.value }))
                    }
                    className="w-28 text-right tabular-nums"
                  />
                  <Button
                    size="sm"
                    variant={isDirty ? "default" : "outline"}
                    disabled={saving[row.key] || !isDirty}
                    onClick={() => handleSave(row)}
                    className={isDirty ? "bg-cyan-600 hover:bg-cyan-700 text-white" : undefined}
                  >
                    {saving[row.key] ? "Saving…" : "Save"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
