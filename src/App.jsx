import { useState, useEffect, useRef } from "react";
import { supabase, authFetch } from "./supabase.js";
import { computeStrength, TIER_CADENCE, birthdayDaysUntil, todayISO, daysSince } from "./lib/utils.js";
import Sidebar from "./components/Sidebar.jsx";
import BottomNav from "./components/BottomNav.jsx";
import SpeedDial from "./components/SpeedDial.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import HomeView from "./views/HomeView.jsx";
import ContactsView from "./views/ContactsView.jsx";
import ActivityView from "./views/ActivityView.jsx";
import RemindersView from "./views/RemindersView.jsx";
import StatsView from "./views/StatsView.jsx";
import ContactDetail from "./panels/ContactDetail.jsx";
import AddContactModal from "./panels/AddContactModal.jsx";
import AddActivityModal from "./panels/AddActivityModal.jsx";
import CalendarSyncModal from "./panels/CalendarSyncModal.jsx";

const ACCENT_THEMES = {
  "#D97757": { acc: "#D97757", accLight: "#F2C4AE", accPale: "#FBF0EB" },
  "#3B6FD4": { acc: "#3B6FD4", accLight: "#A8C0F0", accPale: "#EFF4FD" },
  "#9B4F8E": { acc: "#9B4F8E", accLight: "#D9A8D4", accPale: "#F7EEF6" },
};

