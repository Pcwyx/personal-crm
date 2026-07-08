import { describe, it, expect } from "vitest";
import { parseCSV, parseVCard, detectDuplicates } from "./importers.js";

describe("parseCSV", () => {
  it("round-trips the app export format", () => {
    const csv = [
      '"name","relationship","role","company","location","phone","email","birthday","lastContact","nextFollowUp","followUpNote","bio","notes","tags","linkedin","twitter","instagram"',
      '"王小明","Friend;School","PM","Acme","Taipei","+886912345678","ming@acme.com","05-14","2026-06-01","2026-07-01","聊 side project","老朋友","備註","industry:tech;vip","ming","",""',
    ].join("\n");
    const [c] = parseCSV(csv);
    expect(c.name).toBe("王小明");
    expect(c.relationship).toEqual(["Friend", "School"]);
    expect(c.email).toBe("ming@acme.com");
    expect(c.birthday).toBe("05-14");
    expect(c.last_contact).toBe("2026-06-01");
    expect(c.next_follow_up).toBe("2026-07-01");
    expect(c.tags).toEqual(["industry:tech", "vip"]);
    expect(c.social.linkedin).toBe("ming");
  });

  it("handles quoted commas and escaped quotes", () => {
    const csv = 'name,notes\n"Chung, Patrick","said ""hi"" twice"';
    const [c] = parseCSV(csv);
    expect(c.name).toBe("Chung, Patrick");
    expect(c.notes).toBe('said "hi" twice');
  });

  it("strips formula-injection guard quote", () => {
    const csv = "name,notes\n\"'=SUM(A1)\",ok";
    expect(parseCSV(csv)[0].name).toBe("=SUM(A1)");
  });

  it("rejects invalid dates and birthdays", () => {
    const csv = "name,birthday,lastContact\nAmy,May 14,yesterday";
    const [c] = parseCSV(csv);
    expect(c.birthday).toBeNull();
    expect(c.last_contact).toBeNull();
  });

  it("returns [] without a name column or rows", () => {
    expect(parseCSV("foo,bar\n1,2")).toEqual([]);
    expect(parseCSV("name")).toEqual([]);
  });
});

describe("parseVCard", () => {
  it("parses a standard 3.0 card", () => {
    const vcf = [
      "BEGIN:VCARD", "VERSION:3.0",
      "FN:王小明", "N:王;小明;;;",
      "ORG:Acme Inc.", "TITLE:PM",
      "TEL;TYPE=CELL:+886912345678",
      "EMAIL:ming@acme.com",
      "BDAY:1990-05-14",
      "CATEGORIES:Friend,School",
      "NOTE:老朋友\\, 大學同學\\n很會煮飯",
      "END:VCARD",
    ].join("\r\n");
    const [c] = parseVCard(vcf);
    expect(c.name).toBe("王小明");
    expect(c.company).toBe("Acme Inc.");
    expect(c.phone).toBe("+886912345678");
    expect(c.birthday).toBe("05-14");
    expect(c.relationship).toEqual(["Friend", "School"]);
    expect(c.notes).toBe("老朋友, 大學同學\n很會煮飯");
  });

  it("parses multiple cards and year-less BDAY", () => {
    const vcf = "BEGIN:VCARD\nFN:A\nBDAY:--0514\nEND:VCARD\nBEGIN:VCARD\nFN:B\nEND:VCARD";
    const out = parseVCard(vcf);
    expect(out).toHaveLength(2);
    expect(out[0].birthday).toBe("05-14");
  });

  it("falls back to N when FN missing, skips nameless", () => {
    const out = parseVCard("BEGIN:VCARD\nN:Chung;Patrick;;;\nEND:VCARD\nBEGIN:VCARD\nTEL:123\nEND:VCARD");
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("Patrick Chung");
  });
});

describe("detectDuplicates", () => {
  const existing = [
    { id: "1", name: "王小明", email: "ming@acme.com" },
    { id: "2", name: "Amy Chen", email: null },
  ];

  it("matches by email (case-insensitive) and by normalized name", () => {
    const drafts = [
      { name: "小明王", email: "MING@acme.com" },
      { name: "amychen", email: null },
      { name: "新朋友", email: "new@x.com" },
    ];
    const out = detectDuplicates(drafts, existing);
    expect(out[0].duplicateOf.id).toBe("1");
    expect(out[1].duplicateOf.id).toBe("2");
    expect(out[2].duplicateOf).toBeNull();
  });
});
