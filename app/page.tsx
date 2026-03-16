"use client";

import { useState } from "react";

// =============================================================================
// VOLTSCOPE DESIGN SYSTEM — same tokens as estimate page
// =============================================================================
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
  mono: "'JetBrains Mono', 'Fira Code', monospace",
} as const;

const R = { sm: 8, md: 10, lg: 12, xl: 16 } as const;

// =============================================================================
// Types
// =============================================================================
type AuthTab   = "login" | "signup";
type FieldState = { value: string; error?: string };

// =============================================================================
// Component
// =============================================================================
export default function HomePage() {
  const [tab,         setTab]         = useState<AuthTab>("login");
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [globalError, setGlobalError] = useState("");

  const [name,     setName]     = useState<FieldState>({ value: "" });
  const [email,    setEmail]    = useState<FieldState>({ value: "" });
  const [password, setPassword] = useState<FieldState>({ value: "" });
  const [confirm,  setConfirm]  = useState<FieldState>({ value: "" });

  function resetForm() {
    setName({ value: "" }); setEmail({ value: "" });
    setPassword({ value: "" }); setConfirm({ value: "" });
    setGlobalError(""); setSuccess(false);
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
    if (password.value.length < 8) {
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
    setLoading(true);
    try {
      const endpoint = tab === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: Record<string, string> = { email: email.value, password: password.value };
      if (tab === "signup") body.name = name.value;

      const res  = await fetch(endpoint, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setGlobalError(data?.error ?? (tab === "login" ? "Invalid email or password." : "Could not create account."));
        return;
      }

      if (tab === "signup") {
        setSuccess(true);
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setGlobalError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; }

        .vs-home {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 420px;
          font-family: ${FONT.body};
        }

        /* ── Left hero ── */
        .vs-hero {
          background: ${DS.shell};
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 52px 60px;
          position: relative;
          overflow: hidden;
        }
        .vs-hero::before {
          content: "";
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 55% 45% at 15% 65%, rgba(37,99,235,0.16) 0%, transparent 70%),
            radial-gradient(ellipse 40% 35% at 85% 15%, rgba(217,119,6,0.09) 0%, transparent 60%);
          pointer-events: none;
        }

        .vs-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: ${FONT.head};
          font-weight: 800;
          font-size: 17px;
          color: #fff;
          letter-spacing: -0.3px;
          position: relative;
          text-decoration: none;
        }
        .vs-logo-mark {
          width: 34px; height: 34px;
          border-radius: ${R.md}px;
          background: linear-gradient(135deg, ${DS.blue} 0%, ${DS.blueDark} 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 17px;
          box-shadow: 0 4px 14px rgba(37,99,235,0.50);
        }

        .vs-hero-body { position: relative; }

        .vs-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 5px 13px;
          border-radius: 20px;
          border: 1px solid rgba(37,99,235,0.30);
          background: rgba(37,99,235,0.10);
          font-family: ${FONT.head};
          font-weight: 600;
          font-size: 11px;
          letter-spacing: 0.9px;
          text-transform: uppercase;
          color: #93c5fd;
          margin-bottom: 26px;
        }
        .vs-eyebrow-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: ${DS.blue};
          box-shadow: 0 0 7px ${DS.blue};
        }

        .vs-hero-title {
          font-family: ${FONT.head};
          font-weight: 800;
          font-size: 46px;
          line-height: 1.08;
          letter-spacing: -1.8px;
          color: #fff;
          margin-bottom: 20px;
        }
        .vs-hero-title em {
          font-style: normal;
          background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .vs-hero-sub {
          font-size: 15.5px;
          color: rgba(255,255,255,0.46);
          line-height: 1.7;
          max-width: 460px;
          margin-bottom: 40px;
        }

        .vs-features { display: flex; flex-direction: column; gap: 16px; }
        .vs-feature  { display: flex; align-items: flex-start; gap: 13px; }
        .vs-feature-icon {
          width: 34px; height: 34px; flex-shrink: 0;
          border-radius: ${R.sm}px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px;
        }
        .vs-feature-title {
          font-family: ${FONT.head};
          font-weight: 600;
          font-size: 13.5px;
          color: rgba(255,255,255,0.82);
          margin-bottom: 3px;
        }
        .vs-feature-desc {
          font-size: 12px;
          color: rgba(255,255,255,0.32);
          line-height: 1.55;
        }

        .vs-hero-footer {
          font-size: 11.5px;
          color: rgba(255,255,255,0.18);
          position: relative;
        }

        /* ── Right auth side ── */
        .vs-auth-side {
          background: ${DS.pageBg};
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 28px;
          min-height: 100vh;
        }

        .vs-auth-card {
          width: 100%;
          max-width: 356px;
          background: ${DS.card};
          border-radius: ${R.xl}px;
          border: 1px solid ${DS.border};
          box-shadow: ${DS.raisedShadow};
          overflow: hidden;
        }

        /* Tab row */
        .vs-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: ${DS.divider};
        }
        .vs-tab {
          padding: 15px;
          font-family: ${FONT.head};
          font-weight: 600;
          font-size: 13px;
          text-align: center;
          cursor: pointer;
          border: none;
          border-bottom: 2px solid transparent;
          background: transparent;
          color: ${DS.text3};
          transition: color 0.15s, background 0.15s, border-color 0.15s;
        }
        .vs-tab.active {
          background: ${DS.card};
          color: ${DS.text1};
          border-bottom-color: ${DS.blue};
        }

        /* Form body */
        .vs-form-body { padding: 28px 28px 22px; }

        .vs-greeting {
          font-family: ${FONT.head};
          font-weight: 700;
          font-size: 19px;
          color: ${DS.text1};
          margin-bottom: 4px;
        }
        .vs-greeting-sub {
          font-size: 13px;
          color: ${DS.text3};
          margin-bottom: 24px;
          line-height: 1.5;
        }

        /* Fields */
        .vs-field { margin-bottom: 15px; }
        .vs-label {
          display: block;
          font-family: ${FONT.head};
          font-weight: 600;
          font-size: 11px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: ${DS.text2};
          margin-bottom: 6px;
        }
        .vs-input {
          width: 100%;
          padding: 10px 13px;
          border-radius: ${R.md}px;
          border: 1.5px solid ${DS.border};
          font-family: ${FONT.body};
          font-size: 14px;
          color: ${DS.text1};
          background: ${DS.card};
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .vs-input:focus {
          border-color: ${DS.blue};
          box-shadow: 0 0 0 3px rgba(37,99,235,0.11);
        }
        .vs-input.error {
          border-color: ${DS.red};
          box-shadow: 0 0 0 3px rgba(220,38,38,0.09);
        }
        .vs-field-error {
          font-size: 11.5px;
          color: ${DS.red};
          margin-top: 5px;
        }

        .vs-global-error {
          padding: 10px 13px;
          border-radius: ${R.md}px;
          background: ${DS.redLight};
          border: 1px solid #FCA5A5;
          font-size: 13px;
          color: ${DS.red};
          margin-bottom: 16px;
          line-height: 1.4;
        }

        .vs-forgot {
          text-align: right;
          margin-top: -8px;
          margin-bottom: 12px;
        }
        .vs-forgot button {
          background: none; border: none;
          cursor: pointer; color: ${DS.blue};
          font-size: 12px; font-family: ${FONT.body};
          padding: 0;
        }

        .vs-submit {
          width: 100%;
          padding: 11px;
          border-radius: ${R.md}px;
          border: none;
          background: linear-gradient(135deg, ${DS.blue} 0%, ${DS.blueDark} 100%);
          color: #fff;
          font-family: ${FONT.head};
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          box-shadow: ${DS.blueShadow};
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 6px;
          transition: opacity 0.15s;
        }
        .vs-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Success state */
        .vs-success {
          text-align: center;
          padding: 8px 0 4px;
        }
        .vs-success-icon { font-size: 36px; margin-bottom: 12px; }
        .vs-success-title {
          font-family: ${FONT.head};
          font-weight: 700;
          font-size: 16px;
          color: ${DS.green};
          margin-bottom: 6px;
        }
        .vs-success-sub {
          font-size: 13px;
          color: #065F46;
          line-height: 1.5;
          margin-bottom: 20px;
        }

        /* Bottom switch */
        .vs-card-footer {
          padding: 14px 28px;
          background: ${DS.divider};
          border-top: 1px solid ${DS.border};
          font-size: 12.5px;
          color: ${DS.text3};
          text-align: center;
        }
        .vs-card-footer button {
          background: none; border: none; cursor: pointer;
          color: ${DS.blue}; font-weight: 600;
          font-size: 12.5px; font-family: ${FONT.body};
          padding: 0;
        }
        .vs-card-footer button:hover { text-decoration: underline; }

        @keyframes vs-spin { to { transform: rotate(360deg); } }
        .vs-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: vs-spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .vs-home { grid-template-columns: 1fr; }
          .vs-hero  { display: none; }
          .vs-auth-side {
            background: ${DS.shell};
            padding: 24px 16px;
            min-height: 100vh;
          }
        }
      `}</style>

      <div className="vs-home">

        {/* ──────────── LEFT HERO ──────────── */}
        <div className="vs-hero">

          {/* Logo */}
          <div className="vs-logo">
            <div className="vs-logo-mark">⚡</div>
            Voltscope
          </div>

          {/* Hero copy */}
          <div className="vs-hero-body">
            <div className="vs-eyebrow">
              <span className="vs-eyebrow-dot" />
              AI-Powered Electrical Estimating
            </div>

            <h1 className="vs-hero-title">
              Bid faster.<br />
              Win <em>more jobs.</em>
            </h1>

            <p className="vs-hero-sub">
              Describe any electrical scope and get a full material list,
              labor breakdown, and professional proposal in seconds.
              Built for electricians who want to spend less time estimating
              and more time in the field.
            </p>

            <div className="vs-features">
              {[
                { icon: "⚡", title: "Instant AI Estimates",      desc: "Describe the job in plain English — get a complete, priced takeoff." },
                { icon: "📄", title: "Customer-Ready Proposals",  desc: "Send clean proposals with one click. Your margins stay private." },
                { icon: "📐", title: "NEC-Accurate Takeoffs",     desc: "Correct wire gauges, breaker sizing, and fitting quantities every time." },
                { icon: "🏗️", title: "Any Job Size",              desc: "From a single outlet to a 10,000 sq ft warehouse — same workflow." },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="vs-feature">
                  <div className="vs-feature-icon">{icon}</div>
                  <div>
                    <div className="vs-feature-title">{title}</div>
                    <div className="vs-feature-desc">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="vs-hero-footer">
            © {new Date().getFullYear()} Voltscope · Built for electricians
          </div>
        </div>

        {/* ──────────── RIGHT AUTH ──────────── */}
        <div className="vs-auth-side">
          <div className="vs-auth-card">

            {/* Tabs */}
            <div className="vs-tabs">
              <button className={`vs-tab${tab === "login"  ? " active" : ""}`} onClick={() => switchTab("login")}>Sign In</button>
              <button className={`vs-tab${tab === "signup" ? " active" : ""}`} onClick={() => switchTab("signup")}>Create Account</button>
            </div>

            {/* Form */}
            <form className="vs-form-body" onSubmit={handleSubmit} noValidate>

              {success ? (
                <div className="vs-success">
                  <div className="vs-success-icon">✅</div>
                  <div className="vs-success-title">Account created!</div>
                  <div className="vs-success-sub">
                    Welcome to Voltscope. Sign in below to get started.
                  </div>
                  <button
                    type="button"
                    className="vs-submit"
                    onClick={() => { setSuccess(false); setTab("login"); setEmail({ value: email.value }); setPassword({ value: "" }); }}
                  >
                    Sign In →
                  </button>
                </div>
              ) : (
                <>
                  <div className="vs-greeting">
                    {tab === "login" ? "Welcome back" : "Get started free"}
                  </div>
                  <div className="vs-greeting-sub">
                    {tab === "login"
                      ? "Sign in to your Voltscope account."
                      : "No credit card required."}
                  </div>

                  {globalError && (
                    <div className="vs-global-error">⚠ {globalError}</div>
                  )}

                  {tab === "signup" && (
                    <div className="vs-field">
                      <label className="vs-label" htmlFor="name">Full Name</label>
                      <input
                        id="name" type="text" autoComplete="name"
                        placeholder="John Smith"
                        className={`vs-input${name.error ? " error" : ""}`}
                        value={name.value}
                        onChange={e => setName({ value: e.target.value })}
                      />
                      {name.error && <div className="vs-field-error">{name.error}</div>}
                    </div>
                  )}

                  <div className="vs-field">
                    <label className="vs-label" htmlFor="email">Email</label>
                    <input
                      id="email" type="email" autoComplete="email"
                      placeholder="you@company.com"
                      className={`vs-input${email.error ? " error" : ""}`}
                      value={email.value}
                      onChange={e => setEmail({ value: e.target.value })}
                    />
                    {email.error && <div className="vs-field-error">{email.error}</div>}
                  </div>

                  <div className="vs-field">
                    <label className="vs-label" htmlFor="password">Password</label>
                    <input
                      id="password" type="password"
                      autoComplete={tab === "login" ? "current-password" : "new-password"}
                      placeholder={tab === "signup" ? "Minimum 8 characters" : "••••••••"}
                      className={`vs-input${password.error ? " error" : ""}`}
                      value={password.value}
                      onChange={e => setPassword({ value: e.target.value })}
                    />
                    {password.error && <div className="vs-field-error">{password.error}</div>}
                  </div>

                  {tab === "signup" && (
                    <div className="vs-field">
                      <label className="vs-label" htmlFor="confirm">Confirm Password</label>
                      <input
                        id="confirm" type="password" autoComplete="new-password"
                        placeholder="Repeat password"
                        className={`vs-input${confirm.error ? " error" : ""}`}
                        value={confirm.value}
                        onChange={e => setConfirm({ value: e.target.value })}
                      />
                      {confirm.error && <div className="vs-field-error">{confirm.error}</div>}
                    </div>
                  )}

                  {tab === "login" && (
                    <div className="vs-forgot">
                      <button type="button">Forgot password?</button>
                    </div>
                  )}

                  <button type="submit" className="vs-submit" disabled={loading}>
                    {loading
                      ? <><span className="vs-spinner" />{tab === "login" ? "Signing in…" : "Creating account…"}</>
                      : tab === "login" ? "Sign In →" : "Create Account →"
                    }
                  </button>
                </>
              )}
            </form>

            {!success && (
              <div className="vs-card-footer">
                {tab === "signup"
                  ? <>Already have an account?{" "}<button type="button" onClick={() => switchTab("login")}>Sign in</button></>
                  : <>New to Voltscope?{" "}<button type="button" onClick={() => switchTab("signup")}>Create a free account</button></>
                }
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}