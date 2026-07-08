import { useState } from "react";
import { parseCSV, parseVCard, detectDuplicates } from "../lib/importers.js";

export default function ImportModal({ contacts, onClose, onImport }) {
  const [rows, setRows] = useState(null); // [{draft, duplicateOf, checked}]
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);
    const text = await file.text();
    const drafts = /\.vcf$/i.test(file.name) ? parseVCard(text) : parseCSV(text);
    if (!drafts.length) {
      setError("解析不到任何聯絡人——請確認檔案是 CSV(含 name 欄)或 vCard(.vcf)。");
      setRows(null);
      return;
    }
    setRows(detectDuplicates(drafts, contacts).map(r => ({ ...r, checked: !r.duplicateOf })));
  }

  function toggle(i) {
    setRows(prev => prev.map((r, j) => (j === i ? { ...r, checked: !r.checked } : r)));
  }

  async function handleImport() {
    const selected = rows.filter(r => r.checked).map(r => r.draft);
    if (!selected.length) return;
    setImporting(true);
    const ok = await onImport(selected);
    setImporting(false);
    if (ok) onClose();
    else setError("匯入失敗,請再試一次。");
  }

  const selectedCount = rows ? rows.filter(r => r.checked).length : 0;
  const dupCount = rows ? rows.filter(r => r.duplicateOf).length : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-title">Import contacts</div>

        {!rows ? (
          <>
            <p style={{ fontSize: 13.5, color: "var(--ink-mid)", lineHeight: 1.6, marginBottom: 16 }}>
              支援 CSV(本 app 匯出的格式,或任何含 <code>name</code> 欄的檔案)與 vCard(.vcf)。
            </p>
            <label className="btn-primary" style={{ display: "inline-block", cursor: "pointer" }}>
              選擇檔案…
              <input type="file" accept=".csv,.vcf,text/csv,text/vcard" style={{ display: "none" }} onChange={handleFile} />
            </label>
            {error && <div style={{ fontSize: 12.5, color: "var(--red)", marginTop: 10 }}>{error}</div>}
          </>
        ) : (
          <>
            <div style={{ fontSize: 12.5, color: "var(--ink-mid)", marginBottom: 10 }}>
              {fileName} — {rows.length} 筆
              {dupCount > 0 && <span>,其中 <b>{dupCount}</b> 筆疑似重複(預設不匯入)</span>}
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
              {rows.map((r, i) => (
                <div key={i}
                  onClick={() => toggle(i)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                    borderBottom: "1px solid var(--border)", cursor: "pointer",
                    opacity: r.checked ? 1 : 0.5,
                  }}>
                  <input type="checkbox" checked={r.checked} readOnly style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{r.draft.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-light)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {[r.draft.role, r.draft.company, r.draft.email].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  {r.duplicateOf && (
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, color: "var(--amber, #B07700)",
                      background: "#FEF3CD", padding: "2px 7px", borderRadius: 4, flexShrink: 0,
                    }}>
                      疑似重複:{r.duplicateOf.name}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {error && <div style={{ fontSize: 12.5, color: "var(--red)", marginTop: 10 }}>{error}</div>}
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => { setRows(null); setError(null); }}>重選檔案</button>
              <button className="btn-primary" disabled={!selectedCount || importing} onClick={handleImport}>
                {importing ? "匯入中…" : `匯入 ${selectedCount} 筆`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
