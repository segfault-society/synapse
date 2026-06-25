"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFairness } from "@/hooks/use-fairness";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Member, FairnessRow } from "@/lib/synapse/types";

function humanizeClass(cls: string): string {
  return cls.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function FairnessDashboard() {
  const { rows, loading } = useFairness();
  const [memberMap, setMemberMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("members")
      .select("id, full_name")
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, string> = {};
        for (const m of data) map[m.id] = m.full_name;
        setMemberMap(map);
      });
  }, []);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground py-4">Loading fairness data…</p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No fairness data yet. Run a rebalance in the Ops tab.
      </p>
    );
  }

  // Group by resource_class
  const byClass: Record<string, FairnessRow[]> = {};
  for (const row of rows) {
    const cls = row.resource_class as string;
    if (!byClass[cls]) byClass[cls] = [];
    byClass[cls].push(row);
  }

  return (
    <div className="space-y-8">
      {Object.entries(byClass).map(([cls, classRows]) => {
        const maxServed = Math.max(...classRows.map((r) => r.served_hours), 1);
        const maxFair = Math.max(...classRows.map((r) => r.fair_share), 1);
        const maxBar = Math.max(maxServed, maxFair);

        return (
          <div key={cls}>
            <h3 className="text-sm font-semibold text-cyan-600 uppercase tracking-wide mb-3">
              {humanizeClass(cls)}
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Served (h)</TableHead>
                  <TableHead>Fair share (h)</TableHead>
                  <TableHead className="w-40">Bars</TableHead>
                  <TableHead>γ term</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classRows.map((row) => {
                  const name = memberMap[row.member_id] ?? row.member_id.slice(0, 8);
                  const gamma = row.fairness_term;
                  const isUnder = gamma > 0.3;
                  const isOver = gamma < 0.05 && row.served_hours > row.fair_share;

                  return (
                    <TableRow
                      key={row.id}
                      className={
                        isUnder
                          ? "bg-cyan-50/50 dark:bg-cyan-950/20"
                          : isOver
                          ? "bg-amber-50/50 dark:bg-amber-950/20"
                          : undefined
                      }
                    >
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell className="tabular-nums">
                        {row.served_hours.toFixed(1)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.fair_share.toFixed(1)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[120px]">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] w-10 text-muted-foreground">
                              Served
                            </span>
                            <Progress
                              value={(row.served_hours / maxBar) * 100}
                              className="h-1.5 [&>div]:bg-amber-400"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] w-10 text-muted-foreground">
                              Fair
                            </span>
                            <Progress
                              value={(row.fair_share / maxBar) * 100}
                              className="h-1.5 [&>div]:bg-cyan-500"
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums font-mono text-xs">
                        {gamma.toFixed(3)}
                      </TableCell>
                      <TableCell>
                        {isUnder ? (
                          <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300">
                            Under-served
                          </Badge>
                        ) : isOver ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300">
                            Over-served
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Balanced
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        );
      })}
    </div>
  );
}
