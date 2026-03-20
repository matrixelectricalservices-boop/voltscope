"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const DS = {
  shell:      "#0B0F1A",
  pageBg:     "#F4F6F9",
  card:       "#FFFFFF",
  text1:      "#0F172A",
  text2:      "#475569",
  text3:      "#94A3B8",
  blue:       "#2563EB",
  blueDark:   "#1D4ED8",
  blueLight:  "#EFF6FF",
  blueMid:    "#DBEAFE",
  green:      "#059669",
  greenLight: "#ECFDF5",
  red:        "#DC2626",
  redLight:   "#FEF2F2",
  border:     "#E4E7ED",
  divider:    "#F1F3F7",
  blueShadow: "0 4px 14px rgba(37,99,235,0.30)",
  raisedShadow: "0 4px 16px rgba(15,23,42,0.10), 0 2px 6px rgba(15,23,42,0.06)",
} as const;

const FONT = {
  head: "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif",
  body: "'Inter', 'Segoe UI', system-ui, sans-serif",
} as const;

const R = { sm: 8, md: 10, xl: 16 } as const;

export default function ResetPasswordPage() {
  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState(false);
  const [ready,     setReady]     = useState(false);

  // Supabase puts the token in the URL hash — we need to let it process
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPw.length < 8)    { setError("Password must be at least 8 characters."); return; }
    if (newPw !== confirmPw) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPw });
      if (err) { setError(err.message); return; }
      setSuccess(true);
      setTimeout(() => { window.location.href = "/dashboard"; }, 2000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${DS.shell}; }
        @keyframes vs-spin { to { transform: rotate(360deg); } }
        .vs-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff; border-radius: 50%; animation: vs-spin 0.7s linear infinite; flex-shrink: 0; }
      `}</style>

      <div style={{ minHeight: "100vh", background: DS.shell, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.body, padding: "20px" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>

          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${DS.blue} 0%, ${DS.blueDark} 100%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 14px", boxShadow: DS.blueShadow }}>⚡</div>
            <div style={{ fontFamily: FONT.head, fontWeight: 800, fontSize: 20, color: "#fff", marginBottom: 4 }}>Voltscope</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.40)" }}>Set a new password</div>
          </div>

          <div style={{ background: DS.card, borderRadius: R.xl, border: `1px solid rgba(255,255,255,0.08)`, boxShadow: DS.raisedShadow, overflow: "hidden" }}>
            <div style={{ padding: "28px 28px 24px" }}>

              {success ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                  <div style={{ fontFamily: FONT.head, fontWeight: 700, fontSize: 16, color: DS.green, marginBottom: 6 }}>Password updated!</div>
                  <div style={{ fontSize: 13, color: DS.text3 }}>Redirecting to your dashboard…</div>
                </div>

              ) : !ready ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{ fontSize: 13, color: DS.text3, marginBottom: 16 }}>Verifying your reset link…</div>
                  <div style={{ fontSize: 12, color: DS.text3, lineHeight: 1.6 }}>
                    If nothing happens, your link may have expired.<br />
                    <a href="/" style={{ color: DS.blue, textDecoration: "none", fontWeight: 600 }}>Request a new one →</a>
                  </div>
                </div>

              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <div style={{ fontFamily: FONT.head, fontWeight: 700, fontSize: 18, color: DS.text1, marginBottom: 4 }}>New password</div>
                  <div style={{ fontSize: 13, color: DS.text3, marginBottom: 24 }}>Choose a strong password for your account.</div>

                  {error && (
                    <div style={{ padding: "10px 13px", borderRadius: R.md, background: DS.redLight, border: "1px solid #FCA5A5", fontSize: 13, color: DS.red, marginBottom: 16 }}>
                      ⚠ {error}
                    </div>
                  )}

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontFamily: FONT.head, fontWeight: 600, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" as const, color: DS.text2, marginBottom: 6 }}>
                      New Password
                    </label>
                    <input
                      type="password" autoComplete="new-password" placeholder="Minimum 8 characters"
                      value={newPw} onChange={e => { setNewPw(e.target.value); setError(""); }}
                      style={{ width: "100%", padding: "10px 13px", borderRadius: R.md, border: `1.5px solid ${DS.border}`, fontFamily: FONT.body, fontSize: 14, color: DS.text1, background: DS.card, outline: "none" }}
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontFamily: FONT.head, fontWeight: 600, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" as const, color: DS.text2, marginBottom: 6 }}>
                      Confirm Password
                    </label>
                    <input
                      type="password" autoComplete="new-password" placeholder="Repeat new password"
                      value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setError(""); }}
                      style={{ width: "100%", padding: "10px 13px", borderRadius: R.md, border: `1.5px solid ${confirmPw && confirmPw !== newPw ? DS.red : DS.border}`, fontFamily: FONT.body, fontSize: 14, color: DS.text1, background: DS.card, outline: "none" }}
                    />
                  </div>

                  <button
                    type="submit" disabled={loading || !newPw || !confirmPw}
                    style={{ width: "100%", padding: "11px", borderRadius: R.md, border: "none", background: `linear-gradient(135deg, ${DS.blue} 0%, ${DS.blueDark} 100%)`, color: "#fff", fontFamily: FONT.head, fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", boxShadow: DS.blueShadow, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: (!newPw || !confirmPw) ? 0.5 : 1 }}
                  >
                    {loading ? <><span className="vs-spinner" />Updating…</> : "Set New Password"}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 20 }}>
            <a href="/" style={{ fontSize: 12, color: "rgba(255,255,255,0.30)", textDecoration: "none" }}>← Back to sign in</a>
          </div>
        </div>
      </div>
    </>
  );
}