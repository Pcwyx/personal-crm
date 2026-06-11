import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  birthdayDaysUntil, computeStrength, computeCadence, daysSince, daysUntilDate,
  parseTag, groupTags, followUpDaysPreset, avatarInitials, todayISO,
  TIER_CADENCE,
} from "./utils.js";

describe("birthdayDaysUntil", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0)); // 2026-06-15 local
  });
  afterEach(() => vi.useRealTimers());

  it("returns 0 for today", () => {
    expect(birthdayDaysUntil("06-15")).toBe(0);
  });

  it("returns 1 for tomorrow", () => {
    expect(birthdayDaysUntil("06-16")).toBe(1);
  });

  it("wraps to next year when birthday has passed", () => {
    expect(birthdayDaysUntil("06-14")).toBe(364); // 2027-06-14, 2026 H2 + 2027 H1
  });

  it("handles cross-year boundary (December → January)", () => {
    vi.setSystemTime(new Date(2026, 11, 30, 12, 0, 0)); // Dec 30
    expect(birthdayDaysUntil("01-02")).toBe(3);
  });

  it("maps Feb 29 to Feb 28 in non-leap years", () => {
    vi.setSystemTime(new Date(2027, 0, 1, 12, 0, 0)); // 2027 is not a leap year
    expect(birthdayDaysUntil("02-29")).toBe(58); // → 2027-02-28
  });

  it("keeps Feb 29 in leap years", () => {
    vi.setSystemTime(new Date(2028, 0, 1, 12, 0, 0)); // 2028 is a leap year
    expect(birthdayDaysUntil("02-29")).toBe(59); // → 2028-02-29
  });

  it("returns null for empty or invalid input", () => {
    expect(birthdayDaysUntil(null)).toBeNull();
    expect(birthdayDaysUntil("")).toBeNull();
    expect(birthdayDaysUntil("xx-yy")).toBeNull();
  });
});

describe("daysSince / daysUntilDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("daysSince: today is 0, yesterday is 1", () => {
    expect(daysSince("2026-06-15")).toBe(0);
    expect(daysSince("2026-06-14")).toBe(1);
    expect(daysSince(null)).toBeNull();
  });

  it("daysUntilDate: tomorrow is 1, yesterday is -1", () => {
    expect(daysUntilDate("2026-06-16")).toBe(1);
    expect(daysUntilDate("2026-06-14")).toBe(-1);
    expect(daysUntilDate(null)).toBeNull();
  });
});

describe("computeStrength (tier-based)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("returns 0.5 when never contacted", () => {
    expect(computeStrength({ tier: 1, last_contact: null })).toBe(0.5);
  });

  it("returns 1 when contacted today", () => {
    expect(computeStrength({ tier: 1, last_contact: "2026-06-15" })).toBe(1);
  });

  it("uses tier cadence: T1 halfway at 15 days", () => {
    expect(computeStrength({ tier: 1, last_contact: "2026-05-31" })).toBeCloseTo(0.5);
  });

  it("clamps to 0 beyond cadence", () => {
    expect(computeStrength({ tier: 1, last_contact: "2026-01-01" })).toBe(0);
  });

  it("falls back to 90d cadence without tier", () => {
    expect(computeStrength({ last_contact: "2026-05-01" })).toBeCloseTo(1 - 45 / 90);
  });

  it("TIER_CADENCE mapping is 30/60/90/180", () => {
    expect(TIER_CADENCE).toEqual({ 1: 30, 2: 60, 3: 90, 4: 180 });
  });
});

describe("computeCadence (legacy relationship-based)", () => {
  it("defaults to 90 for empty", () => {
    expect(computeCadence([])).toBe(90);
    expect(computeCadence(null)).toBe(90);
  });

  it("strictest relationship wins", () => {
    expect(computeCadence(["Family", "Network"])).toBe(30);
    expect(computeCadence(["Mentor", "Friend"])).toBe(45);
  });

  it("unknown relationship falls back to 90", () => {
    expect(computeCadence(["Stranger"])).toBe(90);
  });
});

describe("structured tags", () => {
  it("parseTag splits namespace:value", () => {
    expect(parseTag("industry:tech")).toEqual({ namespace: "industry", value: "tech" });
    expect(parseTag("plain")).toEqual({ namespace: null, value: "plain" });
    expect(parseTag("a:b:c")).toEqual({ namespace: "a", value: "b:c" });
  });

  it("groupTags separates general and structured", () => {
    const { general, structured } = groupTags(["vip", "industry:tech", "industry:vc", "location:taipei"]);
    expect(general).toEqual(["vip"]);
    expect(structured.industry.map(t => t.value)).toEqual(["tech", "vc"]);
    expect(structured.location.map(t => t.value)).toEqual(["taipei"]);
  });

  it("groupTags tolerates null/empty", () => {
    expect(groupTags(null)).toEqual({ general: [], structured: {} });
  });
});

describe("followUpDaysPreset", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("maps presets to ISO dates", () => {
    expect(followUpDaysPreset("3d")).toBe("2026-06-18");
    expect(followUpDaysPreset("1w")).toBe("2026-06-22");
    expect(followUpDaysPreset("1m")).toBe("2026-07-15");
  });

  it("returns null for unknown preset", () => {
    expect(followUpDaysPreset("nope")).toBeNull();
    expect(followUpDaysPreset("")).toBeNull();
  });
});

describe("misc helpers", () => {
  it("avatarInitials takes first letters of first two words", () => {
    expect(avatarInitials("Patrick Chung")).toBe("PC");
    expect(avatarInitials("王小明")).toBe("王");
    expect(avatarInitials("")).toBe("?");
  });

  it("todayISO is YYYY-MM-DD in local time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 5, 12, 0, 0));
    expect(todayISO()).toBe("2026-01-05");
    vi.useRealTimers();
  });
});
