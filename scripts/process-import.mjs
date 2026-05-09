/**
 * One-time import script: reads crm_contacts_final.json, calls OpenAI once per
 * contact to infer a role and extract facts/interests/reminders from every
 * update note, then writes the enriched data to src/imported-contacts.json.
 *
 * Run:  npm run import
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// ── Load .env manually (no extra deps) ───────────────────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync(path.join(ROOT, ".env"), "utf-8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=][^=]*)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim();
    }
  } catch {
    // .env not found — rely on environment variables already set
  }
}
loadEnv();

const API_KEY = process.env.VITE_OPENAI_API_KEY;
if (!API_KEY) {
  console.error("❌  Missing VITE_OPENAI_API_KEY — add it to .env and retry.");
  process.exit(1);
}

const SOURCE = path.join(ROOT, "crm_contacts_final.json");
const OUTPUT = path.join(ROOT, "src", "imported-contacts.json");

const contacts = JSON.parse(readFileSync(SOURCE, "utf-8"));

// ── Single OpenAI call per contact ───────────────────────────────────────────
async function processContact(contact) {
  const updatesBlock =
    contact.updates.length === 0
      ? "none"
      : contact.updates
          .map((u, i) => `[update ${i}] (${u.date})\n${u.raw}`)
          .join("\n---\n");

  const prompt = `You are enriching data for a personal CRM. The user speaks Traditional Chinese but wants data returned in English.

Contact name: ${contact.name}
Bio: ${contact.bio || "none"}
Updates (chronological, index = array position):
${updatesBlock}

Return ONLY valid JSON (no markdown) with this exact structure:
{
  "role": "Short professional or social role title inferred from bio + updates. Under 8 words. English. E.g. 'Graduate Student, Law School' or 'Physical Therapist Candidate'. Empty string if nothing can be inferred.",
  "updates": [
    {
      "index": 0,
      "facts": ["up to 3 factual updates about the person, under 8 words each, English"],
      "interests": ["up to 3 interests or passions mentioned, English"],
      "reminders": ["up to 2 follow-up actions to take, English"]
    }
  ]
}

Rules:
- "updates" must have one entry per update, matching by index.
- If an update has nothing for a category, use an empty array.
- Keep every item concise (under 8 words).
- Translate / summarize from Chinese into English.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 1500,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(text);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔄  Processing ${contacts.length} contacts via OpenAI...\n`);

  const enriched = [];
  let errors = 0;

  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    process.stdout.write(`  [${String(i + 1).padStart(2)}/${contacts.length}] ${c.name} ... `);

    try {
      const result = await processContact(c);

      const enrichedContact = {
        ...c,
        role: result.role?.trim() || c.role || "",
        updates: c.updates.map((u, idx) => {
          const extracted = (result.updates ?? []).find((r) => r.index === idx);
          return {
            ...u,
            extracted: extracted
              ? {
                  facts: extracted.facts ?? [],
                  interests: extracted.interests ?? [],
                  reminders: extracted.reminders ?? [],
                }
              : (u.extracted ?? { facts: [], interests: [], reminders: [] }),
          };
        }),
      };

      enriched.push(enrichedContact);
      console.log("✓");
    } catch (err) {
      console.log(`✗  (${err.message}) — keeping original`);
      enriched.push(c);
      errors++;
    }

    // Stay comfortably under rate limits (~60 RPM on gpt-4o-mini free tier)
    if (i < contacts.length - 1) await sleep(1100);
  }

  writeFileSync(OUTPUT, JSON.stringify(enriched, null, 2), "utf-8");

  console.log(`\n✅  Done — ${contacts.length - errors} enriched, ${errors} skipped.`);
  console.log(`📄  Saved → src/imported-contacts.json\n`);
  console.log("Next step: npm run dev\n");
}

main().catch((err) => {
  console.error("\n❌ Fatal:", err.message);
  process.exit(1);
});
