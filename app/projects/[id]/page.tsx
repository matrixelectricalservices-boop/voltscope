"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getProject, type Project } from "@/app/lib/projectStore";
import { getEstimatesForProject, deleteEstimate, type SavedEstimate } from "@/app/lib/estimateStore";

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

const LogoMark = () => (
  <div style={{ width: 30, height: 30, borderRadius: R.md, background: "#0B0F1A", border: "1px solid rgba(37,99,235,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="5" y1="17" x2="5" y2="9" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="15" y1="17" x2="15" y2="9" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M5 9 Q10 2 15 9" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="8" cy="6" r="1.2" fill="#93c5fd"/>
      <circle cx="12" cy="6" r="1.2" fill="#93c5fd"/>
    </svg>
  </div>
);

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function relativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id     = params?.id ?? "";

  const [project,       setProject]       = useState<Project | null>(null);
  const [estimates,     setEstimates]     = useState<SavedEstimate[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      const [proj, ests] = await Promise.all([
        getProject(id),
        getEstimatesForProject(id),
      ]);
      setProject(proj);
      setEstimates(ests);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleDelete(estimateId: string) {
    await deleteEstimate(estimateId);
    setEstimates(await getEstimatesForProject(id));
    setDeleteConfirm(null);
  }

  const sharedStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${DS.pageBg}; }
  `;

  if (loading) {
    return (
      <>
        <style>{sharedStyles}</style>
        <div style={{ minHeight: "100vh", background: DS.pageBg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.body, fontSize: 13, color: DS.text3 }}>
          Loading…
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <style>{sharedStyles}</style>
        <div style={{ minHeight: "100vh", background: DS.pageBg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.body }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>📋</div>
            <div style={{ fontFamily: FONT.head, fontWeight: 800, fontSize: 18, color: DS.text1, marginBottom: 6 }}>Customer not found</div>
            <div style={{ fontSize: 13, color: DS.text3, marginBottom: 20 }}>This customer may have been deleted.</div>
            <Link href="/projects" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: R.md, background: `linear-gradient(135deg, ${DS.blue} 0%, ${DS.blueDark} 100%)`, color: "#fff", fontFamily: FONT.head, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>← Customers</Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        ${sharedStyles}
        .vs-page { min-height: 100vh; background: ${DS.pageBg}; font-family: ${FONT.body}; color: ${DS.text1}; }

        /* ── Topbar ── */
        .vs-topbar { position: sticky; top: 0; z-index: 100; height: 56px; background: ${DS.shell}; border-bottom: 1px solid ${DS.shellBorder}; display: flex; align-items: center; padding: 0 16px; gap: 0; overflow: hidden; }
        .vs-logo { font-family: ${FONT.head}; font-weight: 800; font-size: 16px; color: #fff; letter-spacing: -0.3px; display: flex; align-items: center; gap: 8px; text-decoration: none; flex-shrink: 0; }
        .vs-logo-name { color: #fff; }
        .vs-logo-name span { color: #2563EB; }
        .vs-topbar-divider { width: 1px; height: 20px; background: ${DS.shellBorder}; margin: 0 12px; flex-shrink: 0; }
        .vs-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 13px; font-family: ${FONT.body}; flex: 1; min-width: 0; overflow: hidden; }
        .vs-breadcrumb a { color: rgba(255,255,255,0.45); text-decoration: none; white-space: nowrap; flex-shrink: 0; }
        .vs-breadcrumb a:hover { color: rgba(255,255,255,0.80); }
        .vs-breadcrumb-sep { color: rgba(255,255,255,0.20); flex-shrink: 0; }
        .vs-breadcrumb-current { color: rgba(255,255,255,0.85); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .vs-topbar-right { flex-shrink: 0; margin-left: 8px; }

        /* ── Content ── */
        .vs-content { max-width: 860px; margin: 0 auto; padding: 24px 16px 60px; }

        /* ── Customer card ── */
        .vs-customer-card { background: ${DS.card}; border: 1px solid ${DS.border}; border-radius: ${R.xl}px; box-shadow: ${DS.cardShadow}; overflow: hidden; margin-bottom: 20px; }
        .vs-band { height: 4px; background: linear-gradient(90deg, ${DS.blue} 0%, #7c3aed 60%, ${DS.amber} 100%); }
        .vs-customer-body { padding: 16px; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .vs-customer-icon { width: 44px; height: 44px; border-radius: ${R.lg}px; flex-shrink: 0; background: ${DS.blueLight}; border: 1px solid ${DS.blueMid}; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .vs-customer-info { flex: 1; min-width: 0; }
        .vs-customer-name { font-family: ${FONT.head}; font-weight: 800; font-size: 18px; color: ${DS.text1}; letter-spacing: -0.3px; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .vs-customer-address { font-size: 13px; color: ${DS.text2}; margin-bottom: 7px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .vs-meta-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .vs-badge { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 20px; font-family: ${FONT.head}; font-weight: 600; font-size: 11px; letter-spacing: 0.3px; white-space: nowrap; }
        .vs-badge-blue  { background: ${DS.blueLight}; color: ${DS.blue}; border: 1px solid ${DS.blueMid}; }
        .vs-badge-green { background: ${DS.greenLight}; color: ${DS.green}; border: 1px solid #A7F3D0; }
        .vs-meta-time { font-size: 11px; color: ${DS.text3}; font-family: ${FONT.mono}; }

        /* ── Notes ── */
        .vs-notes { background: ${DS.card}; border: 1px solid ${DS.border}; border-radius: ${R.xl}px; box-shadow: ${DS.cardShadow}; padding: 14px 16px; margin-bottom: 20px; }
        .vs-notes-label { font-family: ${FONT.head}; font-weight: 700; font-size: 10.5px; letter-spacing: 0.5px; text-transform: uppercase; color: ${DS.text3}; margin-bottom: 5px; }
        .vs-notes-text { font-size: 13.5px; color: ${DS.text2}; line-height: 1.6; }

        /* ── Section head ── */
        .vs-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 10px; }
        .vs-section-title { font-family: ${FONT.head}; font-weight: 700; font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase; color: ${DS.text3}; }

        /* ── Estimate list ── */
        .vs-est-list { display: flex; flex-direction: column; gap: 10px; }
        .vs-est-card { background: ${DS.card}; border: 1px solid ${DS.border}; border-radius: ${R.xl}px; box-shadow: ${DS.cardShadow}; overflow: hidden; transition: box-shadow 0.15s, border-color 0.15s; }
        .vs-est-card:hover { box-shadow: ${DS.raisedShadow}; border-color: ${DS.blueMid}; }
        .vs-est-row { display: flex; align-items: center; padding: 14px 16px; gap: 12px; }
        .vs-est-icon { width: 38px; height: 38px; border-radius: ${R.md}px; flex-shrink: 0; background: ${DS.greenLight}; border: 1px solid #A7F3D0; display: flex; align-items: center; justify-content: center; font-size: 17px; }
        .vs-est-info { flex: 1; min-width: 0; }
        .vs-est-desc { font-size: 13.5px; font-weight: 600; color: ${DS.text1}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
        .vs-est-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .vs-est-total { font-family: ${FONT.mono}; font-size: 13px; font-weight: 600; color: ${DS.green}; }
        .vs-est-time { font-size: 11px; color: ${DS.text3}; font-family: ${FONT.mono}; }
        .vs-est-scope { font-size: 11px; color: ${DS.text3}; }
        .vs-est-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .vs-delete-bar { padding: 10px 16px; background: ${DS.redLight}; border-top: 1px solid #FCA5A5; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .vs-delete-text { font-size: 13px; color: ${DS.red}; font-weight: 500; }

        /* ── Empty ── */
        .vs-empty { background: ${DS.card}; border: 1px dashed ${DS.border}; border-radius: ${R.xl}px; padding: 44px 20px; text-align: center; }
        .vs-empty-icon { font-size: 32px; margin-bottom: 10px; }
        .vs-empty-title { font-family: ${FONT.head}; font-weight: 700; font-size: 15px; color: ${DS.text1}; margin-bottom: 6px; }
        .vs-empty-sub { font-size: 13px; color: ${DS.text3}; margin-bottom: 18px; line-height: 1.5; }

        /* ── Buttons ── */
        .vs-btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: ${R.md}px; border: none; background: linear-gradient(135deg, ${DS.blue} 0%, ${DS.blueDark} 100%); color: #fff; font-family: ${FONT.head}; font-weight: 700; font-size: 13px; cursor: pointer; box-shadow: ${DS.blueShadow}; text-decoration: none; white-space: nowrap; }
        .vs-btn-ghost { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: ${R.sm}px; border: 1px solid ${DS.border}; background: transparent; color: ${DS.text2}; font-family: ${FONT.body}; font-weight: 500; font-size: 12px; cursor: pointer; text-decoration: none; white-space: nowrap; }
        .vs-btn-danger { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: ${R.sm}px; border: 1px solid #FCA5A5; background: ${DS.redLight}; color: ${DS.red}; font-family: ${FONT.body}; font-weight: 600; font-size: 12px; cursor: pointer; }

        @media (max-width: 600px) {
          .vs-topbar { padding: 0 12px; }
          .vs-customer-body { padding: 14px; }
          .vs-est-row { padding: 12px 14px; }
        }
      `}</style>

      <div className="vs-page">

        {/* Topbar */}
        <nav className="vs-topbar">
          <a href="/" className="vs-logo">
            <LogoMark />
            <span className="vs-logo-name">Sparc<span>Bid</span></span>
          </a>
          <div className="vs-topbar-divider" />
          <div className="vs-breadcrumb">
            <a href="/projects">Customers</a>
            <span className="vs-breadcrumb-sep">›</span>
            <span className="vs-breadcrumb-current">{project.customerName}</span>
          </div>
          <div className="vs-topbar-right">
            <Link href={`/projects/${project.id}/estimates/new`} className="vs-btn-primary">
              + New Estimate
            </Link>
          </div>
        </nav>

        <div className="vs-content">

          {/* Customer card */}
          <div className="vs-customer-card">
            <div className="vs-band" />
            <div className="vs-customer-body">
              <div className="vs-customer-icon">🏠</div>
              <div className="vs-customer-info">
                <div className="vs-customer-name">{project.customerName}</div>
                <div className="vs-customer-address">{project.address}</div>
                <div className="vs-meta-row">
                  {estimates.length > 0 && (
                    <span className="vs-badge vs-badge-green">{estimates.length} estimate{estimates.length !== 1 ? "s" : ""}</span>
                  )}
                  <span className="vs-meta-time">
                    Created {new Date(project.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {project.notes && (
            <div className="vs-notes">
              <div className="vs-notes-label">Notes</div>
              <div className="vs-notes-text">{project.notes}</div>
            </div>
          )}

          {/* Estimates section */}
          <div className="vs-section-head">
            <span className="vs-section-title">
              Estimates {estimates.length > 0 && `· ${estimates.length}`}
            </span>
            <Link href={`/projects/${project.id}/estimates/new`} className="vs-btn-ghost">
              + New Estimate
            </Link>
          </div>

          {estimates.length === 0 ? (
            <div className="vs-empty">
              <div className="vs-empty-icon">📋</div>
              <div className="vs-empty-title">No estimates yet</div>
              <div className="vs-empty-sub">
                Describe the job scope and get a full priced<br />material list and labor breakdown in seconds.
              </div>
              <Link href={`/projects/${project.id}/estimates/new`} className="vs-btn-primary">
                + Create First Estimate
              </Link>
            </div>
          ) : (
            <div className="vs-est-list">
              {estimates.map((e) => (
                <div key={e.id} className="vs-est-card">
                  <div className="vs-est-row">
                    <div className="vs-est-icon">📄</div>
                    <div className="vs-est-info">
                      <div className="vs-est-desc">{e.description || "Electrical estimate"}</div>
                      <div className="vs-est-meta">
                        <span className="vs-est-total">${fmt(e.finalTotal)}</span>
                        <span className="vs-est-time">{relativeTime(e.savedAt)}</span>
                        <span className="vs-est-scope">
                          {e.scopeType === "assembly" ? "Assembly" : "Line item"}
                          {e.sqft ? ` · ${e.sqft.toLocaleString()} sq ft` : ""}
                        </span>
                      </div>
                    </div>
                    <div className="vs-est-actions">
                      <Link href={`/projects/${project.id}/estimates/new?load=${e.id}`} className="vs-btn-ghost">
                        Open
                      </Link>
                      <button
                        type="button" className="vs-btn-ghost"
                        style={{ color: DS.red, borderColor: "#FCA5A5" }}
                        onClick={() => setDeleteConfirm(deleteConfirm === e.id ? null : e.id)}
                      >✕</button>
                    </div>
                  </div>

                  {deleteConfirm === e.id && (
                    <div className="vs-delete-bar">
                      <span className="vs-delete-text">Delete this estimate? Cannot be undone.</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" className="vs-btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                        <button type="button" className="vs-btn-danger" onClick={() => handleDelete(e.id)}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  );
}