export default function App() {
  const [session, setSession] = useState(undefined);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("home");
  const [detailId, setDetailId] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterRels, setFilterRels] = useState([]);
  const [filterTier, setFilterTier] = useState(null);

  const [viewMode, setViewMode] = useState(() => localStorage.getItem("crm-view-mode") || "grid");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("crm-sidebar-collapsed") === "true");
  const [accentColor, setAccentColor] = useState(() => localStorage.getItem("crm-accent") || "#D97757");

  const [gcalConnected, setGcalConnected] = useState(false);
  const [gcalLastSync, setGcalLastSync] = useState(null);
  const [showCalendarSync, setShowCalendarSync] = useState(false);
  const [gcalToast, setGcalToast] = useState(null);
  const [undoToast, setUndoToast] = useState(null);

  const syncTimers = useRef({});
  const loadedRef = useRef(false);

  // Apply accent theme to CSS vars
  useEffect(() => {
    const theme = ACCENT_THEMES[accentColor] || ACCENT_THEMES["#D97757"];
    const r = document.documentElement.style;
    r.setProperty("--acc", theme.acc);
    r.setProperty("--acc-light", theme.accLight);
    r.setProperty("--acc-pale", theme.accPale);
    localStorage.setItem("crm-accent", accentColor);
  }, [accentColor]);

  useEffect(() => { localStorage.setItem("crm-view-mode", viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem("crm-sidebar-collapsed", sidebarCollapsed); }, [sidebarCollapsed]);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // Google Calendar status
  useEffect(() => {
    authFetch("/api/google/status")
      .then(r => r.json())
      .then(({ connected, last_sync }) => {
        setGcalConnected(connected);
        setGcalLastSync(last_sync);
      })
      .catch(() => {});
  }, []);

  // Handle OAuth callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gcal_connected") === "1") {
      setGcalConnected(true);
      setGcalToast("Google Calendar connected!");
      setTimeout(() => setGcalToast(null), 3000);
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("gcal_error")) {
      setGcalToast(`Calendar error: ${params.get("gcal_error")}`);
      setTimeout(() => setGcalToast(null), 4000);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Store pending contact link before login
  useEffect(() => {
    if (session !== null) return;
    const id = new URLSearchParams(window.location.search).get("contact");
    if (id) sessionStorage.setItem("pendingContact", id);
  }, [session]);

  // Load contacts once session established — two-phase for fast first paint:
  // contacts render immediately, interactions merge in from a background query
  useEffect(() => {
    if (!session || loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      const { data, error } = await supabase.from("contacts").select("*");
      if (!error && data) {
        setContacts(data.map(c => ({ ...c, interactions: [] })));
        const pending = sessionStorage.getItem("pendingContact");
        const urlId = new URLSearchParams(window.location.search).get("contact");
        const targetId = pending || urlId;
        if (targetId) {
          sessionStorage.removeItem("pendingContact");
          setDetailId(targetId);
        }
      }
      setLoading(false);
      if (error) return;
      const { data: ints } = await supabase
        .from("interactions")
        .select("*")
        .order("date", { ascending: false });
      if (ints) {
        const byContact = {};
        for (const i of ints) (byContact[i.contact_id] ||= []).push(i);
        setContacts(prev => prev.map(c => ({ ...c, interactions: byContact[c.id] || [] })));
      }
    })();
  }, [session]);

  // ── SYNC ────────────────────────────────────────────────────────────────────
  function syncContact(contact) {
    clearTimeout(syncTimers.current[contact.id]);
    syncTimers.current[contact.id] = setTimeout(async () => {
      // Exclude computed/externally-managed fields that must not be overwritten by generic sync
      const { interactions: _i, strength: _s, last_contact: _lc,
              gcal_followup_event_id: _gf, gcal_birthday_event_id: _gb, ...fields } = contact;
      const { error } = await supabase.from("contacts").upsert([fields]);
      if (error) console.error("[CRM] sync failed:", contact.id, error.message);
      delete syncTimers.current[contact.id];
    }, 600);
  }

  // ── GOOGLE CALENDAR BIRTHDAY SYNC ───────────────────────────────────────────
  async function syncBirthdayCalendar(contact, newBirthday) {
    const oldEventId = contact.gcal_birthday_event_id || null;
    if (!newBirthday) {
      if (oldEventId) {
        await authFetch("/api/google/birthday", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_id: oldEventId }),
        });
        supabase.from("contacts").update({ gcal_birthday_event_id: null }).eq("id", contact.id);
        setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, gcal_birthday_event_id: null } : c));
      }
      return;
    }
    const r = await authFetch("/api/google/birthday", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contact,
        birthday: newBirthday,
        ...(oldEventId ? { event_id: oldEventId } : {}),
      }),
    });
    const { event_id } = await r.json();
    if (event_id) {
      supabase.from("contacts").update({ gcal_birthday_event_id: event_id }).eq("id", contact.id);
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, gcal_birthday_event_id: event_id } : c));
    }
  }

  // ── GOOGLE CALENDAR FOLLOW-UP SYNC ──────────────────────────────────────────
  async function syncFollowUpCalendar(contact, newDate, newNote) {
    const oldEventId = contact.gcal_followup_event_id || null;
    if (!newDate) {
      if (oldEventId) {
        await authFetch("/api/google/followup", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_id: oldEventId }),
        });
        supabase.from("contacts").update({ gcal_followup_event_id: null }).eq("id", contact.id);
        setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, gcal_followup_event_id: null } : c));
      }
      return;
    }
    const method = oldEventId ? "PUT" : "POST";
    const body = { contact, date: newDate, note: newNote || null, ...(oldEventId ? { event_id: oldEventId } : {}) };
    const r = await authFetch("/api/google/followup", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const { event_id } = await r.json();
    if (event_id) {
      supabase.from("contacts").update({ gcal_followup_event_id: event_id }).eq("id", contact.id);
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, gcal_followup_event_id: event_id } : c));
    }
  }

  // ── CONTACT CRUD ─────────────────────────────────────────────────────────────
  function updateContact(id, patch) {
    const existing = contacts.find(c => c.id === id);
    if (!existing) return;
    const updated = { ...existing, ...patch, updated_at: new Date().toISOString() };
    setContacts(prev => prev.map(c => (c.id === id ? updated : c)));
    syncContact(updated);
    if ("next_follow_up" in patch && gcalConnected) {
      syncFollowUpCalendar(existing, patch.next_follow_up ?? null, patch.follow_up_note ?? existing.follow_up_note);
    }
    if ("birthday" in patch && gcalConnected) {
      syncBirthdayCalendar(existing, patch.birthday ?? null);
    }
  }

  async function addContact(data) {
    const id = crypto.randomUUID();
    const cadence = data.cadence || TIER_CADENCE[data.tier] || 90;
    const now = new Date().toISOString();
    const contact = { id, ...data, cadence, interactions: [], created_at: now, updated_at: now };
    const { interactions: _i, ...fields } = contact;
    const { error } = await supabase.from("contacts").insert([fields]);
    if (error) {
      setGlobalError("Failed to add contact. Please try again.");
      setTimeout(() => setGlobalError(null), 4000);
    } else {
      setContacts(prev => [...prev, contact]);
      setDetailId(id);
      setShowAddContact(false);
    }
  }

  async function deleteContact(id) {
    if (gcalConnected) {
      const contact = contacts.find(c => c.id === id);
      if (contact?.gcal_birthday_event_id) {
        authFetch("/api/google/birthday", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_id: contact.gcal_birthday_event_id }),
        });
      }
      if (contact?.gcal_followup_event_id) {
        authFetch("/api/google/followup", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_id: contact.gcal_followup_event_id }),
        });
      }
    }
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) {
      setGlobalError("Failed to delete contact. Please try again.");
      setTimeout(() => setGlobalError(null), 4000);
      return;
    }
    setContacts(prev => prev.filter(c => c.id !== id));
    if (detailId === id) setDetailId(null);
  }

  async function bulkDelete() {
    const ids = [...selectedIds];
    if (gcalConnected) {
      for (const id of ids) {
        const contact = contacts.find(c => c.id === id);
        if (contact?.gcal_birthday_event_id) {
          authFetch("/api/google/birthday", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event_id: contact.gcal_birthday_event_id }),
          });
        }
        if (contact?.gcal_followup_event_id) {
          authFetch("/api/google/followup", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event_id: contact.gcal_followup_event_id }),
          });
        }
      }
    }
    const { error } = await supabase.from("contacts").delete().in("id", ids);
    if (error) {
      setGlobalError("Failed to delete contacts. Please try again.");
      setTimeout(() => setGlobalError(null), 4000);
    } else {
      setContacts(prev => prev.filter(c => !selectedIds.has(c.id)));
      if (detailId && selectedIds.has(detailId)) setDetailId(null);
    }
    setShowBulkDeleteConfirm(false);
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  // ── INTERACTIONS ─────────────────────────────────────────────────────────────
  async function addInteraction(contactId, { date, type, note }) {
    const { data: row, error } = await supabase
      .from("interactions")
      .insert([{ contact_id: contactId, date, type, note }])
      .select()
      .single();
    if (error) {
      setGlobalError("Failed to log interaction. Please try again.");
      setTimeout(() => setGlobalError(null), 4000);
      return;
    }
    const existing = contacts.find(c => c.id === contactId);
    const newLast = !existing?.last_contact || date > existing.last_contact ? date : existing.last_contact;
    await supabase.from("contacts").update({ last_contact: newLast }).eq("id", contactId);
    setContacts(prev => prev.map(c => {
      if (c.id !== contactId) return c;
      return { ...c, last_contact: newLast, interactions: [row, ...(c.interactions || [])] };
    }));
  }

  function deleteInteraction(contactId, interactionId) {
    const contactBefore = contacts.find(c => c.id === contactId);
    const ints = (contactBefore?.interactions || []).filter(i => i.id !== interactionId);
    const newLast = ints.length ? ints.reduce((mx, i) => i.date > mx ? i.date : mx, "") : null;

    // Optimistic remove
    setContacts(prev => prev.map(c =>
      c.id !== contactId ? c : { ...c, interactions: ints, last_contact: newLast }
    ));

    // Flush any previous pending delete immediately so its DB write is never lost
    if (undoToast) {
      clearTimeout(undoToast.timerId);
      undoToast.commit();
    }

    const commit = async () => {
      await supabase.from("interactions").delete().eq("id", interactionId);
      await supabase.from("contacts").update({ last_contact: newLast }).eq("id", contactId);
    };

    const timerId = setTimeout(async () => {
      await commit();
      setUndoToast(null);
    }, 5000);

    setUndoToast({
      timerId,
      commit,
      onUndo: () => {
        clearTimeout(timerId);
        setContacts(prev => prev.map(c => c.id === contactId ? contactBefore : c));
        setUndoToast(null);
      },
    });
  }

  // ── SELECT MODE ──────────────────────────────────────────────────────────────
  function enterSelectMode() {
    setSelectMode(true);
    setSelectedIds(new Set());
    if (activeView !== "contacts") setActiveView("contacts");
  }
  function toggleSelectId(id) {
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  // ── EXPORT ───────────────────────────────────────────────────────────────────
  function dlFile(content, name, mime) {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    Object.assign(document.createElement("a"), { href: url, download: name }).click();
    URL.revokeObjectURL(url);
  }
  function exportJSON(list, label) {
    dlFile(JSON.stringify(list, null, 2), `crm-${label}-${todayISO()}.json`, "application/json");
  }
  function exportCSV(list, label) {
    const esc = v => {
      let s = String(v ?? "").replace(/"/g, '""');
      // Prevent spreadsheet formula injection
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return `"${s}"`;
    };
    const hdrs = ["name","relationship","role","company","location","phone","email","birthday","lastContact","nextFollowUp","followUpNote","bio","notes","tags","linkedin","twitter","instagram"];
    const rows = list.map(c => [
      c.name, (c.relationship||[]).join(";"), c.role, c.company, c.location,
      c.phone, c.email, c.birthday, c.last_contact, c.next_follow_up, c.follow_up_note,
      c.bio, c.notes, (c.tags||[]).join(";"),
      c.social?.linkedin, c.social?.twitter, c.social?.instagram,
    ].map(esc).join(","));
    dlFile([hdrs.map(esc).join(","), ...rows].join("\n"), `crm-${label}-${todayISO()}.csv`, "text/csv;charset=utf-8");
  }
  function exportVCard(list, label) {
    // RFC 6350: escape backslash, newline, comma, semicolon in text values
    const vesc = v => String(v ?? "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
    const lines = list.flatMap(c => {
      const v = ["BEGIN:VCARD","VERSION:3.0",`FN:${vesc(c.name)}`,`N:${vesc(c.name)};;;;`];
      if (c.company) v.push(`ORG:${vesc(c.company)}`);
      if (c.role) v.push(`TITLE:${vesc(c.role)}`);
      if (c.phone) v.push(`TEL:${vesc(c.phone)}`);
      if (c.email) v.push(`EMAIL:${vesc(c.email)}`);
      if (c.birthday) {
        const [mm,dd] = c.birthday.split("-");
        v.push(`BDAY:1604-${mm}-${dd}`);
      }
      if (c.social?.linkedin) v.push(`URL:https://linkedin.com/in/${vesc(c.social.linkedin)}`);
      if (c.relationship?.length) v.push(`CATEGORIES:${c.relationship.map(vesc).join(",")}`);
      const note = [c.bio, c.location ? `Location: ${c.location}` : null].filter(Boolean);
      if (note.length) v.push(`NOTE:${note.map(vesc).join("\\n")}`);
      v.push("END:VCARD");
      return v;
    });
    dlFile(lines.join("\r\n"), `crm-${label}-${todayISO()}.vcf`, "text/vcard;charset=utf-8");
  }

  // ── DERIVED DATA ─────────────────────────────────────────────────────────────
  const today = todayISO();
  const contactsEnriched = contacts.map(c => ({ ...c, strength: computeStrength(c) }));
  // Badge: only overdue follow-ups
  const overdueFollowUpCount = contacts.filter(
    c => c.next_follow_up && c.next_follow_up < today
  ).length;
  // Home stat card: overdue follow-ups + going cold (tier-based threshold)
  const overdueIds = new Set(contacts.filter(c => c.next_follow_up && c.next_follow_up < today).map(c => c.id));
  const needsAttentionCount = overdueFollowUpCount + contacts.filter(c => {
    if (overdueIds.has(c.id)) return false;
    const threshold = TIER_CADENCE[c.tier] || 90;
    const ds = daysSince(c.last_contact);
    return ds !== null && ds > threshold;
  }).length;
  const detailContact = contacts.find(c => c.id === detailId) || null;

  const hasFilter = filterRels.length > 0 || filterTier !== null || search.length > 0;
  const filteredForExport = hasFilter ? contacts.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name?.toLowerCase().includes(q) || c.role?.toLowerCase().includes(q) || c.tags?.some(t => t.toLowerCase().includes(q));
    const matchRel = !filterRels.length || filterRels.every(r => (c.relationship || []).includes(r));
    const matchTier = filterTier === null || c.tier === filterTier;
    return matchSearch && matchRel && matchTier;
  }) : [];

  // ── RENDER ───────────────────────────────────────────────────────────────────
  if (session === undefined) return (
    <div className="loading-screen">
      <span className="loading-dot" />
    </div>
  );
  if (!session) return <LoginScreen />;
  if (loading) return (
    <div className="loading-screen" style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--ink-faint)" }}>
      Loading…
    </div>
  );

  const viewProps = {
    contacts: contactsEnriched,
    onOpenDetail: id => setDetailId(id),
    today,
  };

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        onNav={v => { setActiveView(v); setDetailId(null); }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(v => !v)}
        overdueCount={overdueFollowUpCount}
        contacts={contacts}
        onOpenDetail={id => setDetailId(id)}
        accentColor={accentColor}
        onAccentChange={setAccentColor}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onEnterSelectMode={enterSelectMode}
        onSignOut={() => supabase.auth.signOut()}
        onExportAll={(fmt) => fmt === "JSON" ? exportJSON(contacts,"all") : fmt === "CSV" ? exportCSV(contacts,"all") : exportVCard(contacts,"all")}
        gcalConnected={gcalConnected}
        gcalLastSync={gcalLastSync}
        onGcalConnect={() => { window.location.href = "/api/google/auth"; }}
        onGcalSync={() => setShowCalendarSync(true)}
        onGcalDisconnect={async () => {
          await authFetch("/api/google/disconnect", { method: "POST" });
          setGcalConnected(false);
          setGcalLastSync(null);
        }}
        onGcalSyncBirthdays={async () => {
          const r = await authFetch("/api/google/birthday-bulk", { method: "POST" });
          const { synced, total } = await r.json();
          setGcalToast(`已同步 ${synced} / ${total} 筆生日到 CRM Birthdays`);
          setTimeout(() => setGcalToast(null), 4000);
        }}
      />

      <div className="main-content">
        <div className="view-area">
          {activeView === "home" && (
            <HomeView
              {...viewProps}
              needsAttentionCount={needsAttentionCount}
              onAddContact={() => setShowAddContact(true)}
              onNavReminders={() => setActiveView("reminders")}
            />
          )}
          {activeView === "contacts" && (
            <ContactsView
              {...viewProps}
              search={search} onSearchChange={setSearch}
              filterRels={filterRels} onFilterRelsChange={setFilterRels}
              filterTier={filterTier} onFilterTierChange={setFilterTier}
              viewMode={viewMode}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelectId}
              onSelectAll={ids => setSelectedIds(new Set(ids))}
            />
          )}
          {activeView === "activity" && (
            <ActivityView {...viewProps} />
          )}
          {activeView === "stats" && (
            <StatsView contacts={contactsEnriched} />
          )}
          {activeView === "reminders" && (
            <RemindersView
              {...viewProps}
              onMarkDone={(id) => {
                updateContact(id, { next_follow_up: null, follow_up_note: null });
                addInteraction(id, { date: today, type: "message", note: "Quick check-in" });
              }}
            />
          )}
        </div>

        {detailContact && (
          <ContactDetail
            key={detailContact.id}
            contact={detailContact}
            onClose={() => setDetailId(null)}
            onUpdate={(patch) => updateContact(detailContact.id, patch)}
            onAddInteraction={(i) => addInteraction(detailContact.id, i)}
            onDeleteInteraction={(iid) => deleteInteraction(detailContact.id, iid)}
            onDelete={() => deleteContact(detailContact.id)}
          />
        )}
      </div>

      <BottomNav
        activeView={activeView}
        onNav={v => { setActiveView(v); setDetailId(null); }}
        overdueCount={overdueFollowUpCount}
      />

      <SpeedDial
        onAddContact={() => setShowAddContact(true)}
        onLogActivity={() => setShowAddActivity(true)}
      />

      {showAddContact && (
        <AddContactModal
          onClose={() => setShowAddContact(false)}
          onAdd={addContact}
        />
      )}

      {showAddActivity && (
        <AddActivityModal
          contacts={contacts}
          onClose={() => setShowAddActivity(false)}
          onAdd={({ contactId, ...rest }) => addInteraction(contactId, rest)}
        />
      )}

      {selectMode && (
        <div className="select-bar">
          <span className="select-bar-count">
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select mode"}
          </span>
          {selectedIds.size > 0 && (() => {
            const sel = contacts.filter(c => selectedIds.has(c.id));
            return <>
              {["JSON","CSV","vCard"].map(fmt => (
                <button key={fmt} className="sel-action" onClick={() =>
                  fmt === "JSON" ? exportJSON(sel,"selected") : fmt === "CSV" ? exportCSV(sel,"selected") : exportVCard(sel,"selected")
                }>{fmt}</button>
              ))}
              <button className="sel-action danger" onClick={() => setShowBulkDeleteConfirm(true)}>Delete</button>
            </>;
          })()}
          <button className="sel-cancel" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}>✕ Cancel</button>
        </div>
      )}

      {globalError && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: "var(--red)", color: "#fff", fontSize: 13.5, fontWeight: 500,
          padding: "10px 20px", borderRadius: 10, zIndex: 9999,
          boxShadow: "0 4px 16px rgba(0,0,0,.2)", pointerEvents: "none",
        }}>
          {globalError}
        </div>
      )}

      {showCalendarSync && (
        <CalendarSyncModal
          onClose={() => setShowCalendarSync(false)}
          onImported={(count) => {
            setGcalLastSync(new Date().toISOString());
            setGcalToast(`Imported ${count} interaction${count !== 1 ? "s" : ""} from Google Calendar`);
            setTimeout(() => setGcalToast(null), 3500);
          }}
        />
      )}

      {gcalToast && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: "var(--ink)", color: "#fff", fontSize: 13.5, fontWeight: 500,
          padding: "10px 20px", borderRadius: 10, zIndex: 9999,
          boxShadow: "0 4px 16px rgba(0,0,0,.2)", pointerEvents: "none",
          whiteSpace: "nowrap",
        }}>
          {gcalToast}
        </div>
      )}

      {undoToast && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: "var(--ink)", color: "#fff", fontSize: 13.5, fontWeight: 500,
          padding: "10px 16px", borderRadius: 10, zIndex: 9999,
          boxShadow: "0 4px 16px rgba(0,0,0,.2)",
          display: "flex", alignItems: "center", gap: 12, whiteSpace: "nowrap",
        }}>
          <span>Interaction deleted</span>
          <button
            onClick={undoToast.onUndo}
            style={{
              background: "none", border: "1px solid rgba(255,255,255,0.45)",
              color: "#fff", fontSize: 12.5, fontWeight: 600,
              padding: "3px 10px", borderRadius: 6, cursor: "pointer",
            }}
          >
            Undo
          </button>
        </div>
      )}

      {showBulkDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowBulkDeleteConfirm(false)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title" style={{ fontSize: 17 }}>Delete {selectedIds.size} contacts?</div>
            <p style={{ fontSize: 13.5, color: "var(--ink-mid)", lineHeight: 1.6, marginBottom: 0 }}>
              This cannot be undone. All data including interactions will be permanently deleted.
            </p>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowBulkDeleteConfirm(false)}>Cancel</button>
              <button className="btn-danger" onClick={bulkDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
