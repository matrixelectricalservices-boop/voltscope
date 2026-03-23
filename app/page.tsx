"use client";

import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

const DS = {
  shell:        "#0B0F1A",
  shellBorder:  "rgba(255,255,255,0.07)",
  pageBg:       "#F4F6F9",
  card:         "#FFFFFF",
  text1:        "#0F172A",
  text2:        "#475569",
  text3:        "#94A3B8",
  blue:         "#2563EB",
  blueDark:     "#1D4ED8",
  blueLight:    "#EFF6FF",
  blueMid:      "#DBEAFE",
  amber:        "#D97706",
  green:        "#059669",
  greenLight:   "#ECFDF5",
  red:          "#DC2626",
  redLight:     "#FEF2F2",
  border:       "#E4E7ED",
  divider:      "#F1F3F7",
  raisedShadow: "0 4px 16px rgba(15,23,42,0.10), 0 2px 6px rgba(15,23,42,0.06)",
  blueShadow:   "0 4px 14px rgba(37,99,235,0.30)",
} as const;

const FONT = {
  head: "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif",
  body: "'Inter', 'Segoe UI', system-ui, sans-serif",
} as const;

const R = { sm: 8, md: 10, lg: 12, xl: 16 } as const;

type AuthTab    = "login" | "signup" | "forgot";
type FieldState = { value: string; error?: string };

// Consistent SparcBid arc mark — matches all other pages
function ArcMark({ size = 34 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 8, background: "#0B0F1A", border: "1px solid rgba(37,99,235,0.5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 14px rgba(37,99,235,0.30)" }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 20 20" fill="none">
        <line x1="5" y1="17" x2="5" y2="9" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round"/>
        <line x1="15" y1="17" x2="15" y2="9" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M5 9 Q10 2 15 9" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="8" cy="6" r="1.2" fill="#93c5fd"/>
        <circle cx="12" cy="6" r="1.2" fill="#93c5fd"/>
      </svg>
    </div>
  );
}

