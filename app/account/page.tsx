"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { loadProfileFromDB, saveProfile, type UserProfile } from "../lib/userProfile";

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
  amberLight:   "#FFFBEB",
  green:        "#059669",
  greenLight:   "#ECFDF5",
  red:          "#DC2626",
  redLight:     "#FEF2F2",
  border:       "#E4E7ED",
  divider:      "#F1F3F7",
  cardShadow:   "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
  raisedShadow: "0 4px 16px rgba(15,23,42,0.10), 0 2px 6px rgba(15,23,42,0.06)",
  blueShadow:   "0 4px 14px rgba(37,99,235,0.30)",
} as const;

const FONT = {
  head: "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif",
  body: "'Inter', 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
} as const;

const R = { sm: 8, md: 10, lg: 12, xl: 16 } as const;

function defaultProfile(): UserProfile {
  return { name: "", company: "", phone: "", email: "", license: "", address: "" };
}

export default function AccountPage() {
  const [userEmail,      setUserEmail]      = useState("");
  const [profile,        setProfile]        = useState<UserProfile>(defaultProfile());
  const [profileDraft,   setProfileDraft]   = useState<UserProfile>(defaultProfile());
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileSaved,   setProfileSaved]   = useState(false);

  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [pwLoading,  setPwLoading]  = useState(false);
  const [pwError,    setPwError]    = useState("");
  const [pwSuccess,  setPwSuccess]  = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/"; return; }
      setUserEmail(user.email ?? "");
      const p = await loadProfileFromDB();
      setProfile(p);
      setProfileDraft(p);
      setLoading(false);
    }
    load();
  }, []);

  // ── Profile save ──
  async function handleProfileSave() {
    await saveProfile(profileDraft);
    setProfile(profileDraft);
    setEditingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  }

  // ── Password change ──
  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError(""); setPwSuccess(false);
    if (newPw.length < 8)        { setPwError("New password must be at least 8 characters."); return; }
    if (newPw !== confirmPw)     { setPwError("Passwords do not match."); return; }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) { setPwError(error.message); return; }
      setPwSuccess(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => setPwSuccess(false), 3000);
    } finally {
      setPwLoading(false);
    }
  }

  // ── Sign out ──
  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const isProfileComplete = !!(profile.company && profile.phone && profile.email);
  const initials = profile.name ? profile.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) : "?";

  if (loading) {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Inter:wght@400;500&display=swap'); *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } body { background: ${DS.pageBg}; }`}</style>
        <div style={{ minHeight: "100vh", background: DS.pageBg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.body, fontSize: 13, color: DS.text3 }}>Loading…</div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${DS.pageBg}; }
        .vs-page { min-height: 100vh; background: ${DS.pageBg}; font-family: ${FONT.body}; color: ${DS.text1}; }
        .vs-topbar { position: sticky; top: 0; z-index: 100; height: 56px; background: ${DS.shell}; border-bottom: 1px solid ${DS.shellBorder}; display: flex; align-items: center; padding: 0 24px; gap: 16px; }
        .vs-logo { font-family: ${FONT.head}; font-weight: 800; font-size: 16px; color: #fff; letter-spacing: -0.3px; display: flex; align-items: center; gap: 9px; text-decoration: none; }
        .vs-logo-mark { width: 30px; height: 30px; border-radius: ${R.md}px; background: linear-gradient(135deg, ${DS.blue} 0%, ${DS.blueDark} 100%); display: flex; align-items: center; justify-content: center; font-size: 15px; box-shadow: 0 4px 12px rgba(37,99,235,0.45); }
        .vs-topbar-divider { width: 1px; height: 20px; background: ${DS.shellBorder}; }
        .vs-topbar-nav { display: flex; align-items: center; gap: 4px; }
        .vs-nav-link { font-family: ${FONT.body}; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.50); text-decoration: none; padding: 5px 10px; border-radius: ${R.sm}px; transition: background 0.15s, color 0.15s; }
        .vs-nav-link:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.85); }
        .vs-nav-link.active { color: rgba(255,255,255,0.90); background: rgba(255,255,255,0.08); }
        .vs-topbar-right { margin-left: auto; display: flex; align-items: center; gap: 10px; }
        .vs-avatar { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, ${DS.blue} 0%, #7c3aed 100%); display: flex; align-items: center; justify-content: center; font-family: ${FONT.head}; font-weight: 700; font-size: 11px; color: #fff; flex-shrink: 0; }
        .vs-content { max-width: 720px; margin: 0 auto; padding: 36px 20px 64px; }
        .vs-page-title { font-family: ${FONT.head}; font-weight: 800; font-size: 24px; color: ${DS.text1}; letter-spacing: -0.5px; margin-bottom: 4px; }
        .vs-page-sub { font-size: 13.5px; color: ${DS.text3}; margin-bottom: 32px; }
        .vs-section { margin-bottom: 28px; }
        .vs-section-label { font-family: ${FONT.head}; font-weight: 700; font-size: 11px; letter-spacing: 0.6px; text-transform: uppercase; color: ${DS.text3}; margin-bottom: 10px; }
        .vs-card { background: ${DS.card}; border: 1px solid ${DS.border}; border-radius: ${R.xl}px; box-shadow: ${DS.cardShadow}; overflow: hidden; }
        .vs-card-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid ${DS.divider}; gap: 12px; flex-wrap: wrap; }
        .vs-card-title { font-family: ${FONT.head}; font-weight: 700; font-size: 14px; color: ${DS.text1}; display: flex; align-items: center; gap: 8px; }
        .vs-card-body { padding: 20px; }
        .vs-profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .vs-field-label { display: block; font-family: ${FONT.head}; font-weight: 600; font-size: 11px; letter-spacing: 0.4px; text-transform: uppercase; color: ${DS.text2}; margin-bottom: 6px; }
        .vs-input { width: 100%; padding: 10px 13px; border-radius: ${R.md}px; border: 1.5px solid ${DS.border}; font-family: ${FONT.body}; font-size: 14px; color: ${DS.text1}; background: ${DS.card}; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
        .vs-input:focus { border-color: ${DS.blue}; box-shadow: 0 0 0 3px rgba(37,99,235,0.11); }
        .vs-input.error { border-color: ${DS.red}; }
        .vs-profile-display { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
        .vs-field-value { font-size: 14px; color: ${DS.text1}; line-height: 1.4; margin-top: 4px; }
        .vs-field-empty { font-size: 13px; color: ${DS.text3}; font-style: italic; margin-top: 4px; }
        .vs-badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 20px; font-family: ${FONT.head}; font-weight: 600; font-size: 11px; white-space: nowrap; }
        .vs-badge-green { background: ${DS.greenLight}; color: ${DS.green}; border: 1px solid #A7F3D0; }
        .vs-badge-amber { background: ${DS.amberLight}; color: ${DS.amber}; border: 1px solid #FDE68A; }
        .vs-error { padding: 10px 13px; border-radius: ${R.md}px; background: ${DS.redLight}; border: 1px solid #FCA5A5; font-size: 13px; color: ${DS.red}; margin-bottom: 14px; }
        .vs-success-msg { padding: 10px 13px; border-radius: ${R.md}px; background: ${DS.greenLight}; border: 1px solid #A7F3D0; font-size: 13px; color: ${DS.green}; margin-bottom: 14px; }
        .vs-btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: ${R.md}px; border: none; background: linear-gradient(135deg, ${DS.blue} 0%, ${DS.blueDark} 100%); color: #fff; font-family: ${FONT.head}; font-weight: 700; font-size: 13px; cursor: pointer; box-shadow: ${DS.blueShadow}; white-space: nowrap; transition: opacity 0.15s; }
        .vs-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
        .vs-btn-secondary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: ${R.md}px; border: 1px solid ${DS.border}; background: ${DS.card}; color: ${DS.text1}; font-family: ${FONT.head}; font-weight: 600; font-size: 13px; cursor: pointer; white-space: nowrap; }
        .vs-btn-ghost { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: ${R.sm}px; border: 1px solid ${DS.border}; background: transparent; color: ${DS.text2}; font-family: ${FONT.body}; font-weight: 500; font-size: 12px; cursor: pointer; }
        .vs-btn-danger { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border-radius: ${R.md}px; border: 1px solid #FCA5A5; background: ${DS.redLight}; color: ${DS.red}; font-family: ${FONT.head}; font-weight: 600; font-size: 13px; cursor: pointer; white-space: nowrap; }
        .vs-billing-placeholder { padding: 32px; text-align: center; }
        .vs-billing-icon { font-size: 32px; margin-bottom: 12px; }
        .vs-billing-title { font-family: ${FONT.head}; font-weight: 700; font-size: 15px; color: ${DS.text1}; margin-bottom: 6px; }
        .vs-billing-sub { font-size: 13px; color: ${DS.text3}; line-height: 1.5; margin-bottom: 20px; }
        .vs-billing-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; background: ${DS.greenLight}; border: 1px solid #A7F3D0; font-family: ${FONT.head}; font-weight: 600; font-size: 12px; color: ${DS.green}; margin-bottom: 16px; }
        .vs-danger-zone { padding: 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .vs-danger-label { font-family: ${FONT.head}; font-weight: 600; font-size: 14px; color: ${DS.text1}; margin-bottom: 3px; }
        .vs-danger-sub { font-size: 12.5px; color: ${DS.text3}; }
        @keyframes vs-spin { to { transform: rotate(360deg); } }
        .vs-spinner { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: vs-spin 0.7s linear infinite; }
        @media (max-width: 640px) { .vs-profile-grid { grid-template-columns: 1fr; } .vs-profile-display { grid-template-columns: 1fr; } }
      `}</style>

      <div className="vs-page">

        {/* Topbar */}
        <nav className="vs-topbar">
          <a href="/" className="vs-logo">
            <div className="vs-logo-mark">⚡</div>
            Voltscope
          </a>
          <div className="vs-topbar-divider" />
          <div className="vs-topbar-nav">
            <a href="/dashboard" className="vs-nav-link">Dashboard</a>
            <a href="/projects"  className="vs-nav-link">Customers</a>
            <a href="/account"   className="vs-nav-link active">Account</a>
          </div>
          <div className="vs-topbar-right">
            <div className="vs-avatar">{initials}</div>
          </div>
        </nav>

        <div className="vs-content">

          {/* Page heading */}
          <div>
            <div className="vs-page-title">Account Settings</div>
            <div className="vs-page-sub">{userEmail}</div>
          </div>

          {/* ── Company Profile ── */}
          <div className="vs-section">
            <div className="vs-section-label">Company Profile</div>
            <div className="vs-card">
              <div className="vs-card-header">
                <span className="vs-card-title">
                  Your Information
                  {isProfileComplete
                    ? <span className="vs-badge vs-badge-green">Complete ✓</span>
                    : <span className="vs-badge vs-badge-amber">Incomplete</span>}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  {profileSaved && <span className="vs-badge vs-badge-green">✓ Saved</span>}
                  {!editingProfile ? (
                    <button type="button" className="vs-btn-ghost" onClick={() => setEditingProfile(true)}>✏ Edit</button>
                  ) : (
                    <>
                      <button type="button" className="vs-btn-secondary" onClick={() => { setProfileDraft(profile); setEditingProfile(false); }}>Cancel</button>
                      <button type="button" className="vs-btn-primary" onClick={handleProfileSave}>Save Profile</button>
                    </>
                  )}
                </div>
              </div>
              <div className="vs-card-body">
                {editingProfile ? (
                  <div className="vs-profile-grid">
                    {[
                      { key: "name",    label: "Your Name",        placeholder: "John Smith" },
                      { key: "company", label: "Company Name",     placeholder: "Smith Electric LLC" },
                      { key: "phone",   label: "Phone Number",     placeholder: "(555) 123-4567" },
                      { key: "email",   label: "Business Email",   placeholder: "john@smithelectric.com" },
                      { key: "license", label: "License Number",   placeholder: "EC-12345 (optional)" },
                      { key: "address", label: "Business Address", placeholder: "123 Main St, City, NC (optional)" },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key} style={{ display: "flex", flexDirection: "column" }}>
                        <label className="vs-field-label">{label}</label>
                        <input
                          type={key === "email" ? "email" : "text"}
                          className="vs-input"
                          placeholder={placeholder}
                          value={(profileDraft as any)[key] ?? ""}
                          onChange={e => setProfileDraft((d: UserProfile) => ({ ...d, [key]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="vs-profile-display">
                    {[
                      { key: "name",    label: "Your Name"        },
                      { key: "company", label: "Company Name"     },
                      { key: "phone",   label: "Phone Number"     },
                      { key: "email",   label: "Business Email"   },
                      { key: "license", label: "License Number"   },
                      { key: "address", label: "Business Address" },
                    ].map(({ key, label }) => {
                      const val = (profile as any)[key];
                      return (
                        <div key={key}>
                          <div className="vs-field-label">{label}</div>
                          {val ? <div className="vs-field-value">{val}</div> : <div className="vs-field-empty">Not set</div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {!editingProfile && (
                <div style={{ padding: "10px 20px", background: DS.divider, borderTop: `1px solid ${DS.border}`, fontSize: 12, color: DS.text3 }}>
                  This information appears on every customer proposal PDF you generate.
                </div>
              )}
            </div>
          </div>

          {/* ── Change Password ── */}
          <div className="vs-section">
            <div className="vs-section-label">Security</div>
            <div className="vs-card">
              <div className="vs-card-header">
                <span className="vs-card-title">Change Password</span>
              </div>
              <div className="vs-card-body">
                <form onSubmit={handlePasswordChange} noValidate>
                  {pwError   && <div className="vs-error">⚠ {pwError}</div>}
                  {pwSuccess  && <div className="vs-success-msg">✓ Password updated successfully.</div>}
                  <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 360 }}>
                    <div>
                      <label className="vs-field-label" htmlFor="newPw">New Password</label>
                      <input id="newPw" type="password" autoComplete="new-password" placeholder="Minimum 8 characters"
                        className="vs-input" value={newPw} onChange={e => { setNewPw(e.target.value); setPwError(""); }} />
                    </div>
                    <div>
                      <label className="vs-field-label" htmlFor="confirmPw">Confirm New Password</label>
                      <input id="confirmPw" type="password" autoComplete="new-password" placeholder="Repeat new password"
                        className={`vs-input${confirmPw && confirmPw !== newPw ? " error" : ""}`}
                        value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setPwError(""); }} />
                    </div>
                    <div>
                      <button type="submit" className="vs-btn-primary" disabled={pwLoading || !newPw || !confirmPw}>
                        {pwLoading ? <><span className="vs-spinner" /> Updating…</> : "Update Password"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* ── Billing ── */}
          <div className="vs-section">
            <div className="vs-section-label">Subscription</div>
            <div className="vs-card">
              <div className="vs-billing-placeholder">
                <div className="vs-billing-icon">💳</div>
                <div className="vs-billing-badge">✓ Free Trial Active</div>
                <div className="vs-billing-title">Manage your subscription</div>
                <div className="vs-billing-sub">
                  Billing and subscription management will be available here once Stripe is connected.
                  You'll be able to upgrade, view invoices, and manage your plan.
                </div>
                <button type="button" className="vs-btn-primary" disabled style={{ opacity: 0.45, cursor: "not-allowed" }}>
                  Manage Billing — Coming Soon
                </button>
              </div>
            </div>
          </div>

          {/* ── Sign out / Danger zone ── */}
          <div className="vs-section">
            <div className="vs-section-label">Session</div>
            <div className="vs-card">
              <div className="vs-danger-zone">
                <div>
                  <div className="vs-danger-label">Sign Out</div>
                  <div className="vs-danger-sub">You'll be returned to the login page.</div>
                </div>
                <button type="button" className="vs-btn-danger" onClick={handleSignOut}>
                  Sign Out
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}