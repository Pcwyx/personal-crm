import { useState, useEffect, useRef, useCallback } from "react";

import { supabase } from "./src/supabase.js";

// ── STYLES ────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #F5F1EA;
    --surface: #FBF8F3;
    --text: #2A251F;
    --text-muted: #6B6055;
    --text-subtle: #8B7F70;
    --accent: #5C6B4E;
    --accent-soft: rgba(92,107,78,0.10);
    --ink: #1A1612;
    --warn: #A6442D;
    --terracotta: #C96442;
    --border: rgba(60,50,40,0.08);
    --border-strong: rgba(60,50,40,0.14);
    --shadow: 0 2px 16px rgba(42,37,31,0.08);
    --shadow-lg: 0 8px 40px rgba(42,37,31,0.13);
    --radius: 12px;
    --radius-lg: 18px;
  }

  body { background: var(--bg); font-family: 'Inter', sans-serif; color: var(--text); }

  .app { min-height: 100vh; display: flex; flex-direction: column; }

  /* NAV */
  .nav {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 0 24px;
    height: 58px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .nav-brand {
    font-family: 'Inter', sans-serif;
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.3px;
  }
  .nav-brand span { color: var(--terracotta); }
  .nav-tabs { display: flex; gap: 4px; }
  .nav-tab {
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    border: none;
    background: none;
    transition: all 0.15s;
  }
  .nav-tab:hover { background: var(--bg); color: var(--text); }
  .nav-tab.active { background: var(--ink); color: #fff; }
  .nav-add {
    background: var(--accent);
    color: #fff;
    font-family: 'Inter', sans-serif;
    border: none;
    border-radius: 8px;
    padding: 7px 16px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: opacity 0.15s;
  }
  .nav-add:hover { opacity: 0.88; }

  /* MAIN */
  .main { flex: 1; padding: 28px 24px; max-width: 1100px; margin: 0 auto; width: 100%; }

  /* DASHBOARD */
  .section-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 14px;
  }
  .today-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; transition: border-color 0.15s; }
  .today-card:hover { border-color: var(--border-strong); }
  .today-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .today-card-actions { display: flex; align-items: center; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
  .btn-reached { background: var(--accent-soft); color: var(--accent); border: none; padding: 6px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; transition: background 0.15s; }
  .btn-reached:hover { background: rgba(92,107,78,0.18); }
  .btn-snooze { background: var(--bg); color: var(--text-muted); border: 1px solid var(--border-strong); padding: 6px 12px; border-radius: 8px; font-size: 12.5px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; position: relative; }
  .snooze-dropdown { position: absolute; top: calc(100% + 4px); left: 0; background: var(--surface); border: 1px solid var(--border-strong); border-radius: 10px; box-shadow: var(--shadow); z-index: 50; min-width: 140px; overflow: hidden; }
  .snooze-option { padding: 9px 14px; font-size: 13px; color: var(--text); cursor: pointer; font-family: 'Inter', sans-serif; transition: background 0.1s; }
  .snooze-option:hover { background: var(--bg); }
  .last-chip { display: inline-flex; align-items: center; font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; background: var(--accent-soft); color: var(--accent); padding: 2px 6px; border-radius: 4px; margin-right: 6px; flex-shrink: 0; }
  .more-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border); cursor: pointer; }
  .more-row:last-child { border-bottom: none; }
  .more-row-name { font-size: 13.5px; font-weight: 500; color: var(--text); }
  .more-row-role { font-size: 12px; color: var(--text-subtle); }
  .spotlight-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }

  .alert-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 28px; }
  .alert-item {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .alert-item:hover { border-color: var(--border-strong); box-shadow: var(--shadow); }
  .alert-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .alert-dot.birthday { background: var(--text-muted); }
  .alert-dot.followup { background: var(--accent); }
  .alert-dot.inactive { background: var(--accent); }
  .alert-text { flex: 1; font-size: 13.5px; color: var(--text); }
  .alert-text strong { font-weight: 500; }
  .alert-meta { font-size: 12px; color: var(--text-subtle); }

  /* CONTACTS LIST */
  .contacts-toolbar {
    display: flex;
    gap: 10px;
    margin-bottom: 18px;
    align-items: center;
  }
  .search-input {
    flex: 1;
    padding: 9px 14px;
    border: 1px solid var(--border-strong);
    border-radius: 8px;
    font-size: 13.5px;
    font-family: 'Inter', sans-serif;
    background: var(--surface);
    color: var(--text);
    outline: none;
    transition: border-color 0.15s;
  }
  .search-input:focus { border-color: var(--accent); }
  .cat-filter-bar { display: flex; gap: 6px; flex-wrap: wrap; }
  .cat-filter-btn { padding: 5px 14px; border-radius: 20px; font-size: 12.5px; font-weight: 500; cursor: pointer; border: 1px solid var(--border-strong); background: var(--surface); color: var(--text-muted); font-family: 'Inter', sans-serif; transition: all 0.15s; }
  .cat-filter-btn:hover { border-color: var(--text); color: var(--text); }
  .cat-filter-btn.active { background: var(--text); color: #fff; border-color: var(--text); }

  .contacts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
  .contact-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
    cursor: pointer;
    transition: all 0.18s;
    position: relative;
    overflow: hidden;
  }
  .contact-card:hover { border-color: var(--border-strong); box-shadow: var(--shadow); transform: translateY(-1px); }
  .contact-card-top { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 14px; }
  .avatar {
    width: 46px; height: 46px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 600;
    flex-shrink: 0;
  }
  .contact-card-info { flex: 1; min-width: 0; }
  .contact-name { font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .contact-role { font-size: 12px; color: var(--text-subtle); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .contact-category { font-size: 11px; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase; padding: 3px 9px; border-radius: 20px; display: inline-flex; align-items: center; }
  .cat-friend { background: var(--accent-soft); color: var(--accent); }
  .cat-colleague { background: rgba(107,96,85,0.10); color: var(--text-muted); }
  .cat-business { background: rgba(166,68,45,0.10); color: var(--warn); }
  .cat-family { background: rgba(26,22,18,0.08); color: var(--ink); }
  .cat-picker { display: flex; gap: 6px; flex-wrap: wrap; }
  .cat-pick-btn { cursor: pointer; border: 2px solid transparent; opacity: 0.38; transition: opacity 0.12s, border-color 0.12s; font-family: 'Inter', sans-serif; }
  .cat-pick-btn:hover { opacity: 0.7; }
  .cat-pick-btn.picked { opacity: 1; border-color: currentColor; }
  .contact-tags { display: flex; flex-wrap: wrap; gap: 4px; }
  .tag { font-size: 11px; padding: 2px 8px; border-radius: 20px; background: var(--bg); color: var(--text-muted); border: 1px solid var(--border); }

  /* CONTACT PROFILE */
  .profile-back { background: none; border: none; color: var(--text-muted); font-size: 13px; cursor: pointer; padding: 0; margin-bottom: 20px; display: flex; align-items: center; gap: 6px; font-family: 'Inter', sans-serif; font-weight: 500; }
  .profile-back:hover { color: var(--text); }
  .profile-header {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 28px;
    margin-bottom: 18px;
    display: flex;
    gap: 24px;
    align-items: flex-start;
  }
  .profile-avatar { width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Inter', sans-serif; font-size: 26px; font-weight: 600; flex-shrink: 0; }
  .profile-name { font-family: 'Inter', sans-serif; font-size: 24px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
  .profile-role { font-size: 14px; color: var(--text-muted); margin-bottom: 10px; }
  .profile-meta { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 2px; }
  .profile-actions { margin-left: auto; display: flex; gap: 8px; flex-shrink: 0; }
  .btn-secondary { background: var(--bg); border: 1px solid var(--border-strong); color: var(--text); padding: 7px 14px; border-radius: 8px; font-size: 13px; cursor: pointer; font-family: 'Inter', sans-serif; font-weight: 500; transition: all 0.15s; }
  .btn-secondary:hover { background: var(--border); }
  .btn-primary { background: var(--accent); border: none; color: #fff; padding: 7px 16px; border-radius: 8px; font-size: 13px; cursor: pointer; font-family: 'Inter', sans-serif; font-weight: 500; transition: opacity 0.15s; }
  .btn-primary:hover { opacity: 0.88; }

  .profile-body { display: grid; grid-template-columns: 300px 1fr; gap: 18px; }
  .profile-sidebar { display: flex; flex-direction: column; gap: 14px; }
  .profile-main { display: flex; flex-direction: column; gap: 14px; }

  .info-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; }
  .info-card-title { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); margin-bottom: 12px; }
  .info-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
  .info-row:last-child { margin-bottom: 0; }
  .info-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }
  .info-content { flex: 1; min-width: 0; }
  .info-label { font-size: 11px; color: var(--text-subtle); }
  .info-value { font-size: 13.5px; color: var(--text); word-break: break-word; }
  .info-link { font-size: 13.5px; color: var(--accent); text-decoration: none; }
  .info-link:hover { text-decoration: underline; }

  .bio-text { font-size: 13.5px; color: var(--text-muted); line-height: 1.7; }

  .dates-list { display: flex; flex-direction: column; gap: 8px; }
  .date-row { display: flex; justify-content: space-between; align-items: center; }
  .date-name { font-size: 13.5px; color: var(--text); }
  .date-val { font-size: 12px; color: var(--text-subtle); }
  .date-badge { font-size: 11px; background: var(--accent-soft); color: var(--text-muted); padding: 2px 7px; border-radius: 20px; }

  /* TIMELINE */
  .timeline { display: flex; flex-direction: column; }
  .timeline-entry {
    display: flex;
    gap: 16px;
    padding-bottom: 20px;
    position: relative;
  }
  .timeline-entry::before {
    content: '';
    position: absolute;
    left: 14px;
    top: 28px;
    bottom: 0;
    width: 1px;
    background: var(--border);
  }
  .timeline-entry:last-child::before { display: none; }
  .timeline-dot { width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--border-strong); background: var(--surface); display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; z-index: 1; }
  .timeline-dot.voice { border-color: var(--accent); background: var(--accent-soft); }
  .timeline-dot.text { border-color: var(--accent); background: var(--accent-soft); }
  .timeline-content { flex: 1; padding-top: 4px; }
  .timeline-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .timeline-date { font-size: 12px; color: var(--text-subtle); }
  .timeline-date-edit { font-size: 11px; color: var(--accent); background: none; border: none; cursor: pointer; padding: 0 0 0 6px; font-family: 'Inter', sans-serif; }
  .timeline-delete { opacity: 0; transition: opacity 0.12s; cursor: pointer; background: none; border: none; color: var(--text-subtle); font-size: 13px; padding: 2px 5px; border-radius: 4px; font-family: 'Inter', sans-serif; line-height: 1; }
  .timeline-delete:hover { color: var(--warn); background: rgba(166,68,45,0.08); }
  .timeline-entry:hover .timeline-delete { opacity: 1; }
  .timeline-date-input { font-size: 12px; border: 1px solid var(--border-strong); border-radius: 6px; padding: 2px 6px; font-family: 'Inter', sans-serif; color: var(--text); background: var(--bg); outline: none; }
  .timeline-note { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; margin-bottom: 8px; font-size: 13.5px; color: var(--text-muted); line-height: 1.6; }
  .extracted-chips { display: flex; flex-wrap: wrap; gap: 5px; }
  .chip { font-size: 11.5px; padding: 3px 9px; border-radius: 20px; }
  .chip-fact { background: var(--accent-soft); color: var(--text-muted); }
  .chip-interest { background: var(--accent-soft); color: var(--accent); }
  .chip-reminder { background: var(--accent-soft); color: var(--accent); }

  /* ADD UPDATE */
  .add-update-card { background: var(--surface); border: 2px dashed var(--border-strong); border-radius: var(--radius); padding: 18px; }
  .add-update-title { font-size: 13px; font-weight: 500; color: var(--text-muted); margin-bottom: 12px; }
  .input-tabs { display: flex; gap: 6px; margin-bottom: 12px; }
  .input-tab { padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; border: 1px solid var(--border-strong); background: none; color: var(--text-muted); font-family: 'Inter', sans-serif; transition: all 0.15s; }
  .input-tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }
  .note-textarea { width: 100%; padding: 10px 12px; border: 1px solid var(--border-strong); border-radius: 8px; font-size: 13.5px; font-family: 'Inter', sans-serif; color: var(--text); background: var(--bg); outline: none; resize: none; line-height: 1.6; transition: border-color 0.15s; }
  .note-textarea:focus { border-color: var(--accent); }
  .update-footer { display: flex; justify-content: flex-end; margin-top: 10px; }

  /* AI PROCESSING */
  .processing-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--accent); background: var(--accent-soft); padding: 4px 10px; border-radius: 20px; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ADD CONTACT MODAL */
  .modal-overlay { position: fixed; inset: 0; background: rgba(42,37,31,0.4); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; overflow-y: auto; }
  .modal { background: var(--surface); border-radius: var(--radius-lg); padding: 28px; width: 100%; max-width: 480px; box-shadow: var(--shadow-lg); }
  .modal-title { font-family: 'Inter', sans-serif; font-size: 20px; font-weight: 600; margin-bottom: 20px; }
  .form-row { margin-bottom: 14px; }
  .form-label { font-size: 12px; font-weight: 500; color: var(--text-muted); margin-bottom: 5px; display: block; letter-spacing: 0.3px; }
  .form-input { width: 100%; padding: 9px 12px; border: 1px solid var(--border-strong); border-radius: 8px; font-size: 13.5px; font-family: 'Inter', sans-serif; color: var(--text); background: var(--bg); outline: none; transition: border-color 0.15s; }
  .form-input:focus { border-color: var(--accent); }
  .form-select { width: 100%; padding: 9px 12px; border: 1px solid var(--border-strong); border-radius: 8px; font-size: 13.5px; font-family: 'Inter', sans-serif; color: var(--text); background: var(--bg); outline: none; }
  .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }


  /* REMINDER BADGE */
  .reminder-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 3px 8px; border-radius: 20px; background: var(--accent-soft); color: var(--accent); }
  .reminder-badge.overdue { background: rgba(166,68,45,0.10); color: var(--warn); }

  /* EMPTY STATE */
  .empty-state { text-align: center; padding: 60px 20px; color: var(--text-subtle); }
  .empty-state-title { font-family: 'Inter', sans-serif; font-size: 18px; color: var(--text-muted); margin-bottom: 8px; }
  .empty-state-sub { font-size: 13.5px; }

  @media (max-width: 700px) {
    .profile-body { grid-template-columns: 1fr; }
    .profile-header { flex-direction: column; }
    .contacts-grid { grid-template-columns: 1fr; }
    .nav-tabs { display: none; }
  }
