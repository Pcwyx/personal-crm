import { useState } from "react";
import { supabase } from "../supabase.js";

export default function LoginScreen() {
  const [email, setEmail] = useState("patrick.chung2003@gmail.com");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSend(e) {
    e.preventDefault();
    setSending(true);
    await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin, shouldCreateUser: false } });
    setSent(true);
    setSending(false);
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">people<span>.</span>crm</div>
        <div className="login-sub">Your personal relationship manager</div>
        {sent ? (
          <div className="login-sent">
            ✉️ Magic link sent — check your inbox.<br />
            <span style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 6, display: "block" }}>
              You can close this tab after clicking the link.
            </span>
          </div>
        ) : (
          <form onSubmit={handleSend}>
            <input
              className="login-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoFocus
            />
            <button className="login-btn" type="submit" disabled={sending}>
              {sending ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
