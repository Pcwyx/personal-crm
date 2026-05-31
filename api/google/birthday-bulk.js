import { getSupabaseAdmin, getValidAccessToken } from "./_utils.js";

function nextBirthdayYear(mm, dd) {
  const now = new Date(Date.now() + 8 * 3600000);
  const thisYear = now.getUTCFullYear();
  const thisMonth = now.getUTCMonth() + 1;
  const thisDay = now.getUTCDate();
  if (mm > thisMonth || (mm === thisMonth && dd >= thisDay)) return thisYear;
  return thisYear + 1;
}

function buildEventBody(contact, mm, dd) {
  const year = nextBirthdayYear(mm, dd);
  const pad = n => String(n).padStart(2, "0");
  const dateStr = `${year}-${pad(mm)}-${pad(dd)}`;
  const lines = [];
  if (contact.role) lines.push(contact.role + (contact.company ? ` @ ${contact.company}` : ""));
  if (contact.email) lines.push(contact.email);
  if (contact.phone) lines.push(contact.phone);
  return {
    summary: `🎂 ${contact.name}'s Birthday`,
    description: lines.join("\n") || undefined,
    start: { dateTime: `${dateStr}T08:00:00`, timeZone: "Asia/Taipei" },
    end:   { dateTime: `${dateStr}T08:30:00`, timeZone: "Asia/Taipei" },
    recurrence: ["RRULE:FREQ=YEARLY"],
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 0 }] },
  };
}

async function resetBirthdayCalendar(supabase, accessToken) {
  // Get existing calendar ID
  const { data } = await supabase
    .from("settings").select("value").eq("key", "gcal_birthday_id").single();
  const oldId = data?.value?.id;

  // Delete old calendar if it exists
  if (oldId) {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(oldId)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
    );
  }

  // Create fresh calendar
  const r = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ summary: "CRM Birthdays" }),
  });
  const cal = await r.json();
  if (!cal.id) throw new Error("Failed to create CRM Birthdays calendar");

  await supabase.from("settings").upsert({ key: "gcal_birthday_id", value: { id: cal.id } });
  return cal.id;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const accessToken = await getValidAccessToken();
  if (!accessToken) return res.status(401).json({ error: "not_connected" });

  const supabase = getSupabaseAdmin();

  // Step 1: delete + recreate calendar (2 API calls instead of N deletes)
  const calId = await resetBirthdayCalendar(supabase, accessToken);

  // Step 2: fetch contacts with birthdays
  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("id, name, role, company, email, phone, birthday")
    .not("birthday", "is", null)
    .neq("birthday", "");

  if (error) return res.status(500).json({ error: error.message });
  if (!contacts?.length) return res.json({ synced: 0, total: 0 });

  const valid = contacts.filter(c => {
    const [mm, dd] = (c.birthday || "").split("-").map(Number);
    return mm && dd;
  });

  // Step 3: create events in parallel batches of 5
  const CHUNK = 5;
  let synced = 0;
  for (let i = 0; i < valid.length; i += CHUNK) {
    const chunk = valid.slice(i, i + CHUNK);
    const results = await Promise.all(
      chunk.map(async contact => {
        const [mm, dd] = contact.birthday.split("-").map(Number);
        const r = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(buildEventBody(contact, mm, dd)),
          }
        );
        const ev = await r.json();
        return { contactId: contact.id, eventId: ev.id };
      })
    );

    // Batch update event IDs in Supabase
    await Promise.all(
      results
        .filter(r => r.eventId)
        .map(r =>
          supabase.from("contacts").update({ gcal_birthday_event_id: r.eventId }).eq("id", r.contactId)
        )
    );
    synced += results.filter(r => r.eventId).length;
  }

  return res.json({ synced, total: valid.length });
}