`;

// ── AVATAR COLORS ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: "#DCE4D7", text: "#4A5C3E" },
  { bg: "#E8E2DC", text: "#6B5E52" },
  { bg: "#D7DDE8", text: "#4A5680" },
  { bg: "#E8DCD7", text: "#7A4A42" },
  { bg: "#DDE8E0", text: "#3A6B50" },
  { bg: "#E8E8D7", text: "#6B6A3A" },
];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name) {
  return name.split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
}


// ── HELPERS ───────────────────────────────────────────────────────────────────

// Handles both "YYYY-MM-DD" and the year-less "--MM-DD" format from the import
function normalizeDateStr(dateStr) {
  if (!dateStr) return null;
  if (dateStr.startsWith("--")) return `2000${dateStr.slice(1)}`; // 2000 = leap year
  return dateStr;
}

function daysUntil(dateStr) {
  const norm = normalizeDateStr(dateStr);
  if (!norm) return Infinity;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(norm + "T00:00:00");
  if (isNaN(d)) return Infinity;
  d.setFullYear(today.getFullYear());
  if (d < today) d.setFullYear(today.getFullYear() + 1);
  return Math.round((d - today) / 86400000);
}
function formatDate(dateStr) {
  const norm = normalizeDateStr(dateStr);
  if (!norm) return "";
  const d = new Date(norm + "T00:00:00");
  if (isNaN(d)) return dateStr;
  // Year-less birthdays: show "Mar 23" without a year
  if (dateStr.startsWith("--")) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function isOverdue(dateStr) {
  const norm = normalizeDateStr(dateStr);
  if (!norm) return false;
  return new Date(norm + "T00:00:00") < new Date();
}
// ── DRIFT DETECTION ───────────────────────────────────────────────────────────
function getCategories(contact) {
  if (contact.categories?.length) return contact.categories;
  if (contact.category) return [contact.category];
  return ["friend"];
}

const CATEGORY_CADENCE = { family: 30, friend: 60, colleague: 75, business: 90 };

function humanizeCadence(days) {
  if (days <= 14) return `~${days} days`;
  if (days <= 45) return `~${Math.round(days / 7)} weeks`;
  if (days <= 50) return "~1 month";
  return `~${Math.round(days / 30)} months`;
}

function daysSinceLastUpdate(contact) {
  if (contact.lastContact) return Math.floor((Date.now() - new Date(contact.lastContact)) / 86400000);
  if (!contact.updates?.length) return null;
  const latest = contact.updates.reduce((max, u) => (u.date > max ? u.date : max), "");
  return latest ? Math.floor((Date.now() - new Date(latest)) / 86400000) : null;
}

function computeDriftThreshold(contact) {
  return Math.min(...getCategories(contact).map(cat => CATEGORY_CADENCE[cat] ?? 60));
}

function computeDrift(contact) {
  const daysSince = daysSinceLastUpdate(contact);
  const threshold = computeDriftThreshold(contact);
  if (daysSince === null) return { daysSince: null, threshold, daysOverdue: 0, isDrifting: false };
  const daysOverdue = daysSince - threshold;
  return { daysSince, threshold, daysOverdue, isDrifting: daysOverdue > 0 };
}

// ── OPENAI API ────────────────────────────────────────────────────────────────
async function processNoteWithClaude(noteText) {
  const prompt = `You are helping process a personal CRM note. Extract structured information from this note and return ONLY valid JSON with no markdown, no extra text.

