/**
 * Pure formatting helpers for the Synapse UI.
 * No React, no side effects — safe to import in tests and server code.
 */

/** Convert a snake_case resource class to a human-readable label.
 *  e.g. "computer_lab" → "Computer Lab"
 */
export function humanizeResourceClass(rc: string): string {
  return rc
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Convert a snake_case role string to a human-readable label.
 *  e.g. "lab_manager" → "Lab Manager"
 */
export function humanizeRole(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Parse a PostgreSQL tstzrange string like `["2026-06-24 14:00:00+00","2026-06-24 15:00:00+00")`.
 *  Returns null on null / non-string / malformed / NaN dates.
 */
export function parseTstzrange(during: unknown): { start: Date; end: Date } | null {
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

/** Format a tstzrange value as a human-readable time slot label.
 *  Returns "Unknown time" when the value cannot be parsed.
 */
export function formatSlot(during: unknown): string {
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

/** Convert a 0–1 score fraction to a 0–100 percentage, clamped to [0, 100].
 *  Null / undefined inputs are treated as 0.
 */
export function toScorePct(value: number | null | undefined): number {
  return Math.min(100, Math.max(0, (value ?? 0) * 100));
}

/** Safely coerce a JSON value to a string array, filtering out non-string items. */
export function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((item): item is string => typeof item === "string");
}
