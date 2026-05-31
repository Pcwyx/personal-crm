import { getSupabaseAdmin, getValidAccessToken, inferType, matchContact } from "./_utils.js";

const DAYS_BACK = 30;

async function fetchRecentEvents(accessToken) {
  const timeMin = new Date(Date.now() - DAYS_BACK * 86400000).toISOString();
  const params = new URLSearchParams({
    timeMin,
    maxResults: "200",
    singleEvents: "true",
    orderBy: "startTime",
  });
  const r = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await r.json();
  return data.items || [];
}

function buildPreview(events, contacts) {
  const preview = [];
  for (const ev of events) {
    if (!ev.start) continue;
    const date = (ev.start.dateTime || ev.start.date || "").slice(0, 10);
    if (!date) continue;

    const attendees = ev.attendees || [];
    // Skip events with no other attendees (solo blocks)
    const others = attendees.filter(a => !a.self);
    if (others.length === 0) continue;

    const matched = [];
    for (const a of others) {
      const contact = matchContact(a, contacts);
      if (contact) matched.push(contact);
    }
    if (matched.length === 0) continue;

    preview.push({
      google_event_id: ev.id,
      title: ev.summary || "",
      date,
      type: inferType(ev.summary || ""),
      matched_contacts: matched.map(c => ({ id: c.id, name: c.name })),
      description: ev.description || "",
    });
  }
  return preview;
}

export default async function handler(req, res) {
  const accessToken = await getValidAccessToken();
  if (!accessToken) return res.status(401).json({ error: "not_connected" });

  const supabase = getSupabaseAdmin();
  const { data: contactRows } = await supabase.from("contacts").select("id, name, email");
  const contacts = contactRows || [];

  if (req.method === "GET") {
    const events = await fetchRecentEvents(accessToken);
    const preview = buildPreview(events, contacts);
    return res.json({ preview });
  }

  if (req.method === "POST") {
    // Body: { items: [{ google_event_id, title, date, type, contact_ids, description }] }
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "no_items" });
    }

    // De-duplicate against existing interactions by source_id
    const { data: existing } = await supabase
      .from("interactions")
      .select("source_id")
      .not("source_id", "is", null);
    const existingIds = new Set((existing || []).map(r => r.source_id));

    const toInsert = [];
    for (const item of items) {
      if (existingIds.has(item.google_event_id)) continue;
      for (const contactId of item.contact_ids || []) {
        toInsert.push({
          contact_id: contactId,
          date: item.date,
          type: item.type,
          notes: item.title + (item.description ? `\n${item.description}` : ""),
          source: "gcal",
          source_id: item.google_event_id,
        });
      }
    }

    if (toInsert.length > 0) {
      await supabase.from("interactions").insert(toInsert);
    }

    // Update last_sync timestamp
    await supabase.from("settings").upsert({
      key: "gcal_last_sync",
      value: { ts: new Date().toISOString() },
    });

    return res.json({ imported: toInsert.length });
  }

  res.status(405).json({ error: "method_not_allowed" });
}