Note: "${noteText}"

Return JSON with this exact structure:
{
  "facts": ["array of factual updates about the person, max 3"],
  "interests": ["array of interests or passions mentioned, max 3"],
  "reminders": ["array of follow-up actions to take, max 2"]
}

Keep each item short (under 8 words). If nothing fits a category, return an empty array.`;

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return { facts: [], interests: [], reminders: [] };
  }
}

// ── GENERATE FOLLOW-UP ────────────────────────────────────────────────────────
async function generateFollowUpWithClaude(contactName, noteText, extracted) {
  const prompt = `You are a personal relationship assistant. Based on a note logged about ${contactName}, generate a follow-up action and a short draft message to send them.

Note: "${noteText}"
Extracted facts: ${JSON.stringify(extracted?.facts || [])}
Extracted reminders: ${JSON.stringify(extracted?.reminders || [])}

Return ONLY valid JSON with no markdown, no extra text:
{
  "action": "A short specific action to take (under 12 words, starts with a verb, e.g. 'Send her the community space concept doc')",
  "message": "A warm, natural draft message to send to ${contactName} (2-4 sentences, casual and genuine, references something specific from the note, no subject line)"
}`;

  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    })
  });
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return { action: "", message: "" };
  }
}
export default function App() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCats, setFilterCats] = useState([]);
  const [, setTick] = useState(0);

  const syncTimers = useRef({});

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  function syncContact(contact) {
    clearTimeout(syncTimers.current[contact.id]);
    syncTimers.current[contact.id] = setTimeout(async () => {
      const { error } = await supabase.from("contacts").upsert([{ id: contact.id, data: contact }]);
      if (error) console.error("[CRM] sync failed:", contact.id, error.message);
      delete syncTimers.current[contact.id];
    }, 600);
  }

  // Load from Supabase on mount + lazy migrations
  useEffect(() => {
    supabase.from("contacts").select("data").then(({ data, error }) => {
      if (!error) {
        const loaded = data.map(r => r.data);
        const SIX_MONTHS = 180 * 86400000;
        const migrated = loaded.map(c => {
          let contact = c;
          // Backfill lastContact from updates if missing
          if (!contact.lastContact && contact.updates?.length) {
            const latest = contact.updates.reduce((max, u) => (u.date > max ? u.date : max), "");
            if (latest) contact = { ...contact, lastContact: latest };
          }
          // Clear stale followUp entries (> 180 days overdue)
          if (contact.followUp?.date && Date.now() - new Date(contact.followUp.date).getTime() > SIX_MONTHS) {
            contact = { ...contact, followUp: null };
          }
          return contact;
        });
        setContacts(migrated);
        // Sync contacts that changed during migration
        migrated.forEach((c, i) => {
          if (c !== loaded[i]) syncContact(c);
        });
      }
      setLoading(false);
    });
  }, []);

  const selected = contacts.find(c => c.id === selectedId);

  function openProfile(id) { setSelectedId(id); setView("profile"); }
  function deleteContact(id) {
    setContacts(prev => prev.filter(c => c.id !== id));
    supabase.from("contacts").delete().eq("id", id).then(({ error }) => {
      if (error) console.error("[CRM] delete failed:", id, error.message);
    });
  }

  function handleReachedOut(id) {
    updateContact(id, { lastContact: new Date().toISOString().slice(0, 10) });
  }
  function handleSnooze(id, days) {
    const until = new Date();
    until.setDate(until.getDate() + days);
    const c = contacts.find(x => x.id === id);
    updateContact(id, { snoozedUntil: until.toISOString().slice(0, 10), snoozeCount: (c?.snoozeCount ?? 0) + 1 });
  }

  function addContact(data) {
    const now = new Date().toISOString();
    const nc = { ...data, id: crypto.randomUUID(), updates: [], lastContact: now.slice(0, 10), snoozedUntil: null, snoozeCount: 0, lastModified: now };
    const updated = [...contacts, nc];
    setContacts(updated);
    syncContact(nc);
    openProfile(nc.id);
  }
  function updateContact(id, patch) {
    const updated = contacts.map(c => c.id === id ? { ...c, ...patch, lastModified: new Date().toISOString() } : c);
    setContacts(updated);
    syncContact(updated.find(c => c.id === id));
  }
  function addUpdate(contactId, update) {
    const updated = contacts.map(c => {
      if (c.id !== contactId) return c;
      const newUpdates = [update, ...c.updates].slice(0, 50);
      const newLastContact = !c.lastContact || update.date > c.lastContact ? update.date : c.lastContact;
      return { ...c, updates: newUpdates, lastContact: newLastContact, lastModified: new Date().toISOString() };
    });
    setContacts(updated);
    syncContact(updated.find(c => c.id === contactId));
  }

  const upcomingBirthdays = contacts
    .filter(c => c.birthday)
    .map(c => ({ ...c, days: daysUntil(c.birthday) }))
    .filter(c => c.days <= 14)
    .sort((a, b) => a.days - b.days);

  const driftingContacts = contacts
    .filter(c => !c.snoozedUntil || new Date(c.snoozedUntil) <= new Date())
    .map(c => ({ ...c, drift: computeDrift(c) }))
    .filter(c => c.drift.isDrifting)
    .sort((a, b) => (b.drift.daysSince / b.drift.threshold) - (a.drift.daysSince / a.drift.threshold));

  if (loading) return (
    <>
      <style>{CSS}</style>
      <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 18, color: "var(--text-subtle)" }}>Loading your contacts…</div>
      </div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <nav className="nav">
          <div className="nav-brand">people<span>.</span>crm</div>
          <div className="nav-tabs">
            <button className={`nav-tab ${view === "dashboard" ? "active" : ""}`} onClick={() => setView("dashboard")}>Dashboard</button>
            <button className={`nav-tab ${view === "contacts" || view === "profile" ? "active" : ""}`} onClick={() => setView("contacts")}>Contacts</button>
          </div>
          <button className="nav-add" onClick={() => setShowAddModal(true)}>+ New contact</button>
        </nav>

        <main className="main">
          {view === "dashboard" && (
            <Dashboard
              contacts={contacts}
              driftingContacts={driftingContacts}
              upcomingBirthdays={upcomingBirthdays}
              onOpenProfile={openProfile}
              onReachedOut={handleReachedOut}
              onSnooze={handleSnooze}
            />
          )}
          {view === "contacts" && (
            <ContactsList
              contacts={contacts}
              search={search} setSearch={setSearch}
              filterCats={filterCats} setFilterCats={setFilterCats}
              onOpenProfile={openProfile}
            />
          )}
          {view === "profile" && selected && (
            <ContactProfile
              contact={selected}
              onBack={() => setView("contacts")}
              onUpdate={(patch) => updateContact(selected.id, patch)}
              onAddUpdate={(u) => addUpdate(selected.id, u)}
              onDelete={() => { deleteContact(selected.id); setView("contacts"); }}
            />
          )}
        </main>

        {showAddModal && (
          <AddContactModal onClose={() => setShowAddModal(false)} onAdd={addContact} />
        )}
      </div>
    </>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ contacts, driftingContacts, upcomingBirthdays, onOpenProfile, onReachedOut, onSnooze }) {
  const [expandedMore, setExpandedMore] = useState(false);
  const [snoozeOpenId, setSnoozeOpenId] = useState(null);
  const [fadingIds, setFadingIds] = useState(new Set());

  const today3 = driftingContacts.slice(0, 3);
  const more = driftingContacts.slice(3);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase();

  // Spotlight: birthday today > stale profile (>180d no contact) > nothing
  const birthdayToday = contacts.find(c => c.birthday && daysUntil(c.birthday) === 0);
  const staleProfile = !birthdayToday
    ? contacts
        .filter(c => {
          if (!c.updates?.length) return false;
          const maxDate = c.updates.reduce((max, u) => (u.date > max ? u.date : max), "");
          return maxDate && (Date.now() - new Date(maxDate).getTime()) > 180 * 86400000;
        })
        .sort((a, b) => {
          const maxA = a.updates.reduce((max, u) => (u.date > max ? u.date : max), "");
          const maxB = b.updates.reduce((max, u) => (u.date > max ? u.date : max), "");
          return new Date(maxA) - new Date(maxB);
        })[0]
    : null;
  const spotlightContact = birthdayToday || staleProfile || null;

  const thisWeekBirthdays = upcomingBirthdays.filter(c => c.days <= 14);

  function handleReached(id) {
    setFadingIds(prev => new Set([...prev, id]));
    setTimeout(() => {
      onReachedOut(id);
      setFadingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }, 220);
  }

  function handleSnoozeOption(id, days) {
    onSnooze(id, days);
    setSnoozeOpenId(null);
  }

  useEffect(() => {
    if (!snoozeOpenId) return;
    const handler = () => setSnoozeOpenId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [snoozeOpenId]);

  return (
    <>
      {/* GREETING */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "var(--text-subtle)", marginBottom: 8 }}>{dateStr}</div>
        <h1 style={{ fontSize: 44, fontWeight: 500, color: "var(--text)", letterSpacing: "-0.02em", marginBottom: 10, lineHeight: 1.1, fontFamily: "'Inter', sans-serif" }}>
          {greeting}, Patrick.
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
          {today3.length > 0
            ? `${driftingContacts.length} ${driftingContacts.length === 1 ? "person" : "people"} you might want to reach today.`
            : "You're caught up. Nice work today."}
        </p>
      </div>

      {/* TODAY SECTION */}
      {today3.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>TODAY · {today3.length}</div>
            {more.length > 0 && <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{more.length} more waiting</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {today3.map(c => {
              const { daysSince } = c.drift;
              const lastUpdate = c.updates?.[0];
              const snippet = lastUpdate?.raw ? lastUpdate.raw.split("\n")[0].slice(0, 90) : null;
              const fading = fadingIds.has(c.id);
              return (
                <div key={c.id} className="today-card" style={{ opacity: fading ? 0 : 1, transition: "opacity 0.22s" }}>
                  <div className="today-card-header">
                    <Avatar contact={c} size={42} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 1 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>{c.role}</div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-subtle)", flexShrink: 0 }}>{daysSince}d since you talked</div>
                  </div>
                  {snippet && (
                    <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.55, marginBottom: 2 }}>
                      <span className="last-chip">LAST</span>
                      <span style={{ fontStyle: "italic" }}>{snippet}{lastUpdate.raw.split("\n")[0].length > 90 || lastUpdate.raw.includes("\n") ? "…" : ""}</span>
                    </div>
                  )}
                  <div className="today-card-actions">
                    <button className="btn-reached" onClick={() => handleReached(c.id)}>✓ I reached out</button>
                    <div style={{ position: "relative" }}>
                      <button className="btn-snooze" onClick={e => { e.stopPropagation(); setSnoozeOpenId(snoozeOpenId === c.id ? null : c.id); }}>
                        Snooze ▾
                      </button>
                      {snoozeOpenId === c.id && (
                        <div className="snooze-dropdown" onClick={e => e.stopPropagation()}>
                          <div className="snooze-option" onClick={() => handleSnoozeOption(c.id, 3)}>This week</div>
                          <div className="snooze-option" onClick={() => handleSnoozeOption(c.id, 7)}>Next week</div>
                          <div className="snooze-option" onClick={() => handleSnoozeOption(c.id, 30)}>Next month</div>
                        </div>
                      )}
                    </div>
                    <button style={{ marginLeft: "auto", fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif" }} onClick={() => onOpenProfile(c.id)}>View profile →</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* +M MORE */}
          {more.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {!expandedMore ? (
                <button
                  style={{ width: "100%", padding: "11px 18px", background: "var(--surface)", border: "1px dashed var(--border-strong)", borderRadius: "var(--radius)", fontSize: 13, color: "var(--text-muted)", cursor: "pointer", fontFamily: "'Inter', sans-serif", textAlign: "left" }}
                  onClick={() => setExpandedMore(true)}
                >
                  + {more.length} more {more.length === 1 ? "person" : "people"} you haven't talked to in a while
                </button>
              ) : (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 18px" }}>
                  <div className="section-title" style={{ marginBottom: 10 }}>BEEN A WHILE</div>
                  {more.map(c => (
                    <div key={c.id} className="more-row" onClick={() => onOpenProfile(c.id)}>
                      <Avatar contact={c} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="more-row-name">{c.name}</div>
                        <div className="more-row-role">{c.role}</div>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-subtle)", flexShrink: 0 }}>~{Math.round(c.drift.daysSince / 7)}w since you talked</div>
                    </div>
                  ))}
                  <button style={{ marginTop: 10, fontSize: 12, color: "var(--text-subtle)", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif" }} onClick={() => setExpandedMore(false)}>Hide</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SPOTLIGHT */}
      {spotlightContact && (
        <div style={{ marginBottom: 28 }}>
          <div className="section-title">SPOTLIGHT</div>
          <div className="spotlight-card">
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
              <Avatar contact={spotlightContact} size={48} />
              <div>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", background: birthdayToday ? "var(--accent-soft)" : "rgba(107,96,85,0.10)", color: birthdayToday ? "var(--accent)" : "var(--text-muted)", padding: "2px 7px", borderRadius: 4, textTransform: "uppercase", marginBottom: 4, display: "inline-block" }}>
                  {birthdayToday ? "🎂 Birthday today" : "Been a while"}
                </span>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{spotlightContact.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-subtle)" }}>{spotlightContact.role}</div>
              </div>
            </div>
            {!birthdayToday && spotlightContact.updates?.[0]?.raw && (
              <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, fontStyle: "italic", marginBottom: 12 }}>
                "{spotlightContact.updates[0].raw.split("\n")[0].slice(0, 120)}"
              </div>
            )}
            <button style={{ fontSize: 12.5, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "'Inter', sans-serif", padding: 0 }} onClick={() => onOpenProfile(spotlightContact.id)}>
              Open profile →
            </button>
          </div>
        </div>
      )}

      {/* THIS WEEK */}
      {thisWeekBirthdays.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div className="section-title">THIS WEEK</div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
            {thisWeekBirthdays.map((c, i) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: i < thisWeekBirthdays.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer" }} onClick={() => onOpenProfile(c.id)}>
                <span style={{ fontSize: 18 }}>🎂</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>{c.name}'s birthday</span>
                  <span style={{ fontSize: 12, color: "var(--text-subtle)", marginLeft: 8 }}>{formatDate(c.birthday)}</span>
                </div>
                <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{c.days === 0 ? "Today 🎂" : `in ${c.days} day${c.days !== 1 ? "s" : ""}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FULL EMPTY STATE */}
      {today3.length === 0 && !spotlightContact && thisWeekBirthdays.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-title">Nothing pressing today.</div>
          <div className="empty-state-sub">A good time to log something you remembered.</div>
        </div>
      )}
    </>
  );
}