export default function HomePage() {
  const [tab,         setTab]         = useState<AuthTab>("login");
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [success,     setSuccess]     = useState<"signup" | "forgot" | null>(null);
  const [globalError, setGlobalError] = useState("");
  const [loggedIn,    setLoggedIn]    = useState(false);
  const [userEmail,   setUserEmail]   = useState("");
  const [mobileView,  setMobileView]  = useState<"hero" | "auth">("hero");

  const [name,     setName]     = useState<FieldState>({ value: "" });
  const [email,    setEmail]    = useState<FieldState>({ value: "" });
  const [password, setPassword] = useState<FieldState>({ value: "" });
  const [confirm,  setConfirm]  = useState<FieldState>({ value: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setLoggedIn(true);
        setUserEmail(data.session.user.email ?? "");
      }
      setLoading(false);
    });
  }, []);

  function resetForm() {
    setName({ value: "" }); setEmail({ value: "" });
    setPassword({ value: "" }); setConfirm({ value: "" });
    setGlobalError(""); setSuccess(null);
  }

  function switchTab(t: AuthTab) { setTab(t); resetForm(); }

  function validate(): boolean {
    let ok = true;
    if (tab === "signup" && !name.value.trim()) {
      setName(s => ({ ...s, error: "Name is required" })); ok = false;
    }
    if (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      setEmail(s => ({ ...s, error: "Valid email required" })); ok = false;
    }
    if (tab !== "forgot" && password.value.length < 8) {
      setPassword(s => ({ ...s, error: "At least 8 characters" })); ok = false;
    }
    if (tab === "signup" && password.value !== confirm.value) {
      setConfirm(s => ({ ...s, error: "Passwords do not match" })); ok = false;
    }
    return ok;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.value, password: password.value,
          options: { data: { name: name.value } },
        });
        if (error) { setGlobalError(error.message); return; }
        setSuccess("signup");
      } else if (tab === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.value, password: password.value,
        });
        if (error) {
          setGlobalError(error.message.toLowerCase().includes("email not confirmed")
            ? "Please verify your email first. Check your inbox for a confirmation link."
            : "Invalid email or password.");
          return;
        }
        if (data.session) window.location.href = "/dashboard";
      } else if (tab === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) { setGlobalError(error.message); return; }
        setSuccess("forgot");
      }
    } catch {
      setGlobalError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setLoggedIn(false);
    setUserEmail("");
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: DS.shell, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 24, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: DS.blue, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const features = [
    { icon: "🧠", title: "Smart Estimating",        desc: "Describe the job in plain English — SparcBid figures out every material, wire size, and labor hour automatically." },
    { icon: "⚡", title: "Bids in Under a Minute",   desc: "What used to take an hour now takes 30 seconds. Get back to the work that actually makes you money." },
    { icon: "📄", title: "Professional Proposals",   desc: "Send a branded proposal to your customer with one click. Your margins stay completely private." },
    { icon: "📱", title: "Works on Any Device",      desc: "Estimate from your truck, the job site, or the office. SparcBid runs on phone, tablet, or desktop." },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; }

        /* ── Layout ── */
        .sb-page { min-height: 100vh; display: grid; grid-template-columns: 1fr 420px; font-family: ${FONT.body}; }

        /* ── Hero ── */
        .sb-hero {
          background: ${DS.shell}; display: flex; flex-direction: column;
          justify-content: space-between; padding: 52px 60px;
          position: relative; overflow: hidden;
        }
        .sb-hero::before {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 55% 45% at 15% 65%, rgba(37,99,235,0.18) 0%, transparent 70%),
            radial-gradient(ellipse 40% 35% at 85% 15%, rgba(217,119,6,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 30% 30% at 50% 90%, rgba(37,99,235,0.08) 0%, transparent 60%);
        }
        .sb-logo {
          display: inline-flex; align-items: center; gap: 10px;
          font-family: ${FONT.head}; font-weight: 800; font-size: 18px;
          color: #fff; letter-spacing: -0.4px; position: relative; text-decoration: none;
        }
        .sb-logo-name { display: flex; align-items: baseline; gap: 1px; }
        .sb-logo-sparc { color: #fff; }
        .sb-logo-bid   { color: #2563EB; }
        .sb-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 5px 13px; border-radius: 20px;
          border: 1px solid rgba(37,99,235,0.30); background: rgba(37,99,235,0.10);
          font-family: ${FONT.head}; font-weight: 600; font-size: 11px;
          letter-spacing: 0.9px; text-transform: uppercase; color: #93c5fd; margin-bottom: 26px;
        }
        .sb-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: ${DS.blue}; box-shadow: 0 0 7px ${DS.blue}; }
        .sb-hero-title {
          font-family: ${FONT.head}; font-weight: 800; font-size: 46px;
          line-height: 1.08; letter-spacing: -1.8px; color: #fff; margin-bottom: 20px;
        }
        .sb-hero-title em {
          font-style: normal;
          background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .sb-hero-sub { font-size: 15.5px; color: rgba(255,255,255,0.46); line-height: 1.7; max-width: 460px; margin-bottom: 40px; }
        .sb-features { display: flex; flex-direction: column; gap: 18px; }
        .sb-feature  { display: flex; align-items: flex-start; gap: 13px; }
        .sb-feature-icon {
          width: 36px; height: 36px; flex-shrink: 0; border-radius: ${R.sm}px;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10);
          display: flex; align-items: center; justify-content: center; font-size: 16px;
        }
        .sb-feature-title { font-family: ${FONT.head}; font-weight: 700; font-size: 13.5px; color: rgba(255,255,255,0.88); margin-bottom: 3px; }
        .sb-feature-desc  { font-size: 12px; color: rgba(255,255,255,0.35); line-height: 1.6; }
        .sb-hero-footer   { font-size: 11.5px; color: rgba(255,255,255,0.18); position: relative; }

        /* ── Auth side ── */
        .sb-auth-side {
          background: ${DS.pageBg}; display: flex; align-items: center;
          justify-content: center; padding: 40px 28px; min-height: 100vh;
        }
        .sb-auth-card {
          width: 100%; max-width: 356px; background: ${DS.card};
          border-radius: ${R.xl}px; border: 1px solid ${DS.border};
          box-shadow: ${DS.raisedShadow}; overflow: hidden;
        }
        .sb-logged-in { padding: 32px 28px; text-align: center; }
        .sb-logged-avatar {
          width: 56px; height: 56px; border-radius: 50%;
          background: linear-gradient(135deg, ${DS.blue} 0%, #7c3aed 100%);
          display: flex; align-items: center; justify-content: center;
          font-family: ${FONT.head}; font-weight: 800; font-size: 22px;
          color: #fff; margin: 0 auto 16px;
        }
        .sb-logged-title  { font-family: ${FONT.head}; font-weight: 700; font-size: 17px; color: ${DS.text1}; margin-bottom: 6px; }
        .sb-logged-email  { font-size: 13px; color: ${DS.text3}; margin-bottom: 24px; }
        .sb-logged-actions { display: flex; flex-direction: column; gap: 10px; }

        /* Tabs */
        .sb-tabs { display: grid; grid-template-columns: 1fr 1fr; background: ${DS.divider}; }
        .sb-tab  {
          padding: 15px; font-family: ${FONT.head}; font-weight: 600; font-size: 13px;
          text-align: center; cursor: pointer; border: none;
          border-bottom: 2px solid transparent; background: transparent; color: ${DS.text3};
          transition: color 0.15s, background 0.15s, border-color 0.15s;
        }
        .sb-tab.active { background: ${DS.card}; color: ${DS.text1}; border-bottom-color: ${DS.blue}; }

        /* Form */
        .sb-form-body { padding: 28px 28px 22px; }
        .sb-greeting     { font-family: ${FONT.head}; font-weight: 700; font-size: 19px; color: ${DS.text1}; margin-bottom: 4px; }
        .sb-greeting-sub { font-size: 13px; color: ${DS.text3}; margin-bottom: 24px; line-height: 1.5; }
        .sb-field { margin-bottom: 15px; }
        .sb-label {
          display: block; font-family: ${FONT.head}; font-weight: 600;
          font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase;
          color: ${DS.text2}; margin-bottom: 6px;
        }
        .sb-input {
          width: 100%; padding: 10px 13px; border-radius: ${R.md}px;
          border: 1.5px solid ${DS.border}; font-family: ${FONT.body};
          font-size: 14px; color: ${DS.text1}; background: ${DS.card};
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .sb-input:focus { border-color: ${DS.blue}; box-shadow: 0 0 0 3px rgba(37,99,235,0.11); }
        .sb-input.error { border-color: ${DS.red}; box-shadow: 0 0 0 3px rgba(220,38,38,0.09); }
        .sb-field-error { font-size: 11.5px; color: ${DS.red}; margin-top: 5px; }
        .sb-global-error {
          padding: 10px 13px; border-radius: ${R.md}px;
          background: ${DS.redLight}; border: 1px solid #FCA5A5;
          font-size: 13px; color: ${DS.red}; margin-bottom: 16px; line-height: 1.4;
        }
        .sb-forgot-link { text-align: right; margin-top: -8px; margin-bottom: 12px; }
        .sb-forgot-link button { background: none; border: none; cursor: pointer; color: ${DS.blue}; font-size: 12px; font-family: ${FONT.body}; padding: 0; }
        .sb-submit {
          width: 100%; padding: 11px; border-radius: ${R.md}px; border: none;
          background: linear-gradient(135deg, ${DS.blue} 0%, ${DS.blueDark} 100%);
          color: #fff; font-family: ${FONT.head}; font-weight: 700; font-size: 14px;
          cursor: pointer; box-shadow: ${DS.blueShadow};
          display: flex; align-items: center; justify-content: center; gap: 8px;
          margin-top: 6px; transition: opacity 0.15s;
        }
        .sb-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .sb-submit-outline {
          width: 100%; padding: 11px; border-radius: ${R.md}px;
          border: 1px solid ${DS.border}; background: ${DS.card};
          color: ${DS.text1}; font-family: ${FONT.head}; font-weight: 600;
          font-size: 14px; cursor: pointer; margin-top: 8px; transition: background 0.15s;
        }
        .sb-submit-outline:hover { background: ${DS.divider}; }
        .sb-success-box { text-align: center; padding: 8px 0 4px; }
        .sb-success-icon  { font-size: 36px; margin-bottom: 12px; }
        .sb-success-title { font-family: ${FONT.head}; font-weight: 700; font-size: 16px; color: ${DS.green}; margin-bottom: 6px; }
        .sb-success-sub   { font-size: 13px; color: #065F46; line-height: 1.5; margin-bottom: 20px; }
        .sb-card-footer {
          padding: 14px 28px; background: ${DS.divider};
          border-top: 1px solid ${DS.border}; font-size: 12.5px;
          color: ${DS.text3}; text-align: center;
        }
        .sb-card-footer button {
          background: none; border: none; cursor: pointer;
          color: ${DS.blue}; font-weight: 600; font-size: 12.5px;
          font-family: ${FONT.body}; padding: 0;
        }
        .sb-card-footer button:hover { text-decoration: underline; }

        /* ── Mobile nav pill ── */
        .sb-mobile-nav {
          display: none;
          position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
          z-index: 200;
          background: rgba(11,15,26,0.92); backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 99px; padding: 6px;
          gap: 4px;
        }
        .sb-mobile-nav-btn {
          padding: 8px 20px; border-radius: 99px; border: none;
          font-family: ${FONT.head}; font-weight: 600; font-size: 13px;
          cursor: pointer; transition: background 0.15s, color 0.15s;
          background: transparent; color: rgba(255,255,255,0.55);
        }
        .sb-mobile-nav-btn.active {
          background: ${DS.blue}; color: #fff;
          box-shadow: 0 2px 10px rgba(37,99,235,0.40);
        }

        @keyframes vs-spin { to { transform: rotate(360deg); } }
        .sb-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff; border-radius: 50%;
          animation: vs-spin 0.7s linear infinite; flex-shrink: 0;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .sb-page { grid-template-columns: 1fr; grid-template-rows: auto; }

          .sb-hero {
            display: ${`var(--hero-display, flex)`};
            padding: 40px 24px 100px;
            min-height: 100vh;
          }
          .sb-hero-title { font-size: 34px; letter-spacing: -1.2px; }
          .sb-hero-sub   { font-size: 14px; }

          .sb-auth-side {
            display: ${`var(--auth-display, none)`};
            min-height: 100vh; background: ${DS.shell}; padding: 24px 16px 80px;
          }

          .sb-mobile-nav { display: flex; }
        }
      `}</style>

      {/* CSS vars for mobile toggle */}
      <style>{`
        @media (max-width: 768px) {
          .sb-hero      { display: ${mobileView === "hero" ? "flex" : "none"} !important; }
          .sb-auth-side { display: ${mobileView === "auth" ? "flex" : "none"} !important; }
        }
      `}</style>

      <div className="sb-page">

        {/* ── Hero ── */}
        <div className="sb-hero">
          {/* Logo */}
          <div className="sb-logo">
            <ArcMark size={34} />
            <span className="sb-logo-name">
              <span className="sb-logo-sparc">Sparc</span><span className="sb-logo-bid">Bid</span>
            </span>
          </div>

          <div style={{ position: "relative" }}>
            <div className="sb-eyebrow">
              <span className="sb-eyebrow-dot" />
              Smart Electrical Estimating
            </div>

            <h1 className="sb-hero-title">
              Stop guessing.<br />
              Start <em>winning bids.</em>
            </h1>

            <p className="sb-hero-sub">
              Describe any electrical job and SparcBid builds your complete estimate —
              materials, labor, and a professional proposal — in under a minute.
              No spreadsheets. No manual entry. Just results.
            </p>

            <div className="sb-features">
              {features.map(({ icon, title, desc }) => (
                <div key={title} className="sb-feature">
                  <div className="sb-feature-icon">{icon}</div>
                  <div>
                    <div className="sb-feature-title">{title}</div>
                    <div className="sb-feature-desc">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="sb-hero-footer">
            © {new Date().getFullYear()} SparcBid · Built by electricians, for electricians
          </div>
        </div>

        {/* ── Auth side ── */}
        <div className="sb-auth-side">
          <div className="sb-auth-card">

            {loggedIn ? (
              <div className="sb-logged-in">
                <div className="sb-logged-avatar">{userEmail.charAt(0).toUpperCase()}</div>
                <div className="sb-logged-title">You're signed in</div>
                <div className="sb-logged-email">{userEmail}</div>
                <div className="sb-logged-actions">
                  <button className="sb-submit" onClick={() => window.location.href = "/dashboard"}>Go to Dashboard →</button>
                  <button className="sb-submit-outline" onClick={handleSignOut}>Sign Out</button>
                </div>
              </div>
            ) : (
              <>
                {tab !== "forgot" && (
                  <div className="sb-tabs">
                    <button className={`sb-tab${tab === "login"  ? " active" : ""}`} onClick={() => switchTab("login")}>Sign In</button>
                    <button className={`sb-tab${tab === "signup" ? " active" : ""}`} onClick={() => switchTab("signup")}>Create Account</button>
                  </div>
                )}

                <form className="sb-form-body" onSubmit={handleSubmit} noValidate>

                  {success === "signup" ? (
                    <div className="sb-success-box">
                      <div className="sb-success-icon">✉️</div>
                      <div className="sb-success-title">Check your email</div>
                      <div className="sb-success-sub">
                        We sent a confirmation link to <strong>{email.value}</strong>.<br />
                        Click it before signing in.
                      </div>
                      <button type="button" className="sb-submit" onClick={() => { setSuccess(null); setTab("login"); }}>
                        Go to Sign In
                      </button>
                    </div>

                  ) : success === "forgot" ? (
                    <div className="sb-success-box">
                      <div className="sb-success-icon">✉️</div>
                      <div className="sb-success-title">Reset email sent</div>
                      <div className="sb-success-sub">Check your inbox at <strong>{email.value}</strong> for a reset link.</div>
                      <button type="button" className="sb-submit" onClick={() => { setSuccess(null); setTab("login"); }}>Back to Sign In</button>
                    </div>

                  ) : tab === "forgot" ? (
                    <>
                      <div className="sb-greeting">Reset password</div>
                      <div className="sb-greeting-sub">Enter your email and we'll send a reset link.</div>
                      {globalError && <div className="sb-global-error">⚠ {globalError}</div>}
                      <div className="sb-field">
                        <label className="sb-label" htmlFor="email-forgot">Email</label>
                        <input id="email-forgot" type="email" autoComplete="email" placeholder="you@company.com"
                          className={`sb-input${email.error ? " error" : ""}`}
                          value={email.value} onChange={e => setEmail({ value: e.target.value })} />
                        {email.error && <div className="sb-field-error">{email.error}</div>}
                      </div>
                      <button type="submit" className="sb-submit" disabled={submitting}>
                        {submitting ? <><span className="sb-spinner" />Sending…</> : "Send Reset Link →"}
                      </button>
                      <button type="button" className="sb-submit-outline" onClick={() => switchTab("login")}>← Back to Sign In</button>
                    </>

                  ) : (
                    <>
                      <div className="sb-greeting">{tab === "login" ? "Welcome back" : "Get started free"}</div>
                      <div className="sb-greeting-sub">
                        {tab === "login" ? "Sign in to your SparcBid account." : "No credit card required."}
                      </div>
                      {globalError && <div className="sb-global-error">⚠ {globalError}</div>}

                      {tab === "signup" && (
                        <div className="sb-field">
                          <label className="sb-label" htmlFor="name">Full Name</label>
                          <input id="name" type="text" autoComplete="name" placeholder="John Smith"
                            className={`sb-input${name.error ? " error" : ""}`}
                            value={name.value} onChange={e => setName({ value: e.target.value })} />
                          {name.error && <div className="sb-field-error">{name.error}</div>}
                        </div>
                      )}

                      <div className="sb-field">
                        <label className="sb-label" htmlFor="email">Email</label>
                        <input id="email" type="email" autoComplete="email" placeholder="you@company.com"
                          className={`sb-input${email.error ? " error" : ""}`}
                          value={email.value} onChange={e => setEmail({ value: e.target.value })} />
                        {email.error && <div className="sb-field-error">{email.error}</div>}
                      </div>

                      <div className="sb-field">
                        <label className="sb-label" htmlFor="password">Password</label>
                        <input id="password" type="password"
                          autoComplete={tab === "login" ? "current-password" : "new-password"}
                          placeholder={tab === "signup" ? "Minimum 8 characters" : "••••••••"}
                          className={`sb-input${password.error ? " error" : ""}`}
                          value={password.value} onChange={e => setPassword({ value: e.target.value })} />
                        {password.error && <div className="sb-field-error">{password.error}</div>}
                      </div>

                      {tab === "signup" && (
                        <div className="sb-field">
                          <label className="sb-label" htmlFor="confirm">Confirm Password</label>
                          <input id="confirm" type="password" autoComplete="new-password" placeholder="Repeat password"
                            className={`sb-input${confirm.error ? " error" : ""}`}
                            value={confirm.value} onChange={e => setConfirm({ value: e.target.value })} />
                          {confirm.error && <div className="sb-field-error">{confirm.error}</div>}
                        </div>
                      )}

                      {tab === "login" && (
                        <div className="sb-forgot-link">
                          <button type="button" onClick={() => switchTab("forgot")}>Forgot password?</button>
                        </div>
                      )}

                      <button type="submit" className="sb-submit" disabled={submitting}>
                        {submitting
                          ? <><span className="sb-spinner" />{tab === "login" ? "Signing in…" : "Creating account…"}</>
                          : tab === "login" ? "Sign In →" : "Create Account →"}
                      </button>
                    </>
                  )}
                </form>

                {!success && tab !== "forgot" && (
                  <div className="sb-card-footer">
                    {tab === "signup"
                      ? <>Already have an account? <button type="button" onClick={() => switchTab("login")}>Sign in</button></>
                      : <>New to SparcBid? <button type="button" onClick={() => switchTab("signup")}>Create a free account</button></>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile bottom nav pill ── */}
      <div className="sb-mobile-nav">
        <button
          className={`sb-mobile-nav-btn${mobileView === "hero" ? " active" : ""}`}
          onClick={() => setMobileView("hero")}
        >
          About
        </button>
        <button
          className={`sb-mobile-nav-btn${mobileView === "auth" ? " active" : ""}`}
          onClick={() => setMobileView("auth")}
        >
          Sign In / Sign Up
        </button>
      </div>
    </>
  );
}