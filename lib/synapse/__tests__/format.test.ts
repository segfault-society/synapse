import { describe, it, expect } from "vitest";
import {
  humanizeResourceClass,
  humanizeRole,
  parseTstzrange,
  formatSlot,
  toScorePct,
  toStringArray,
} from "@/lib/synapse/format";

// ---------------------------------------------------------------------------
// humanizeResourceClass
// ---------------------------------------------------------------------------
describe("humanizeResourceClass", () => {
  it('converts "computer_lab" to "Computer Lab"', () => {
    expect(humanizeResourceClass("computer_lab")).toBe("Computer Lab");
  });

  it('converts "study_room" to "Study Room"', () => {
    expect(humanizeResourceClass("study_room")).toBe("Study Room");
  });

  it('converts "meeting_room" to "Meeting Room"', () => {
    expect(humanizeResourceClass("meeting_room")).toBe("Meeting Room");
  });

  it('converts a single word "lab" to "Lab"', () => {
    expect(humanizeResourceClass("lab")).toBe("Lab");
  });

  it("falls back to title-case splitting for unknown values", () => {
    expect(humanizeResourceClass("multimedia_equipment")).toBe("Multimedia Equipment");
  });

  it("handles multiple underscores in an unmapped value", () => {
    expect(humanizeResourceClass("a_b_c")).toBe("A B C");
  });
});

// ---------------------------------------------------------------------------
// humanizeRole
// ---------------------------------------------------------------------------
describe("humanizeRole", () => {
  it('converts "lab_manager" to "Lab Manager"', () => {
    expect(humanizeRole("lab_manager")).toBe("Lab Manager");
  });

  it('converts "student" to "Student"', () => {
    expect(humanizeRole("student")).toBe("Student");
  });

  it('converts "faculty_member" to "Faculty Member"', () => {
    expect(humanizeRole("faculty_member")).toBe("Faculty Member");
  });

  it('converts "admin" to "Admin"', () => {
    expect(humanizeRole("admin")).toBe("Admin");
  });
});

// ---------------------------------------------------------------------------
// parseTstzrange
// ---------------------------------------------------------------------------
describe("parseTstzrange", () => {
  it("parses a valid range with square-bracket/paren notation", () => {
    const result = parseTstzrange('["2026-06-24 14:00:00+00","2026-06-24 15:00:00+00")');
    expect(result).not.toBeNull();
    expect(result!.start).toEqual(new Date("2026-06-24T14:00:00+00:00"));
    expect(result!.end).toEqual(new Date("2026-06-24T15:00:00+00:00"));
  });

  it("parses a fully inclusive range with square brackets on both sides", () => {
    const result = parseTstzrange('["2026-06-24 09:00:00+00","2026-06-24 10:00:00+00"]');
    expect(result).not.toBeNull();
    expect(result!.start).toEqual(new Date("2026-06-24T09:00:00+00:00"));
    expect(result!.end).toEqual(new Date("2026-06-24T10:00:00+00:00"));
  });

  it("parses a range with parentheses (exclusive) on both sides", () => {
    const result = parseTstzrange('("2026-06-24 08:00:00+00","2026-06-24 09:00:00+00")');
    expect(result).not.toBeNull();
    expect(result!.start).toEqual(new Date("2026-06-24T08:00:00+00:00"));
  });

  it("returns null for null input", () => {
    expect(parseTstzrange(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(parseTstzrange(undefined)).toBeNull();
  });

  it("returns null for a number input", () => {
    expect(parseTstzrange(12345)).toBeNull();
  });

  it("returns null for an object input", () => {
    expect(parseTstzrange({ start: "2026-06-24" })).toBeNull();
  });

  it("returns null for a string without a comma separator", () => {
    expect(parseTstzrange("[2026-06-24T14:00:00Z]")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseTstzrange("")).toBeNull();
  });

  it("returns null for a malformed date string (NaN)", () => {
    expect(parseTstzrange("[not-a-date,not-a-date]")).toBeNull();
  });

  it("returns null for a partially malformed range (bad end date)", () => {
    expect(parseTstzrange('["2026-06-24 14:00:00+00","not-a-date")')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// formatSlot
// ---------------------------------------------------------------------------
describe("formatSlot", () => {
  it("returns a non-empty human label for a valid range", () => {
    const label = formatSlot('["2026-06-24 14:00:00+00","2026-06-24 15:00:00+00")');
    expect(label).not.toBe("Unknown time");
    expect(label.length).toBeGreaterThan(0);
    // Should contain the time separator character
    expect(label).toContain("–");
  });

  it('returns "Unknown time" for null input', () => {
    expect(formatSlot(null)).toBe("Unknown time");
  });

  it('returns "Unknown time" for undefined input', () => {
    expect(formatSlot(undefined)).toBe("Unknown time");
  });

  it('returns "Unknown time" for a malformed string', () => {
    expect(formatSlot("not-a-range")).toBe("Unknown time");
  });

  it('returns "Unknown time" for an empty string', () => {
    expect(formatSlot("")).toBe("Unknown time");
  });
});

// ---------------------------------------------------------------------------
// toScorePct
// ---------------------------------------------------------------------------
describe("toScorePct", () => {
  it("converts 0 to 0", () => {
    expect(toScorePct(0)).toBe(0);
  });

  it("converts 0.5 to 50", () => {
    expect(toScorePct(0.5)).toBe(50);
  });

  it("converts 1 to 100", () => {
    expect(toScorePct(1)).toBe(100);
  });

  it("clamps 1.5 to 100", () => {
    expect(toScorePct(1.5)).toBe(100);
  });

  it("clamps -0.1 to 0", () => {
    expect(toScorePct(-0.1)).toBe(0);
  });

  it("treats null as 0", () => {
    expect(toScorePct(null)).toBe(0);
  });

  it("treats undefined as 0", () => {
    expect(toScorePct(undefined)).toBe(0);
  });

  it("converts 0.25 to 25", () => {
    expect(toScorePct(0.25)).toBe(25);
  });
});

// ---------------------------------------------------------------------------
// toStringArray
// ---------------------------------------------------------------------------
describe("toStringArray", () => {
  it("returns all strings from an all-string array", () => {
    expect(toStringArray(["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("filters out non-string items from a mixed array", () => {
    expect(toStringArray([1, "b", null, "c"])).toEqual(["b", "c"]);
  });

  it("returns empty array for null", () => {
    expect(toStringArray(null)).toEqual([]);
  });

  it("returns empty array for undefined", () => {
    expect(toStringArray(undefined)).toEqual([]);
  });

  it("returns empty array for a plain object", () => {
    expect(toStringArray({ key: "value" })).toEqual([]);
  });

  it("returns empty array for a plain string (not an array)", () => {
    expect(toStringArray("string")).toEqual([]);
  });

  it("returns empty array for a number", () => {
    expect(toStringArray(42)).toEqual([]);
  });

  it("returns empty array for an all-non-string array", () => {
    expect(toStringArray([1, 2, 3, null, false])).toEqual([]);
  });
});
