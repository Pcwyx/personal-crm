function splitCSVLine(line) {
  const out = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function stripFormulaGuard(s) {
  return s.startsWith("'") && /^'[=+\-@]/.test(s) ? s.slice(1) : s;
}

const CSV_ALIASES = {
  name: ["name", "full name", "姓名"],
  role: ["role", "title", "job title", "職稱"],
  company: ["company", "organization", "org", "公司"],
  location: ["location", "city", "地點"],
  phone: ["phone", "tel", "phone number", "電話"],
  email: ["email", "e-mail", "email address"],
  birthday: ["birthday", "bday", "生日"],
  lastContact: ["lastcontact", "last contact", "last_contact"],
  nextFollowUp: ["nextfollowup", "next follow up", "next_follow_up"],
  followUpNote: ["followupnote", "follow up note", "follow_up_note"],
  bio: ["bio"],
  notes: ["notes", "note", "備註"],
  tags: ["tags", "標籤"],
  relationship: ["relationship", "關係"],
  linkedin: ["linkedin"],
  twitter: ["twitter"],
  instagram: ["instagram"],
};

export function parseCSV(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const col = {};
  for (const [field, aliases] of Object.entries(CSV_ALIASES)) {
    const idx = headers.findIndex(h => aliases.includes(h));
    if (idx !== -1) col[field] = idx;
  }
  if (col.name === undefined) return [];

  return lines.slice(1).map(line => {
    const cells = splitCSVLine(line).map(stripFormulaGuard);
    const get = f => (col[f] !== undefined ? (cells[col[f]] || "").trim() : "");
    const name = get("name");
    if (!name) return null;
    const social = {};
    if (get("linkedin")) social.linkedin = get("linkedin");
    if (get("twitter")) social.twitter = get("twitter");
    if (get("instagram")) social.instagram = get("instagram");
    const dateOk = v => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
    return {
      name,
      role: get("role") || null,
      company: get("company") || null,
      location: get("location") || null,
      phone: get("phone") || null,
      email: get("email") || null,
      birthday: /^\d{2}-\d{2}$/.test(get("birthday")) ? get("birthday") : null,
      last_contact: dateOk(get("lastContact")),
      next_follow_up: dateOk(get("nextFollowUp")),
      follow_up_note: get("followUpNote") || null,
      bio: get("bio") || null,
      notes: get("notes") || null,
      tags: get("tags") ? get("tags").split(";").map(t => t.trim()).filter(Boolean) : [],
      relationship: get("relationship") ? get("relationship").split(";").map(r => r.trim()).filter(Boolean) : [],
      social,
    };
  }).filter(Boolean);
}

function vUnescape(s) {
  return s.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
}

export function parseVCard(text) {
  const unfolded = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
  const cards = unfolded.split(/BEGIN:VCARD/i).slice(1);
  return cards.map(card => {
    const get = (prop) => {
      const m = card.match(new RegExp(`^${prop}(?:;[^:]*)?:(.*)$`, "im"));
      return m ? vUnescape(m[1].trim()) : "";
    };
    const name = get("FN") || get("N").split(";").filter(Boolean).reverse().join(" ").trim();
    if (!name) return null;
    const bdayRaw = get("BDAY").replace(/-/g, "");
    let birthday = null;
    const m = bdayRaw.match(/^(?:\d{4})?(\d{2})(\d{2})$/);
    if (m) birthday = `${m[1]}-${m[2]}`;
    const note = get("NOTE");
    return {
      name,
      role: get("TITLE") || null,
      company: get("ORG").split(";")[0] || null,
      location: null,
      phone: get("TEL") || null,
      email: get("EMAIL") || null,
      birthday,
      last_contact: null,
      next_follow_up: null,
      follow_up_note: null,
      bio: null,
      notes: note || null,
      tags: [],
      relationship: get("CATEGORIES") ? get("CATEGORIES").split(",").map(r => r.trim()).filter(Boolean) : [],
      social: {},
    };
  }).filter(Boolean);
}

export function detectDuplicates(drafts, existing) {
  const byEmail = new Map();
  const byName = new Map();
  for (const c of existing) {
    if (c.email) byEmail.set(c.email.toLowerCase(), c);
    if (c.name) byName.set(c.name.toLowerCase().replace(/\s+/g, ""), c);
  }
  return drafts.map(d => {
    const dup =
      (d.email && byEmail.get(d.email.toLowerCase())) ||
      byName.get(d.name.toLowerCase().replace(/\s+/g, "")) ||
      null;
    return { draft: d, duplicateOf: dup };
  });
}
