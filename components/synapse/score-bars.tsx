"use client";

import { Progress } from "@/components/ui/progress";
import type { ScoreComponents } from "@/lib/synapse/types";

interface ScoreBarsProps {
  components: ScoreComponents;
}

interface BarConfig {
  key: keyof ScoreComponents;
  label: string;
  deduction?: boolean;
}

const BAR_CONFIG: BarConfig[] = [
  { key: "urgency", label: "Urgency" },
  { key: "role_weight", label: "Role weight" },
  { key: "fairness_deficit", label: "Fairness deficit" },
  { key: "recency_penalty", label: "Recency penalty", deduction: true },
  { key: "academic_purpose", label: "Academic purpose" },
];

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value * 100));
}

export function ScoreBars({ components }: ScoreBarsProps) {
  return (
    <div className="space-y-2">
      {BAR_CONFIG.map(({ key, label, deduction }) => {
        const raw = components[key] ?? 0;
        const pct = clamp(raw);
        return (
          <div key={key} className="grid grid-cols-[140px_1fr_40px] items-center gap-2">
            <span className="text-xs text-muted-foreground truncate">
              {deduction ? (
                <span className="text-amber-500">{label} −</span>
              ) : (
                label
              )}
            </span>
            <Progress
              value={pct}
              className={deduction ? "[&>div]:bg-amber-400" : "[&>div]:bg-cyan-500"}
            />
            <span className="text-xs tabular-nums text-right text-muted-foreground">
              {deduction ? `-${raw.toFixed(2)}` : raw.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
