/**
 * Migration: contacts(id text, data jsonb) → contacts + interactions
 *
 * Run AFTER executing handoff/schema-v2.sql in Supabase SQL Editor:
 *   node scripts/migrate.mjs
 *
 * After verifying data, run the rename SQL in Supabase:
 *   ALTER TABLE contacts RENAME TO contacts_legacy;
 *   ALTER TABLE contacts RENAME TO contacts;
 *   ALTER INDEX contacts_pkey RENAME TO contacts_pkey;
 *   ALTER INDEX contacts_next_follow_up_idx RENAME TO contacts_next_follow_up_idx;
 *   ALTER INDEX contacts_last_contact_idx RENAME TO contacts_last_contact_idx;
 *   ALTER POLICY "contacts_auth" ON contacts RENAME TO "contacts_auth";
 *   ALTER TRIGGER contacts_updated_at ON contacts RENAME TO contacts_updated_at;
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { randomUUID } from "crypto";

// Parse .env manually (no dotenv dependency)
const envText = readFileSync(new URL("../.env", import.meta.url), "utf8");
const env = Object.fromEntries(
  envText.split("\n")
    .filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── CONSTANTS ────────────────────────────────────────────────────────────────

const CATEGORY_MAP = {
  family: "Family", friend: "Friend", colleague: "Colleague", business: "Network",
};

const RELATIONSHIP_CADENCE = {
  Family: 30, Friend: 60, School: 90, Colleague: 75, Network: 90, Mentor: 45, Collaborator: 60,
};

// ── HELPERS ──────────────────────────────────────────────────────────────────

function mapRelationship(contact) {
  if (contact.categories?.length) {
    return [...new Set(contact.categories.map(c => CATEGORY_MAP[c] || "Friend"))];
  }
  if (contact.category) return [CATEGORY_MAP[contact.category] || "Friend"];
  return ["Friend"];
}

function computeCadence(relationships) {
  if (!relationships?.length) return 90;
  return Math.min(...relationships.map(r => RELATIONSHIP_CADENCE[r] ?? 90));
}

function normalizeBirthday(birthday) {
  if (!birthday) return null;
  if (birthday.startsWith("--")) return birthday.slice(2); // "--MM-DD" → "MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return birthday.slice(5); // "YYYY-MM-DD" → "MM-DD"
  return birthday; // already "MM-DD"
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  return dateStr.slice(0, 10); // ensure "YYYY-MM-DD"
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

async function migrate() {
  console.log("Reading old contacts…");
  const { data: rows, error } = await supabase.from("contacts_legacy").select("id, data");
  if (error) { console.error("Failed to read contacts:", error.message); process.exit(1); }

  console.log(`Found ${rows.length} contacts to migrate.`);

  let successCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    const c = row.data;
    const id = row.id;

    const relationship = mapRelationship(c);
    const cadence = c.cadence || computeCadence(relationship);

    const social = {};
    if (c.linkedin) social.linkedin = c.linkedin;
    if (c.instagram) social.instagram = c.instagram;

    // Old IDs are text strings like "imported-979526"; generate a real UUID
    const newId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      ? id
      : randomUUID();

    const newContact = {
      id: newId,
      name: c.name || "",
      role: c.role || null,
      company: c.company || null,
      email: c.email || null,
      phone: c.phone || null,
      tags: c.tags || [],
      last_contact: normalizeDate(c.lastContact),
      next_follow_up: normalizeDate(c.followUp?.date),
      follow_up_note: c.followUp?.note || null,
      relationship,
      cadence,
      notes: c.notes || null,
      bio: c.bio || null,
      photo: c.photo || null,
      social: Object.keys(social).length ? social : {},
      birthday: normalizeBirthday(c.birthday),
      location: c.location || null,
      important_dates: c.importantDates || [],
      created_at: c.lastModified || new Date().toISOString(),
      updated_at: c.lastModified || new Date().toISOString(),
    };

    const { error: contactError } = await supabase
      .from("contacts")
      .upsert([newContact], { onConflict: "id" });

    if (contactError) {
      console.error(`  ✗ ${c.name || id}: ${contactError.message}`);
      errorCount++;
      continue;
    }

    // Migrate updates[] → interactions
    const updates = c.updates || [];
    if (updates.length) {
      const interactions = updates
        .filter(u => u.date && (u.text || u.raw))
        .map(u => ({
          contact_id: newId,
          date: normalizeDate(u.date),
          type: "note",
          note: u.raw || u.text || "",
          created_at: u.date ? u.date + "T00:00:00Z" : new Date().toISOString(),
        }));

      if (interactions.length) {
        const { error: intError } = await supabase
          .from("interactions")
          .insert(interactions);
        if (intError) {
          console.warn(`  ⚠ ${c.name || id} interactions: ${intError.message}`);
        }
      }
    }

    console.log(`  ✓ ${c.name || id} → ${newId} (${relationship.join(", ")}, cadence ${cadence}d, ${updates.length} interactions)`);
    successCount++;
  }

  console.log(`\nDone. ${successCount} migrated, ${errorCount} errors.`);
  if (errorCount === 0) {
    console.log(`\nNext step — run in Supabase SQL Editor:`);
    console.log(`  ALTER TABLE contacts RENAME TO contacts_legacy;`);
    console.log(`  ALTER TABLE contacts RENAME TO contacts;`);
  }
}

migrate().catch(err => { console.error(err); process.exit(1); });
