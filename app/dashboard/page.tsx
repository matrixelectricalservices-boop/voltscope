"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// =============================================================================
// VOLTSCOPE DESIGN SYSTEM — same tokens as all other pages
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
  amberLight:   "#FFFBEB",
  green:        "#059669",
  greenLight:   "#ECFDF5",
  red:          "#DC2626",
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

// =============================================================================
// User Profile type — stored in localStorage, read by PDF generator
// =============================================================================
export type UserProfile = {
  name:        string;  // contractor's name
  company:     string;  // company name → goes on PDF header
  phone:       string;  // → goes on PDF header
  email:       string;  // → goes on PDF header
  license?:    string;  // electrical license number
  address?:    string;  // business address
};

export const PROFILE_KEY = "voltscope:user-profile";

export function loadProfile(): UserProfile {
  if (typeof window === "undefined") return defaultProfile();
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return { ...defaultProfile(), ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultProfile();
}

export function saveProfile(p: UserProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

function defaultProfile(): UserProfile {
  return { name: "", company: "", phone: "", email: "", license: "", address: "" };
}

// =============================================================================
// Component
// =============================================================================
export default function DashboardPage() {
  const [profile,       setProfile]       = useState<UserProfile>(defaultProfile());
  const [editing,       setEditing]       = useState(false);
  const [draft,         setDraft]         = useState<UserProfile>(defaultProfile());
  const [savedConfirm,  setSavedConfirm]  = useState(false);

  // Load profile from localStorage on mount
  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    setDraft(p);
    // If no company name yet, open editor automatically
    if (!p.company) setEditing(true);
  }, []);

  function handleSave() {
    saveProfile(draft);
    setProfile(draft);
    setEditing(false);
    setSavedConfirm(true);
    setTimeout(() => setSavedConfirm(false), 2500);
  }

  function handleCancel() {
    setDraft(profile);
    setEditing(false);
  }

  const isProfileComplete = !!(profile.company && profile.phone && profile.email);

  // Quick stats (placeholder — will come from real data later)
  const stats = [
    { label: "Estimates",   value: "—",  sub: "this month"   },
    { label: "Proposals",   value: "—",  sub: "sent"         },
    { label: "Projects",    value: "—",  sub: "active"       },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${DS.pageBg}; }

        /* ── Topbar ── */
        .vs-topbar {
          position: sticky; top: 0; z-index: 100;
          height: 56px;
          background: ${DS.shell};
          border-bottom: 1px solid ${DS.shellBorder};
          display: flex; align-items: center;
          padding: 0 24px; gap: 16px;
        }
        .vs-logo {
          font-family: ${FONT.head}; font-weight: 800; font-size: 16px;
          color: #fff; letter-spacing: -0.3px;
          display: flex; align-items: center; gap: 9px;
          text-decoration: none;
        }
        .vs-logo-mark {
          width: 30px; height: 30px; border-radius: ${R.md}px;
          background: linear-gradient(135deg, ${DS.blue} 0%, ${DS.blueDark} 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px;
          box-shadow: 0 4px 12px rgba(37,99,235,0.45);
        }
        .vs-topbar-divider { width: 1px; height: 20px; background: ${DS.shellBorder}; }
        .vs-topbar-nav {
          display: flex; align-items: center; gap: 4px;
        }
        .vs-topbar-link {
          font-family: ${FONT.body}; font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.50); text-decoration: none;
          padding: 5px 10px; border-radius: ${R.sm}px;
          transition: background 0.15s, color 0.15s;
        }
        .vs-topbar-link:hover  { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.85); }
        .vs-topbar-link.active { color: rgba(255,255,255,0.90); background: rgba(255,255,255,0.08); }
        .vs-topbar-actions { margin-left: auto; display: flex; align-items: center; gap: 10px; }
        .vs-topbar-user {
          font-family: ${FONT.head}; font-size: 13px; font-weight: 600;
          color: rgba(255,255,255,0.65);
        }
        .vs-topbar-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: linear-gradient(135deg, ${DS.blue} 0%, #7c3aed 100%);
          display: flex; align-items: center; justify-content: center;
          font-family: ${FONT.head}; font-weight: 700; font-size: 12px;
          color: #fff; flex-shrink: 0;
        }

        /* ── Page ── */
        .vs-page { min-height: 100vh; background: ${DS.pageBg}; font-family: ${FONT.body}; }
        .vs-content { max-width: 900px; margin: 0 auto; padding: 32px 20px 64px; }

        /* ── Section heading ── */
        .vs-section-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 14px; gap: 12px; flex-wrap: wrap;
        }
        .vs-section-title {
          font-family: ${FONT.head}; font-weight: 700; font-size: 13px;
          letter-spacing: 0.4px; text-transform: uppercase; color: ${DS.text3};
        }

        /* ── Card ── */
        .vs-card {
          background: ${DS.card}; border: 1px solid ${DS.border};
          border-radius: ${R.xl}px; box-shadow: ${DS.cardShadow}; overflow: hidden;
        }
        .vs-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; border-bottom: 1px solid ${DS.divider};
          gap: 12px; flex-wrap: wrap;
        }
        .vs-card-title {
          font-family: ${FONT.head}; font-weight: 700; font-size: 14px;
          color: ${DS.text1}; display: flex; align-items: center; gap: 8px;
        }
        .vs-card-body { padding: 20px; }

        /* ── Stat tiles ── */
        .vs-stat-row {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
          margin-bottom: 24px;
        }
        .vs-stat {
          background: ${DS.card}; border: 1px solid ${DS.border};
          border-radius: ${R.xl}px; box-shadow: ${DS.cardShadow};
          padding: 18px 20px;
        }
        .vs-stat-label {
          font-family: ${FONT.head}; font-weight: 600; font-size: 11px;
          letter-spacing: 0.5px; text-transform: uppercase; color: ${DS.text3};
          margin-bottom: 8px;
        }
        .vs-stat-value {
          font-family: ${FONT.mono}; font-size: 28px; font-weight: 500;
          color: ${DS.text1}; letter-spacing: -0.5px;
        }
        .vs-stat-sub { font-size: 11px; color: ${DS.text3}; margin-top: 4px; }

        /* ── Quick actions ── */
        .vs-actions-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
          margin-bottom: 24px;
        }
        .vs-action-card {
          background: ${DS.card}; border: 1px solid ${DS.border};
          border-radius: ${R.xl}px; box-shadow: ${DS.cardShadow};
          padding: 20px; text-decoration: none;
          display: flex; align-items: flex-start; gap: 14px;
          transition: box-shadow 0.15s, border-color 0.15s, transform 0.15s;
          cursor: pointer;
        }
        .vs-action-card:hover {
          box-shadow: ${DS.raisedShadow};
          border-color: ${DS.blueMid};
          transform: translateY(-1px);
        }
        .vs-action-icon {
          width: 40px; height: 40px; border-radius: ${R.md}px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 19px;
        }
        .vs-action-icon.blue   { background: ${DS.blueLight};  }
        .vs-action-icon.amber  { background: ${DS.amberLight}; }
        .vs-action-icon.green  { background: ${DS.greenLight}; }
        .vs-action-icon.shell  { background: rgba(11,15,26,0.06); }
        .vs-action-title {
          font-family: ${FONT.head}; font-weight: 700; font-size: 14px;
          color: ${DS.text1}; margin-bottom: 4px;
        }
        .vs-action-desc { font-size: 12.5px; color: ${DS.text3}; line-height: 1.5; }

        /* ── Profile form ── */
        .vs-profile-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
        }
        .vs-profile-grid .full { grid-column: 1 / -1; }
        .vs-field-label {
          display: block; font-family: ${FONT.head}; font-weight: 600;
          font-size: 11px; letter-spacing: 0.4px; text-transform: uppercase;
          color: ${DS.text2}; margin-bottom: 6px;
        }
        .vs-input {
          width: 100%; padding: 10px 13px; border-radius: ${R.md}px;
          border: 1.5px solid ${DS.border}; font-family: ${FONT.body};
          font-size: 14px; color: ${DS.text1}; background: ${DS.card};
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .vs-input:focus {
          border-color: ${DS.blue};
          box-shadow: 0 0 0 3px rgba(37,99,235,0.11);
        }
        .vs-input:disabled {
          background: ${DS.divider}; color: ${DS.text2}; cursor: default;
        }

        /* ── Profile display (read mode) ── */
        .vs-profile-display {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px;
        }
        .vs-profile-field { }
        .vs-profile-field-label {
          font-family: ${FONT.head}; font-weight: 600; font-size: 10.5px;
          letter-spacing: 0.5px; text-transform: uppercase;
          color: ${DS.text3}; margin-bottom: 4px;
        }
        .vs-profile-field-value {
          font-family: ${FONT.body}; font-size: 14px;
          color: ${DS.text1}; line-height: 1.4;
        }
        .vs-profile-field-empty {
          font-size: 13px; color: ${DS.text3}; font-style: italic;
        }

        /* ── Warning banner ── */
        .vs-warning {
          padding: 12px 16px; border-radius: ${R.md}px;
          background: ${DS.amberLight}; border: 1px solid #FDE68A;
          font-size: 13px; color: #92400E; line-height: 1.5;
          display: flex; align-items: flex-start; gap: 10px;
          margin-bottom: 24px;
        }

        /* ── Buttons ── */
        .vs-btn-primary {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 18px; border-radius: ${R.md}px; border: none;
          background: linear-gradient(135deg, ${DS.blue} 0%, ${DS.blueDark} 100%);
          color: #fff; font-family: ${FONT.head}; font-weight: 700;
          font-size: 13px; cursor: pointer; box-shadow: ${DS.blueShadow};
          transition: opacity 0.15s; white-space: nowrap;
        }
        .vs-btn-primary.green {
          background: linear-gradient(135deg, ${DS.green} 0%, #047857 100%);
          box-shadow: 0 4px 14px rgba(5,150,105,0.30);
        }
        .vs-btn-secondary {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 16px; border-radius: ${R.md}px;
          border: 1px solid ${DS.border}; background: ${DS.card};
          color: ${DS.text1}; font-family: ${FONT.head}; font-weight: 600;
          font-size: 13px; cursor: pointer; box-shadow: ${DS.cardShadow};
          white-space: nowrap; transition: background 0.15s;
        }
        .vs-btn-secondary:hover { background: ${DS.divider}; }
        .vs-btn-ghost {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 12px; border-radius: ${R.sm}px;
          border: 1px solid ${DS.border}; background: transparent;
          color: ${DS.text2}; font-family: ${FONT.body}; font-weight: 500;
          font-size: 12px; cursor: pointer; white-space: nowrap;
        }

        /* ── Badge ── */
        .vs-badge {
          display: inline-flex; align-items: center;
          padding: 3px 9px; border-radius: 20px;
          font-family: ${FONT.head}; font-weight: 600; font-size: 11px;
          letter-spacing: 0.3px; white-space: nowrap;
        }
        .vs-badge-green { background: ${DS.greenLight}; color: ${DS.green}; border: 1px solid #A7F3D0; }
        .vs-badge-amber { background: ${DS.amberLight}; color: ${DS.amber}; border: 1px solid #FDE68A; }
        .vs-badge-blue  { background: ${DS.blueLight};  color: ${DS.blue};  border: 1px solid ${DS.blueMid}; }

        @media (max-width: 640px) {
          .vs-stat-row    { grid-template-columns: 1fr; }
          .vs-actions-grid { grid-template-columns: 1fr; }
          .vs-profile-grid { grid-template-columns: 1fr; }
          .vs-profile-display { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="vs-page">

        {/* ── Topbar ── */}
        <nav className="vs-topbar">
          <a href="/" className="vs-logo">
            <div className="vs-logo-mark">⚡</div>
            Voltscope
          </a>
          <div className="vs-topbar-divider" />
          <div className="vs-topbar-nav">
            <a href="/dashboard" className="vs-topbar-link active">Dashboard</a>
            <a href="/projects" className="vs-topbar-link">Customers</a>
          </div>
          <div className="vs-topbar-actions">
            {profile.name && (
              <span className="vs-topbar-user">{profile.name}</span>
            )}
            <div className="vs-topbar-avatar">
              {profile.name ? profile.name.charAt(0).toUpperCase() : "?"}
            </div>
          </div>
        </nav>

        <div className="vs-content">

          {/* ── Welcome heading ── */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontFamily: FONT.head, fontWeight: 800, fontSize: 24, color: DS.text1, letterSpacing: -0.5, marginBottom: 4 }}>
              {profile.name ? `Welcome back, ${profile.name.split(" ")[0]}.` : "Welcome to Voltscope."}
            </h1>
            <p style={{ fontSize: 14, color: DS.text3 }}>
              {isProfileComplete
                ? "Your profile is set up. Start a new estimate below."
                : "Complete your company profile so it appears on your proposals."}
            </p>
          </div>

          {/* ── Profile incomplete warning ── */}
          {!isProfileComplete && (
            <div className="vs-warning">
              <span>⚠</span>
              <div>
                <strong>Complete your company profile</strong> — your company name, phone, and email
                appear on every customer proposal PDF. Fill them in below before sending estimates.
              </div>
            </div>
          )}

          {/* ── Stats ── */}
          <div className="vs-stat-row">
            {stats.map(({ label, value, sub }) => (
              <div key={label} className="vs-stat">
                <div className="vs-stat-label">{label}</div>
                <div className="vs-stat-value">{value}</div>
                <div className="vs-stat-sub">{sub}</div>
              </div>
            ))}
          </div>

          {/* ── Quick actions ── */}
          <div className="vs-section-head">
            <span className="vs-section-title">Quick Actions</span>
          </div>
          <div className="vs-actions-grid" style={{ marginBottom: 32 }}>
            {[
              {
                href:  "/projects",
                icon:  "📋", iconClass: "blue",
                title: "Customers",
                desc:  "View all your customers and open existing estimates.",
              },
              {
                href:  "/projects",
                icon:  "⚡", iconClass: "amber",
                title: "New Estimate",
                desc:  "Open a project and generate a priced estimate with AI.",
              },
            ].map(({ href, icon, iconClass, title, desc }) => (
              <a key={title} href={href} className="vs-action-card">
                <div className={`vs-action-icon ${iconClass}`}>{icon}</div>
                <div>
                  <div className="vs-action-title">{title}</div>
                  <div className="vs-action-desc">{desc}</div>
                </div>
              </a>
            ))}
          </div>

          {/* ── Company Profile ── */}
          <div className="vs-section-head">
            <span className="vs-section-title">Company Profile</span>
            <span style={{ fontSize: 12, color: DS.text3 }}>
              Appears on all customer proposals
            </span>
          </div>

          <div className="vs-card">
            <div className="vs-card-header">
              <span className="vs-card-title">
                Your Information
                {isProfileComplete
                  ? <span className="vs-badge vs-badge-green">Complete ✓</span>
                  : <span className="vs-badge vs-badge-amber">Incomplete</span>
                }
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                {savedConfirm && (
                  <span className="vs-badge vs-badge-green">✓ Saved</span>
                )}
                {!editing ? (
                  <button type="button" className="vs-btn-ghost" onClick={() => setEditing(true)}>
                    ✏ Edit
                  </button>
                ) : (
                  <>
                    <button type="button" className="vs-btn-secondary" onClick={handleCancel}>
                      Cancel
                    </button>
                    <button type="button" className="vs-btn-primary" onClick={handleSave}>
                      Save Profile
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="vs-card-body">
              {editing ? (
                // ── Edit mode ──
                <div className="vs-profile-grid">
                  {[
                    { key: "name",    label: "Your Name",        placeholder: "John Smith",              full: false },
                    { key: "company", label: "Company Name",     placeholder: "Smith Electric LLC",      full: false },
                    { key: "phone",   label: "Phone Number",     placeholder: "(555) 123-4567",          full: false },
                    { key: "email",   label: "Business Email",   placeholder: "john@smithelectric.com",  full: false },
                    { key: "license", label: "License Number",   placeholder: "EC-12345 (optional)",     full: false },
                    { key: "address", label: "Business Address", placeholder: "123 Main St, City, NC (optional)", full: false },
                  ].map(({ key, label, placeholder, full }) => (
                    <div key={key} className={full ? "full" : ""} style={{ display: "flex", flexDirection: "column" }}>
                      <label className="vs-field-label">{label}</label>
                      <input
                        type={key === "email" ? "email" : "text"}
                        className="vs-input"
                        placeholder={placeholder}
                        value={(draft as any)[key] ?? ""}
                        onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                // ── Read mode ──
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
                      <div key={key} className="vs-profile-field">
                        <div className="vs-profile-field-label">{label}</div>
                        {val
                          ? <div className="vs-profile-field-value">{val}</div>
                          : <div className="vs-profile-field-empty">Not set</div>
                        }
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {!editing && (
              <div style={{ padding: "12px 20px", background: DS.divider, borderTop: `1px solid ${DS.border}`, fontSize: 12, color: DS.text3 }}>
                This information is saved locally on this device.
                When database sync is added it will persist across all devices.
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}