// ── CONTACTS LIST ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "friend", label: "Friends" },
  { value: "colleague", label: "Colleagues" },
  { value: "business", label: "Business" },
  { value: "family", label: "Family" },
];

function ContactsList({ contacts, search, setSearch, filterCats, setFilterCats, onOpenProfile }) {
  function toggleCat(val) {
    setFilterCats(prev => prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val]);
  }

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.name.toLowerCase().includes(q) || c.role?.toLowerCase().includes(q) || c.tags?.some(t => t.toLowerCase().includes(q));
    const matchCat = filterCats.length === 0 || filterCats.every(fc => getCategories(c).includes(fc));
    return matchSearch && matchCat;
  });
  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 600, color: "var(--text)" }}>All contacts</h1>
      </div>
      <div className="contacts-toolbar">
        <input className="search-input" placeholder="Search by name, role, tag…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="cat-filter-bar" style={{ marginBottom: 18 }}>
        <button className={`cat-filter-btn ${filterCats.length === 0 ? "active" : ""}`} onClick={() => setFilterCats([])}>All</button>
        {CATEGORIES.filter(c => c.value !== "all").map(cat => {
          const hypothetical = filterCats.includes(cat.value)
            ? filterCats
            : [...filterCats, cat.value];
          const count = contacts.filter(c =>
            hypothetical.length === 0
              ? getCategories(c).includes(cat.value)
              : hypothetical.every(fc => getCategories(c).includes(fc))
          ).length;
          return (
            <button key={cat.value} className={`cat-filter-btn ${filterCats.includes(cat.value) ? "active" : ""}`} onClick={() => toggleCat(cat.value)}>
              {cat.label}
              <span style={{ marginLeft: 5, opacity: 0.6 }}>{count}</span>
            </button>
          );
        })}
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No contacts found</div>
          <div className="empty-state-sub">Try a different search or add a new contact.</div>
        </div>
      ) : (
        <div className="contacts-grid">
          {filtered.map(c => <ContactCard key={c.id} contact={c} onClick={() => onOpenProfile(c.id)} />)}
        </div>
      )}
    </>
  );
}

