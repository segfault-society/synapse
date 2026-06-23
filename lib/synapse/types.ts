import type { Database } from "@/lib/types/database.types";

export type Member = Database["public"]["Tables"]["members"]["Row"];
export type Resource = Database["public"]["Tables"]["resources"]["Row"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type Waitlist = Database["public"]["Tables"]["waitlists"]["Row"];
export type FairnessRow = Database["public"]["Tables"]["fairness_ledger"]["Row"];
export type AuditRow = Database["public"]["Tables"]["audit_log"]["Row"];
export type PolicyRow = Database["public"]["Tables"]["policy_settings"]["Row"];

export interface ScoreComponents {
  urgency: number; role_weight: number; fairness_deficit: number;
  recency_penalty: number; academic_purpose: number;
}
export interface ScoredMember {
  member_id: string; name: string; role: string; score: number; components: ScoreComponents;
}
export interface Counterfactual { kind: string; label: string; resource?: string; score: number; }
export interface Explainer {
  status: string; winner: ScoredMember;
  contenders: ScoredMember[]; counterfactuals: Counterfactual[];
}
export interface Decision {
  status: "confirmed" | "confirmed_by_priority" | "waitlisted" | "rejected" | "idempotent_replay";
  booking_id?: string; rank?: number; demoted?: string[]; ahead_of?: string[];
  reason?: string; explainer?: Explainer;
}
