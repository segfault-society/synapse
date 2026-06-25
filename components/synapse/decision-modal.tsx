"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreBars } from "@/components/synapse/score-bars";
import type { Decision, ScoredMember } from "@/lib/synapse/types";
import { humanizeRole } from "@/lib/synapse/format";

interface DecisionModalProps {
  decision: Decision | null;
  open: boolean;
  onClose: () => void;
}

function statusHeader(decision: Decision): { icon: string; label: string; color: string } {
  switch (decision.status) {
    case "confirmed":
      return { icon: "✓", label: "Confirmed", color: "text-green-600" };
    case "confirmed_by_priority":
      return { icon: "✓", label: "Confirmed by priority", color: "text-green-600" };
    case "waitlisted":
      return {
        icon: "⏳",
        label: `Waitlisted${decision.rank != null ? ` (rank ${decision.rank})` : ""}`,
        color: "text-amber-500",
      };
    case "rejected":
      return { icon: "✕", label: "Rejected", color: "text-red-500" };
    case "idempotent_replay":
      return { icon: "↩", label: "Already submitted", color: "text-muted-foreground" };
    default:
      return { icon: "?", label: String(decision.status), color: "text-muted-foreground" };
  }
}

function MemberScoreBlock({ member, label }: { member: ScoredMember; label?: string }) {
  return (
    <div className="rounded-md border bg-muted/40 p-3 space-y-2">
      {label && <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>}
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium text-sm">{member.name}</span>
        <span className="text-xs text-muted-foreground">{humanizeRole(member.role)}</span>
        <Badge variant="secondary" className="ml-auto text-xs tabular-nums">
          {member.score.toFixed(3)}
        </Badge>
      </div>
      <ScoreBars components={member.components} />
    </div>
  );
}

export function DecisionModal({ decision, open, onClose }: DecisionModalProps) {
  if (!decision) return null;

  const { icon, label, color } = statusHeader(decision);
  // For idempotent_replay, fall through to use the inner explainer if present
  const explainer = decision.explainer ?? null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className={`text-xl flex items-center gap-2 ${color}`}>
            <span>{icon}</span>
            <span>{label}</span>
          </DialogTitle>
          <DialogDescription>
            How SYNAPSE reached this decision — priority scores and alternatives.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Rejection reason */}
          {decision.status === "rejected" && decision.reason && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md px-3 py-2">
              {decision.reason}
            </p>
          )}

          {/* Waitlist context */}
          {decision.status === "waitlisted" && (
            <p className="text-sm text-muted-foreground">
              Your request has been queued. You will be notified if a slot becomes available.
            </p>
          )}

          {/* Explainer body */}
          {explainer && (
            <>
              {/* Winner */}
              {explainer.winner && <MemberScoreBlock member={explainer.winner} label="Allocated to" />}

              {/* Other contenders */}
              {(explainer.contenders ?? []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Other applicants
                  </p>
                  {(explainer.contenders ?? []).map((c) => (
                    <MemberScoreBlock key={c.member_id} member={c} />
                  ))}
                </div>
              )}

              {/* Why this outcome */}
              {explainer.winner && (
                <div className="rounded-md border border-cyan-200 bg-cyan-50/50 dark:bg-cyan-900/10 dark:border-cyan-800 px-3 py-2 text-sm">
                  <p className="font-medium text-cyan-700 dark:text-cyan-400 mb-0.5">Why this outcome</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {explainer.winner.name} received this slot because they had the highest
                    composite priority score ({explainer.winner.score.toFixed(3)}) among all
                    applicants for this time window, accounting for role weight, fairness history,
                    and request urgency.
                  </p>
                </div>
              )}

              {/* Counterfactuals */}
              {(explainer.counterfactuals ?? []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    What-if scenarios
                  </p>
                  {(explainer.counterfactuals ?? []).map((cf, idx) => (
                    <div
                      key={idx}
                      className="rounded-md border bg-muted/30 px-3 py-2 flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{cf.label}</p>
                        {cf.resource && (
                          <p className="text-xs text-muted-foreground mt-0.5">{cf.resource}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs tabular-nums shrink-0">
                        {cf.score.toFixed(3)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