// ── CONTACT CARD ──────────────────────────────────────────────────────────────
function ContactCard({ contact: c, onClick }) {
  return (
    <div className="contact-card" onClick={onClick}>
      <div className="contact-card-top">
        <Avatar contact={c} size={46} />
        <div className="contact-card-info">
          <div className="contact-name">{c.name}</div>
          <div className="contact-role">{c.role}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {getCategories(c).map(cat => <span key={cat} className={`contact-category cat-${cat}`}>{cat}</span>)}
      </div>
      {c.tags?.length > 0 && (
        <div className="contact-tags">{c.tags.slice(0, 3).map(t => <span key={t} className="tag">{t}</span>)}</div>
      )}
    </div>
  );
}

// ── AVATAR COMPONENT ─────────────────────────────────────────────────────────
function Avatar({ contact, size = 46, editable = false, onUpload }) {
  const col = avatarColor(contact.name);
  const fileRef = useRef();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase() || 'jpg';
    const path = `${contact.id}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) return;
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    onUpload(urlData.publicUrl);
  }

  const baseStyle = {
    width: size, height: size, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Inter', sans-serif", fontSize: size * 0.34, fontWeight: 600,
    flexShrink: 0, overflow: "hidden", position: "relative",
  };

  return (
    <div style={{ position: "relative", display: "inline-block", flexShrink: 0 }}>
      <div style={{ ...baseStyle, background: contact.photo ? "transparent" : col.bg, color: col.text }}>
        {contact.photo
          ? <img src={contact.photo} alt={contact.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
          : initials(contact.name)
        }
      </div>
      {editable && (
        <>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              background: "rgba(44,50,64,0.45)", display: "flex",
              alignItems: "center", justifyContent: "center",
              cursor: "pointer", opacity: 0, transition: "opacity 0.15s",
              fontSize: 13, color: "#fff", fontWeight: 500,
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0}
          >
            {contact.photo ? "Change" : "Upload"}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        </>
      )}
    </div>
  );
}

// ── CONTACT PROFILE ───────────────────────────────────────────────────────────
function ContactProfile({ contact: c, onBack, onUpdate, onAddUpdate, onDelete }) {
  const col = avatarColor(c.name);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editCategories, setEditCategories] = useState(["friend"]);
  const [editBirthday, setEditBirthday] = useState("");
  const [editBirthdayNoYear, setEditBirthdayNoYear] = useState(false);
  const [editFollowUpDate, setEditFollowUpDate] = useState("");
  const [editImportantDates, setEditImportantDates] = useState([]);
  const nameEditRef = useRef(null);
  const roleEditRef = useRef(null);
  const companyEditRef = useRef(null);
  const phoneEditRef = useRef(null);
  const locationEditRef = useRef(null);
  const emailEditRef = useRef(null);
  const linkedinEditRef = useRef(null);
  const instagramEditRef = useRef(null);
  const tagsEditRef = useRef(null);
  const bioEditRef = useRef(null);
  const followUpNoteEditRef = useRef(null);

  function startEdit() {
    setEditCategories(getCategories(c));
    const rawBirthday = c.birthday || "";
    const noYear = rawBirthday.startsWith("--");
    setEditBirthdayNoYear(noYear);
    setEditBirthday(noYear ? "2000-" + rawBirthday.slice(2) : rawBirthday);
    setEditFollowUpDate(c.followUp?.date || "");
    setEditImportantDates(c.importantDates || []);
    setEditing(true);
  }

  function saveEdit() {
    const birthday = editBirthday
      ? (editBirthdayNoYear ? "--" + editBirthday.slice(5) : editBirthday)
      : null;
    onUpdate({
      name: nameEditRef.current.value,
      role: roleEditRef.current.value,
      categories: editCategories,
      company: companyEditRef.current.value,
      phone: phoneEditRef.current.value,
      location: locationEditRef.current.value,
      email: emailEditRef.current.value,
      linkedin: linkedinEditRef.current.value,
      instagram: instagramEditRef.current.value,
      bio: bioEditRef.current.value,
      birthday,
      tags: tagsEditRef.current.value ? tagsEditRef.current.value.split(",").map(t => t.trim()).filter(Boolean) : [],
      followUp: editFollowUpDate ? { date: editFollowUpDate, note: followUpNoteEditRef.current.value } : null,
      importantDates: editImportantDates.filter(d => d.name.trim() || d.date),
    });
    setEditing(false);
  }

  return (
    <>
      <button className="profile-back" onClick={onBack}>← Back to contacts</button>

      <div className="profile-header">
        <Avatar contact={c} size={72} editable onUpload={photo => onUpdate({ photo })} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="profile-name">{c.name}</div>
          <div className="profile-role">{c.role}</div>
          <div className="profile-meta" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            {getCategories(c).map(cat => <span key={cat} className={`contact-category cat-${cat}`} style={{ margin: 0 }}>{cat}</span>)}
            {c.tags?.map(t => <span key={t} className="tag" style={{ margin: 0 }}>{t}</span>)}
            {c.location && <span style={{ fontSize: 12, color: "var(--text-subtle)", display: "flex", alignItems: "center", gap: 3 }}>📍 {c.location}</span>}
          </div>
        </div>
        <div className="profile-actions">
          <button className="btn-secondary" onClick={startEdit}>✏ Edit profile</button>
          <button className="btn-primary" onClick={() => document.getElementById("add-update-area")?.scrollIntoView({ behavior: "smooth" })}>+ Log update</button>
          <button style={{ background: "none", border: "1px solid rgba(166,68,45,0.25)", color: "var(--warn)", padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter', sans-serif" }} onClick={() => setConfirmDelete(true)}>Delete</button>
        </div>
      </div>

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(false)}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>Delete {c.name}?</div>
            <div style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.6 }}>
              This will permanently remove {c.name} and all their logs. This cannot be undone.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn-secondary" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button style={{ background: "var(--warn)", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'Inter', sans-serif" }} onClick={onDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PANEL */}
      {editing && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 14, padding: 24, marginBottom: 18 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 18, color: "var(--text)" }}>Edit profile</div>
          <div className="form-row-2">
            <div className="form-row">
              <label className="form-label">Name</label>
              <input className="form-input" ref={nameEditRef} defaultValue={c.name || ""} />
            </div>
            <div className="form-row">
              <label className="form-label">Category</label>
              <div className="cat-picker">
                {["friend","colleague","business","family"].map(opt => (
                  <span
                    key={opt}
                    className={`contact-category cat-${opt} cat-pick-btn${editCategories.includes(opt) ? " picked" : ""}`}
                    onClick={() => setEditCategories(prev =>
                      prev.includes(opt)
                        ? prev.length > 1 ? prev.filter(x => x !== opt) : prev
                        : [...prev, opt]
                    )}
                  >{opt}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-row">
              <label className="form-label">Role / title</label>
              <input className="form-input" ref={roleEditRef} defaultValue={c.role || ""} placeholder="e.g. Program Officer" />
            </div>
            <div className="form-row">
              <label className="form-label">Company</label>
              <input className="form-input" ref={companyEditRef} defaultValue={c.company || ""} placeholder="Company or org" />
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-row">
              <label className="form-label">Location</label>
              <input className="form-input" ref={locationEditRef} defaultValue={c.location || ""} placeholder="City, Country" />
            </div>
            <div className="form-row">
              <label className="form-label">Phone</label>
              <input className="form-input" ref={phoneEditRef} defaultValue={c.phone || ""} placeholder="+1 234 567 8900" />
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-row">
              <label className="form-label">Birthday</label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input className="form-input" type="date" value={editBirthday} onChange={e => setEditBirthday(e.target.value)} style={{ flex: 1 }} />
                {editBirthday && <button type="button" onClick={() => setEditBirthday("")} style={{ fontSize: 12, color: "var(--text-subtle)", background: "none", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "0 10px", cursor: "pointer" }}>✕</button>}
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, fontSize: 12, color: "var(--text-subtle)", cursor: "pointer" }}>
                <input type="checkbox" checked={editBirthdayNoYear} onChange={e => setEditBirthdayNoYear(e.target.checked)} />
                Year unknown
              </label>
            </div>
            <div className="form-row" /></div>
          <div className="form-row-2">
            <div className="form-row">
              <label className="form-label">Email</label>
              <input className="form-input" ref={emailEditRef} defaultValue={c.email || ""} placeholder="email@example.com" />
            </div>
            <div className="form-row">
              <label className="form-label">LinkedIn</label>
              <input className="form-input" ref={linkedinEditRef} defaultValue={c.linkedin || ""} placeholder="linkedin.com/in/..." />
            </div>
          </div>
          <div className="form-row-2">
            <div className="form-row">
              <label className="form-label">Instagram</label>
              <input className="form-input" ref={instagramEditRef} defaultValue={c.instagram || ""} placeholder="@handle" />
            </div>
            <div className="form-row" />
          </div>
          <div className="form-row">
            <label className="form-label">Tags (comma separated)</label>
            <input className="form-input" ref={tagsEditRef} defaultValue={(c.tags || []).join(", ")} placeholder="e.g. NGO, Taiwan, education" />
          </div>
          <div className="form-row">
            <label className="form-label">About this person</label>
            <textarea className="note-textarea" rows={3} ref={bioEditRef} defaultValue={c.bio || ""} placeholder="Your relationship with them, key context…" />
          </div>
          <div className="form-row">
            <label className="form-label">Important dates</label>
            {editImportantDates.map((d, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input className="form-input" value={d.name} onChange={e => setEditImportantDates(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Label (e.g. Anniversary)" style={{ flex: 2 }} />
                <input className="form-input" type="date" value={d.date || ""} onChange={e => setEditImportantDates(prev => prev.map((x, j) => j === i ? { ...x, date: e.target.value } : x))} style={{ flex: 1 }} />
                <button type="button" onClick={() => setEditImportantDates(prev => prev.filter((_, j) => j !== i))} style={{ fontSize: 12, color: "var(--text-subtle)", background: "none", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "0 10px", cursor: "pointer" }}>✕</button>
              </div>
            ))}
            <button type="button" className="btn-secondary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => setEditImportantDates(prev => [...prev, { name: "", date: "" }])}>+ Add date</button>
          </div>
          <div className="form-row-2">
            <div className="form-row">
              <label className="form-label">Follow-up date</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input className="form-input" type="date" value={editFollowUpDate} onChange={e => setEditFollowUpDate(e.target.value)} style={{ flex: 1 }} />
                {editFollowUpDate && <button type="button" onClick={() => { setEditFollowUpDate(""); if (followUpNoteEditRef.current) followUpNoteEditRef.current.value = ""; }} style={{ fontSize: 12, color: "var(--text-subtle)", background: "none", border: "1px solid var(--border-strong)", borderRadius: 6, padding: "0 10px", cursor: "pointer" }}>✕</button>}
              </div>
            </div>
            <div className="form-row">
              <label className="form-label">Follow-up note</label>
              <input className="form-input" ref={followUpNoteEditRef} defaultValue={c.followUp?.note || ""} placeholder="What to follow up about…" disabled={!editFollowUpDate} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
            <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn-primary" onClick={saveEdit}>Save changes</button>
          </div>
        </div>
      )}

      <div className="profile-body">
        <div className="profile-sidebar">
          {/* Bio */}
          {c.bio && (
            <div className="info-card">
              <div className="info-card-title">About</div>
              <p className="bio-text">{c.bio}</p>
            </div>
          )}

          {/* Contact info */}
          <div className="info-card">
            <div className="info-card-title">Contact info</div>
            {c.email && <div className="info-row"><span className="info-icon">✉️</span><div className="info-content"><div className="info-label">Email</div><a className="info-link" href={`mailto:${c.email}`}>{c.email}</a></div></div>}
            {c.phone && <div className="info-row"><span className="info-icon">📞</span><div className="info-content"><div className="info-label">Phone</div><span className="info-value">{c.phone}</span></div></div>}
            {c.linkedin && <div className="info-row"><span className="info-icon">💼</span><div className="info-content"><div className="info-label">LinkedIn</div><span className="info-value">{c.linkedin}</span></div></div>}
            {c.instagram && <div className="info-row"><span className="info-icon">📸</span><div className="info-content"><div className="info-label">Instagram</div><span className="info-value">{c.instagram}</span></div></div>}
            {c.company && <div className="info-row"><span className="info-icon">🏢</span><div className="info-content"><div className="info-label">Company</div><span className="info-value">{c.company}</span></div></div>}
            {c.location && <div className="info-row"><span className="info-icon">📍</span><div className="info-content"><div className="info-label">Location</div><span className="info-value">{c.location}</span></div></div>}
          </div>

          {/* Drift indicator */}
          {(() => {
            const { daysSince, threshold, daysOverdue, isDrifting } = computeDrift(c);
            const pct = daysSince === null ? 0 : Math.min(100, Math.round((daysSince / threshold) * 100));
            const barColor = isDrifting ? (daysOverdue > 60 ? "var(--warn)" : "var(--accent)") : "var(--accent)";
            return (
              <div className="info-card">
                <div className="info-card-title">Reconnect cadence</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>
                  <span>Catch up {humanizeCadence(threshold)}</span>
                  <span style={{ color: isDrifting ? barColor : "var(--accent)" }}>
                    {isDrifting ? `Been a while — ${daysOverdue}d overdue` : daysSince === null ? "No log yet" : `${threshold - daysSince}d remaining`}
                  </span>
                </div>
                <div style={{ height: 5, background: "var(--border)", borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
                  <div style={{ height: "100%", width: `${pct}%`, borderRadius: 2, background: barColor, transition: "width 0.4s" }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>
                  {daysSince === null ? "No log yet" : `Last contact ${daysSince}d ago`}
                  {" · "}{getCategories(c).join("/")} cadence
                </div>
              </div>
            );
          })()}

          {/* Dates */}
          {(c.birthday || c.importantDates?.length > 0) && (
            <div className="info-card">
              <div className="info-card-title">Important dates</div>
              <div className="dates-list">
                {c.birthday && (
                  <div className="date-row">
                    <span className="date-name">🎂 Birthday</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span className="date-val">{formatDate(c.birthday)}</span>
                      {daysUntil(c.birthday) <= 14 && <span className="date-badge">in {daysUntil(c.birthday)}d</span>}
                    </div>
                  </div>
                )}
                {c.importantDates?.map((d, i) => (
                  <div key={i} className="date-row">
                    <span className="date-name">📅 {d.name}</span>
                    <span className="date-val">{formatDate(d.date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up */}
          {c.followUp && (
            <div className="info-card" style={{ borderColor: isOverdue(c.followUp.date) ? "#fca5a5" : "var(--border)" }}>
              <div className="info-card-title">Follow-up reminder</div>
              <div style={{ marginBottom: 8 }}>
                <span className={`reminder-badge ${isOverdue(c.followUp.date) ? "overdue" : ""}`}>
                  {isOverdue(c.followUp.date) ? "Been a while" : `📅 ${formatDate(c.followUp.date)}`}
                </span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{c.followUp.note}</p>
              <button style={{ marginTop: 10, fontSize: 12, color: "var(--text-subtle)", background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
                onClick={() => onUpdate({ followUp: null })}>✓ I reached out</button>
            </div>
          )}
        </div>

        <div className="profile-main">
          {/* Timeline */}
          <div className="info-card">
            <div className="info-card-title">Update timeline</div>
            {c.updates.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-subtle)", fontSize: 13 }}>No updates yet. Log your first note below.</div>
            ) : (
              <div className="timeline">
                {c.updates.map(u => (
                  <TimelineEntry key={u.id} update={u}
                    onUpdateDate={(uid, newDate) => {
                      onUpdate({ updates: c.updates.map(x => x.id === uid ? { ...x, date: newDate } : x) });
                    }}
                    onMarkFollowUpDone={(uid) => {
                      onUpdate({ updates: c.updates.map(x => x.id === uid ? { ...x, followUpSuggestion: { ...x.followUpSuggestion, done: true } } : x) });
                    }}
                    onDelete={() => {
                      const newUpdates = c.updates.filter(x => x.id !== u.id);
                      const newLastContact = newUpdates.length > 0
                        ? newUpdates.reduce((max, x) => (x.date > max ? x.date : max), "")
                        : null;
                      onUpdate({ updates: newUpdates, lastContact: newLastContact });
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Add update */}
          <div id="add-update-area">
            <AddUpdateForm contactId={c.id} contactName={c.name} onAdd={onAddUpdate} />
          </div>
        </div>
      </div>
    </>
  );
}

// ── TIMELINE ENTRY ────────────────────────────────────────────────────────────
function TimelineEntry({ update, onUpdateDate, onMarkFollowUpDone, onDelete }) {
  const [editingDate, setEditingDate] = useState(false);
  const [dateVal, setDateVal] = useState(update.date);
  const [copied, setCopied] = useState(false);
  const fu = update.followUpSuggestion;

  function saveDate() {
    if (dateVal) onUpdateDate(update.id, dateVal);
    setEditingDate(false);
  }
  function copyMessage() {
    if (fu?.message) {
      navigator.clipboard.writeText(fu.message).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="timeline-entry">
      <div className={`timeline-dot ${update.type}`}>{update.type === "voice" ? "🎙" : "✏"}</div>
      <div className="timeline-content">
        <div className="timeline-header">
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>{update.type === "voice" ? "Voice note" : "Text note"}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {editingDate ? (
              <>
                <input className="timeline-date-input" type="date" value={dateVal} onChange={e => setDateVal(e.target.value)} />
                <button className="timeline-date-edit" onClick={saveDate}>Save</button>
                <button className="timeline-date-edit" style={{ color: "var(--text-subtle)" }} onClick={() => setEditingDate(false)}>✕</button>
              </>
            ) : (
              <>
                <span className="timeline-date">{formatDate(update.date)}</span>
                <button className="timeline-date-edit" onClick={() => { setDateVal(update.date); setEditingDate(true); }}>edit</button>
              </>
            )}
            {onDelete && <button className="timeline-delete" onClick={onDelete} title="Delete entry">✕</button>}
          </div>
        </div>
        <div className="timeline-note">{update.raw}</div>
        {update.extracted && (
          <div className="extracted-chips">
            {update.extracted.facts?.map((f, i) => <span key={i} className="chip chip-fact">{f}</span>)}
            {update.extracted.interests?.map((f, i) => <span key={i} className="chip chip-interest">{f}</span>)}
            {update.extracted.reminders?.map((f, i) => <span key={i} className="chip chip-reminder">↩ {f}</span>)}
          </div>
        )}

        {/* Follow-up suggestion */}
        {fu && !fu.done && (
          <div style={{ marginTop: 10, background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.6px", textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>✦ AI-suggested follow-up</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 8 }}>→ {fu.action}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, background: "var(--bg)", borderRadius: 8, padding: "10px 12px", marginBottom: 10, fontStyle: "italic" }}>
              "{fu.message}"
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-secondary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={copyMessage}>
                {copied ? "✓ Copied!" : "Copy message"}
              </button>
              <button className="btn-primary" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => onMarkFollowUpDone(update.id)}>
                ✓ I reached out
              </button>
            </div>
          </div>
        )}
        {fu && fu.done && (
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--accent)", display: "flex", alignItems: "center", gap: 4 }}>
            ✓ Follow-up completed
          </div>
        )}
      </div>
    </div>
  );
}
function AddUpdateForm({ contactId, contactName, onAdd }) {
  const [tab, setTab] = useState("text");
  const noteRef = useRef(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");

  async function handleSubmit() {
    const noteVal = noteRef.current.value;
    if (!noteVal.trim()) return;
    setProcessing(true);
    setProcessingStep("Extracting information…");
    let extracted = { facts: [], interests: [], reminders: [] };
    try { extracted = await processNoteWithClaude(noteVal); } catch {}

    setProcessingStep("Generating follow-up…");
    let followUpSuggestion = null;
    try {
      const fu = await generateFollowUpWithClaude(contactName, noteVal, extracted);
      if (fu.action || fu.message) followUpSuggestion = { ...fu, done: false, id: crypto.randomUUID() };
    } catch {}

    const update = {
      id: crypto.randomUUID(),
      type: tab,
      date,
      raw: noteVal,
      extracted,
      followUpSuggestion
    };
    onAdd(update);
    noteRef.current.value = "";
    setDate(new Date().toISOString().split("T")[0]);
    setProcessing(false);
    setProcessingStep("");
  }

  return (
    <div className="add-update-card">
      <div className="add-update-title">Log a new update</div>
      <div className="input-tabs">
        <button className={`input-tab ${tab === "text" ? "active" : ""}`} onClick={() => setTab("text")}>✏ Text note</button>
        <button className={`input-tab ${tab === "voice" ? "active" : ""}`} onClick={() => setTab("voice")}>🎙 Voice note</button>
      </div>
      {tab === "voice" && (
        <div style={{ fontSize: 12.5, color: "var(--text-subtle)", marginBottom: 8, background: "var(--bg)", padding: "8px 12px", borderRadius: 8 }}>
          Transcribe your voice note and paste it below — Claude will extract the key information automatically.
        </div>
      )}
      <textarea
        className="note-textarea"
        rows={4}
        placeholder={tab === "voice" ? "Paste your transcribed voice note here…" : "Write an update about this person…"}
        ref={noteRef}
        defaultValue=""
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>Date of update</label>
        <input
          className="timeline-date-input"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{ fontSize: 13, padding: "4px 8px" }}
        />
        <div style={{ flex: 1 }} />
        {processing ? (
          <div className="processing-badge">
            <span className="spin">⟳</span> {processingStep || "Claude is processing…"}
          </div>
        ) : (
          <button className="btn-primary" onClick={handleSubmit}>Save update</button>
        )}
      </div>
    </div>
  );
}

// ── ADD CONTACT MODAL ─────────────────────────────────────────────────────────
function AddContactModal({ onClose, onAdd }) {
  const [categories, setCategories] = useState(["friend"]);
  const [birthdayNoYear, setBirthdayNoYear] = useState(false);
  const nameRef = useRef(null);
  const roleRef = useRef(null);
  const companyRef = useRef(null);
  const phoneRef = useRef(null);
  const locationRef = useRef(null);
  const emailRef = useRef(null);
  const linkedinRef = useRef(null);
  const birthdayRef = useRef(null);
  const tagsRef = useRef(null);
  const bioRef = useRef(null);

  function handleAdd() {
    const name = nameRef.current.value;
    if (!name.trim()) return;
    const bval = birthdayRef.current.value;
    onAdd({
      name,
      role: roleRef.current.value,
      categories,
      company: companyRef.current.value,
      phone: phoneRef.current.value,
      location: locationRef.current.value,
      email: emailRef.current.value,
      linkedin: linkedinRef.current.value,
      instagram: "",
      bio: bioRef.current.value,
      birthday: bval ? (birthdayNoYear ? "--" + bval.slice(5) : bval) : null,
      tags: tagsRef.current.value ? tagsRef.current.value.split(",").map(t => t.trim()).filter(Boolean) : [],
      importantDates: [],
      followUp: null,
      lastContact: new Date().toISOString().slice(0, 10),
      snoozedUntil: null,
      snoozeCount: 0
    });
    onClose();
  }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Add new contact</div>
        <div className="form-row-2">
          <div className="form-row">
            <label className="form-label">Name *</label>
            <input className="form-input" ref={nameRef} defaultValue="" placeholder="Full name" />
          </div>
          <div className="form-row">
            <label className="form-label">Category</label>
            <div className="cat-picker">
              {["friend","colleague","business","family"].map(opt => (
                <span
                  key={opt}
                  className={`contact-category cat-${opt} cat-pick-btn${categories.includes(opt) ? " picked" : ""}`}
                  onClick={() => setCategories(prev =>
                    prev.includes(opt)
                      ? prev.length > 1 ? prev.filter(x => x !== opt) : prev
                      : [...prev, opt]
                  )}
                >{opt}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="form-row-2">
          <div className="form-row">
            <label className="form-label">Role / title</label>
            <input className="form-input" ref={roleRef} defaultValue="" placeholder="e.g. Program Officer" />
          </div>
          <div className="form-row">
            <label className="form-label">Company</label>
            <input className="form-input" ref={companyRef} defaultValue="" placeholder="Company or org" />
          </div>
        </div>
        <div className="form-row-2">
          <div className="form-row">
            <label className="form-label">Email</label>
            <input className="form-input" ref={emailRef} defaultValue="" placeholder="email@example.com" />
          </div>
          <div className="form-row">
            <label className="form-label">Phone</label>
            <input className="form-input" ref={phoneRef} defaultValue="" placeholder="+1 234 567 8900" />
          </div>
        </div>
        <div className="form-row-2">
          <div className="form-row">
            <label className="form-label">Location</label>
            <input className="form-input" ref={locationRef} defaultValue="" placeholder="City, Country" />
          </div>
          <div className="form-row">
            <label className="form-label">LinkedIn</label>
            <input className="form-input" ref={linkedinRef} defaultValue="" placeholder="linkedin.com/in/..." />
          </div>
        </div>
        <div className="form-row-2">
          <div className="form-row">
            <label className="form-label">Birthday</label>
            <input className="form-input" type="date" ref={birthdayRef} defaultValue="" />
            <label style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, fontSize: 12, color: "var(--text-subtle)", cursor: "pointer" }}>
              <input type="checkbox" checked={birthdayNoYear} onChange={e => setBirthdayNoYear(e.target.checked)} />
              Year unknown
            </label>
          </div>
          <div className="form-row">
            <label className="form-label">Tags (comma separated)</label>
            <input className="form-input" ref={tagsRef} defaultValue="" placeholder="e.g. NGO, Taiwan, education" />
          </div>
        </div>
        <div className="form-row">
          <label className="form-label">About this person</label>
          <textarea className="note-textarea" rows={3} ref={bioRef} defaultValue="" placeholder="Your relationship with them, key context…" />
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleAdd}>Add contact</button>
        </div>
      </div>
    </div>
  );
}
