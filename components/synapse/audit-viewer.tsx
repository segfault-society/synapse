"use client";

import { useState } from "react";
import { useAuditLog } from "@/hooks/use-audit-log";
import { ScoreBars } from "@/components/synapse/score-bars";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Explainer } from "@/lib/synapse/types";

const KIND_COLORS: Record<string, string> = {
  book_request: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300",
  cancel: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
  check_in: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  waitlist: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
  no_show: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
  admin_override: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
  rebalance: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300",
};

function kindBadgeClass(kind: string): string {
  return KIND_COLORS[kind] ?? "bg-muted text-muted-foreground";
}

function humanizeKind(kind: string): string {
  return kind.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AuditViewer() {
  const { rows, loading } = useAuditLog(50);
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-4">Loading audit log…</p>;
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No audit entries yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>Time</TableHead>
          <TableHead>Kind</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Resource</TableHead>
          <TableHead>Booking</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const isOpen = openRows.has(row.id);
          const explainer = row.decision_explainer as Explainer | null;
          const payload = row.payload as Record<string, unknown> | null;

          return (
            <Collapsible key={row.id} asChild open={isOpen} onOpenChange={() => toggleRow(row.id)}>
              <>
                <TableRow className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <CollapsibleTrigger asChild>
                      <button
                        className="p-0.5 text-muted-foreground hover:text-foreground"
                        aria-label={isOpen ? "Collapse" : "Expand"}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isOpen ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                  </TableCell>
                  <TableCell
                    className="text-xs tabular-nums text-muted-foreground whitespace-nowrap"
                    onClick={() => toggleRow(row.id)}
                  >
                    {new Date(row.occurred_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </TableCell>
                  <TableCell onClick={() => toggleRow(row.id)}>
                    <Badge className={kindBadgeClass(row.kind)}>
                      {humanizeKind(row.kind)}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="text-xs font-mono text-muted-foreground"
                    onClick={() => toggleRow(row.id)}
                  >
                    {row.actor_id?.slice(0, 8) ?? "—"}
                  </TableCell>
                  <TableCell
                    className="text-xs font-mono text-muted-foreground"
                    onClick={() => toggleRow(row.id)}
                  >
                    {row.resource_id?.slice(0, 8) ?? "—"}
                  </TableCell>
                  <TableCell
                    className="text-xs font-mono text-muted-foreground"
                    onClick={() => toggleRow(row.id)}
                  >
                    {row.booking_id?.slice(0, 8) ?? "—"}
                  </TableCell>
                </TableRow>

                <CollapsibleContent asChild>
                  <tr>
                    <td colSpan={6} className="px-4 pb-4 pt-1">
                      <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-4">
                        {explainer && (
                          <div className="space-y-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Decision explainer — status:{" "}
                              <span className="text-foreground">{explainer.status}</span>
                            </p>

                            {explainer.winner && (
                              <div>
                                <p className="text-xs font-medium mb-1">
                                  Winner: {explainer.winner.name}{" "}
                                  <span className="text-muted-foreground">
                                    ({explainer.winner.role})
                                  </span>{" "}
                                  — score {explainer.winner.score?.toFixed(3) ?? "—"}
                                </p>
                                <ScoreBars components={explainer.winner.components} />
                              </div>
                            )}

                            {(explainer.contenders ?? []).length > 0 && (
                              <div>
                                <p className="text-xs font-medium mb-2 text-muted-foreground">
                                  Contenders
                                </p>
                                <div className="space-y-3">
                                  {(explainer.contenders ?? []).map((c) => (
                                    <div key={c.member_id}>
                                      <p className="text-xs text-muted-foreground mb-1">
                                        {c.name} ({c.role}) — {c.score?.toFixed(3) ?? "—"}
                                      </p>
                                      <ScoreBars components={c.components} />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {payload && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                              Payload
                            </p>
                            <pre className="text-xs font-mono bg-background rounded p-2 overflow-x-auto border border-border/40">
                              {JSON.stringify(payload, null, 2)}
                            </pre>
                          </div>
                        )}

                        {!explainer && !payload && (
                          <p className="text-xs text-muted-foreground">No details.</p>
                        )}
                      </div>
                    </td>
                  </tr>
                </CollapsibleContent>
              </>
            </Collapsible>
          );
        })}
      </TableBody>
    </Table>
  );
}
