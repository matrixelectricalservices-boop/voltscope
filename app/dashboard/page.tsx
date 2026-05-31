"use client";

import { useEffect, useState } from "react";
import { loadProfileFromDB, saveProfile, type UserProfile } from "../lib/userProfile";
import { supabase } from "../lib/supabase";
import TopNav from "@/app/components/TopNav";
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

function defaultProfile(): UserProfile {
  return { name: "", company: "", phone: "", email: "", license: "", address: "" };
}

export default function DashboardPage() {
  const [profile,       setProfile]       = useState<UserProfile>(defaultProfile());
  const [editing,       setEditing]       = useState(false);
  const [draft,         setDraft]         = useState<UserProfile>(defaultProfile());
  const [savedConfirm,  setSavedConfirm]  = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [customerCount, setCustomerCount] = useState<number | null>(null);
  const [estimateCount, setEstimateCount] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const p = await loadProfileFromDB();
      setProfile(p);
      setDraft(p);
      if (!p.company) setEditing(true);
      const [{ count: cCount }, { count: eCount }] = await Promise.all([
        supabase.from("customers").select("*", { count: "exact", head: true }),
        supabase.from("estimates").select("*",  { count: "exact", head: true }),
      ]);
      setCustomerCount(cCount ?? 0);
      setEstimateCount(eCount ?? 0);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    await saveProfile(draft);
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
  const firstName = profile.name ? profile.name.split(" ")[0] : "";
  const initial   = profile.name ? profile.name.charAt(0).toUpperCase() : "?";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${DS.pageBg}; }

        .vs-page { min-height: 100vh; background: ${DS.pageBg}; font-family: ${FONT.body}; color: ${DS.text1}; }

        /* ── Topbar ── */
        .vs-topbar {
          position: sticky; top: 0; z-index: 100;
          height: 56px; background: ${DS.shell};
          border-bottom: 1px solid ${DS.shellBorder};
          display: flex; align-items: center;
          padding: 0 16px; gap: 0; overflow: hidden;
        }
        .vs-logo {
          font-family: ${FONT.head}; font-weight: 800; font-size: 16px;
          color: #fff; letter-spacing: -0.3px;
          display: flex; align-items: center; gap: 8px;
          text-decoration: none; flex-shrink: 0;
        }
        .vs-logo-name { color: #fff; }
        .vs-logo-name span { color: #2563EB; }
        .vs-logo-mark {
          width: 30px; height: 30px; border-radius: ${R.md}px;
          background: #0B0F1A; border: 1px solid rgba(37,99,235,0.4);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .vs-topbar-divider { width: 1px; height: 20px; background: ${DS.shellBorder}; margin: 0 12px; flex-shrink: 0; }
        .vs-topbar-nav { display: flex; align-items: center; gap: 2px; flex: 1; min-width: 0; }
        .vs-nav-link {
          font-family: ${FONT.body}; font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.50); text-decoration: none;
          padding: 5px 8px; border-radius: ${R.sm}px;
          transition: background 0.15s, color 0.15s; white-space: nowrap;
        }
        .vs-nav-link:hover  { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.85); }
        .vs-nav-link.active { color: rgba(255,255,255,0.90); background: rgba(255,255,255,0.08); }
        .vs-topbar-right {
          display: flex; align-items: center; gap: 8px;
          flex-shrink: 0; margin-left: 8px;
        }
        .vs-topbar-user {
          font-family: ${FONT.head}; font-size: 12px; font-weight: 600;
          color: rgba(255,255,255,0.60); white-space: nowrap;
          max-width: 100px; overflow: hidden; text-overflow: ellipsis;
        }
        .vs-avatar {
          width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg, ${DS.blue} 0%, #7c3aed 100%);
          display: flex; align-items: center; justify-content: center;
          font-family: ${FONT.head}; font-weight: 700; font-size: 11px; color: #fff;
          text-decoration: none;
        }

        /* ── Content ── */
        .vs-content { max-width: 860px; margin: 0 auto; padding: 28px 16px 60px; }

        /* ── Welcome row with inline stats ── */
        .vs-welcome-row {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 16px;
          margin-bottom: 24px; flex-wrap: wrap;
        }
        .vs-welcome-title {
          font-family: ${FONT.head}; font-weight: 800; font-size: 22px;
          color: ${DS.text1}; letter-spacing: -0.4px; margin-bottom: 3px;
        }
        .vs-welcome-sub { font-size: 13px; color: ${DS.text3}; }

        /* ── Compact stat pills ── */
        .vs-stat-pills {
          display: flex; align-items: center; gap: 8px; flex-shrink: 0;
        }
        .vs-stat-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 20px;
          background: ${DS.card}; border: 1px solid ${DS.border};
          box-shadow: ${DS.cardShadow}; text-decoration: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .vs-stat-pill:hover { border-color: ${DS.blueMid}; box-shadow: ${DS.raisedShadow}; }
        .vs-stat-pill-label {
          font-family: ${FONT.head}; font-weight: 600; font-size: 11px;
          color: ${DS.text3}; letter-spacing: 0.3px; text-transform: uppercase;
        }
        .vs-stat-pill-value {
          font-family: ${FONT.mono}; font-weight: 600; font-size: 13px;
          color: ${DS.text1};
        }

        /* ── Warning ── */
        .vs-warning {
          padding: 12px 16px; border-radius: ${R.md}px;
          background: ${DS.amberLight}; border: 1px solid #FDE68A;
          font-size: 13px; color: #92400E; line-height: 1.5;
          display: flex; align-items: flex-start; gap: 10px;
          margin-bottom: 20px;
        }

        /* ── Section heading ── */
        .vs-section-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 12px; gap: 12px;
        }
        .vs-section-title {
          font-family: ${FONT.head}; font-weight: 700; font-size: 11px;
          letter-spacing: 0.6px; text-transform: uppercase; color: ${DS.text3};
        }

        /* ── Action cards ── */
        .vs-actions-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 12px; margin-bottom: 24px;
        }
        .vs-action-card {
          background: ${DS.card}; border: 1px solid ${DS.border};
          border-radius: ${R.xl}px; box-shadow: ${DS.cardShadow};
          padding: 18px; text-decoration: none;
          display: flex; align-items: flex-start; gap: 12px;
          transition: box-shadow 0.15s, border-color 0.15s, transform 0.15s;
        }
        .vs-action-card:hover {
          box-shadow: ${DS.raisedShadow}; border-color: ${DS.blueMid};
          transform: translateY(-1px);
        }
        .vs-action-icon {
          width: 38px; height: 38px; border-radius: ${R.md}px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 18px;
        }
        .vs-action-icon.blue  { background: ${DS.blueLight}; }
        .vs-action-icon.amber { background: ${DS.amberLight}; }
        .vs-action-icon.green { background: ${DS.greenLight}; }
        .vs-action-title {
          font-family: ${FONT.head}; font-weight: 700; font-size: 14px;
          color: ${DS.text1}; margin-bottom: 3px;
        }
        .vs-action-desc { font-size: 12px; color: ${DS.text3}; line-height: 1.5; }

        /* ── Card ── */
        .vs-card {
          background: ${DS.card}; border: 1px solid ${DS.border};
          border-radius: ${R.xl}px; box-shadow: ${DS.cardShadow}; overflow: hidden;
        }
        .vs-card-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 18px; border-bottom: 1px solid ${DS.divider};
          gap: 12px; flex-wrap: wrap;
        }
        .vs-card-title {
          font-family: ${FONT.head}; font-weight: 700; font-size: 14px;
          color: ${DS.text1}; display: flex; align-items: center; gap: 8px;
        }
        .vs-card-body { padding: 18px; }

        /* ── Profile ── */
        .vs-profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .vs-profile-display { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
        .vs-field-label {
          display: block; font-family: ${FONT.head}; font-weight: 600;
          font-size: 10.5px; letter-spacing: 0.4px; text-transform: uppercase;
          color: ${DS.text2}; margin-bottom: 5px;
        }
        .vs-input {
          width: 100%; padding: 9px 12px; border-radius: ${R.md}px;
          border: 1.5px solid ${DS.border}; font-family: ${FONT.body};
          font-size: 14px; color: ${DS.text1}; background: ${DS.card};
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
        }
        .vs-input:focus { border-color: ${DS.blue}; box-shadow: 0 0 0 3px rgba(37,99,235,0.11); }
        .vs-field-value { font-size: 14px; color: ${DS.text1}; line-height: 1.4; margin-top: 3px; }
        .vs-field-empty { font-size: 13px; color: ${DS.text3}; font-style: italic; margin-top: 3px; }

        /* ── Buttons ── */
        .vs-btn-primary {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: ${R.md}px; border: none;
          background: linear-gradient(135deg, ${DS.blue} 0%, ${DS.blueDark} 100%);
          color: #fff; font-family: ${FONT.head}; font-weight: 700;
          font-size: 13px; cursor: pointer; box-shadow: ${DS.blueShadow};
          white-space: nowrap;
        }
        .vs-btn-secondary {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: ${R.md}px;
          border: 1px solid ${DS.border}; background: ${DS.card};
          color: ${DS.text1}; font-family: ${FONT.head}; font-weight: 600;
          font-size: 13px; cursor: pointer; white-space: nowrap;
        }
        .vs-btn-ghost {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 12px; border-radius: ${R.sm}px;
          border: 1px solid ${DS.border}; background: transparent;
          color: ${DS.text2}; font-family: ${FONT.body}; font-weight: 500;
          font-size: 12px; cursor: pointer;
        }

        /* ── Badge ── */
        .vs-badge {
          display: inline-flex; align-items: center; padding: 3px 9px;
          border-radius: 20px; font-family: ${FONT.head}; font-weight: 600;
          font-size: 11px; letter-spacing: 0.3px; white-space: nowrap;
        }
        .vs-badge-green { background: ${DS.greenLight}; color: ${DS.green}; border: 1px solid #A7F3D0; }
        .vs-badge-amber { background: ${DS.amberLight}; color: ${DS.amber}; border: 1px solid #FDE68A; }
        .vs-badge-blue  { background: ${DS.blueLight};  color: ${DS.blue};  border: 1px solid ${DS.blueMid}; }

        /* ── Mobile ── */
        @media (max-width: 600px) {
          .vs-topbar-user { display: none; }
          .vs-welcome-row { flex-direction: column; gap: 10px; }
          .vs-stat-pills { align-self: flex-start; }
          .vs-actions-grid { grid-template-columns: 1fr 1fr !important; }
          .vs-profile-grid { grid-template-columns: 1fr; }
          .vs-profile-display { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="vs-page">

        {/* Topbar */}
     <TopNav userName={profile?.name} />

        <div className="vs-content">

          {/* Welcome + compact stats */}
          <div className="vs-welcome-row">
            <div>
              <div className="vs-welcome-title">
                {loading ? "Loading…" : firstName ? `Welcome back, ${firstName}.` : "Welcome to SparcBid."}
              </div>
              <div className="vs-welcome-sub">
                {isProfileComplete
                  ? "Your profile is set up. Start a new estimate below."
                  : "Complete your company profile so it appears on your proposals."}
              </div>
            </div>
            {!loading && (
              <div className="vs-stat-pills">
                <a href="/projects" className="vs-stat-pill">
                  <span className="vs-stat-pill-label">Customers</span>
                  <span className="vs-stat-pill-value">{customerCount ?? "—"}</span>
                </a>
                <a href="/estimates" className="vs-stat-pill">
                  <span className="vs-stat-pill-label">Estimates</span>
                  <span className="vs-stat-pill-value">{estimateCount ?? "—"}</span>
                </a>
              </div>
            )}
          </div>

          {/* Warning */}
          {!loading && !isProfileComplete && (
            <div className="vs-warning">
              <span>⚠</span>
              <div>
                <strong>Complete your company profile</strong> — your company name, phone, and email
                appear on every customer proposal PDF. Fill them in below before sending estimates.
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="vs-section-head">
            <span className="vs-section-title">Quick Actions</span>
          </div>
          <div className="vs-actions-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <a href="/projects" className="vs-action-card">
              <div className="vs-action-icon blue">📋</div>
              <div>
                <div className="vs-action-title">Customers</div>
                <div className="vs-action-desc">View all customers and open existing estimates.</div>
              </div>
            </a>
            <a href="/estimates" className="vs-action-card">
              <div className="vs-action-icon green">📄</div>
              <div>
                <div className="vs-action-title">Estimates</div>
                <div className="vs-action-desc">View all estimates across all customers.</div>
              </div>
            </a>
            <a href="/projects" className="vs-action-card">
              <div className="vs-action-icon amber">⚡</div>
              <div>
                <div className="vs-action-title">New Estimate</div>
                <div className="vs-action-desc">Open a customer and generate a priced estimate.</div>
              </div>
            </a>
            <a href="/projects?new=1" className="vs-action-card">
              <div className="vs-action-icon green">➕</div>
              <div>
                <div className="vs-action-title">Add Customer</div>
                <div className="vs-action-desc">Create a new customer and start an estimate.</div>
              </div>
            </a>
          </div>

          {/* Company Profile */}
          <div className="vs-section-head">
            <span className="vs-section-title">Company Profile</span>
            <span style={{ fontSize: 12, color: DS.text3 }}>Appears on all customer proposals</span>
          </div>

          <div className="vs-card">
            <div className="vs-card-header">
              <span className="vs-card-title">
                Your Information
                {isProfileComplete
                  ? <span className="vs-badge vs-badge-green">Complete ✓</span>
                  : <span className="vs-badge vs-badge-amber">Incomplete</span>}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                {savedConfirm && <span className="vs-badge vs-badge-green">✓ Saved</span>}
                {!editing ? (
                  <button type="button" className="vs-btn-ghost" onClick={() => setEditing(true)}>✏ Edit</button>
                ) : (
                  <>
                    <button type="button" className="vs-btn-secondary" onClick={handleCancel}>Cancel</button>
                    <button type="button" className="vs-btn-primary" onClick={handleSave}>Save Profile</button>
                  </>
                )}
              </div>
            </div>

            <div className="vs-card-body">
              {editing ? (
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
                        value={(draft as any)[key] ?? ""}
                        onChange={e => setDraft((d: UserProfile) => ({ ...d, [key]: e.target.value }))}
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
                        {val
                          ? <div className="vs-field-value">{val}</div>
                          : <div className="vs-field-empty">Not set</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {!editing && (
              <div style={{ padding: "10px 18px", background: DS.divider, borderTop: `1px solid ${DS.border}`, fontSize: 12, color: DS.text3 }}>
                Synced to your account across all devices.
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}