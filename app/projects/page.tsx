"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProjects, saveProject, deleteProject, type Project } from "@/app/lib/projectStore";

// =============================================================================
// VOLTSCOPE DESIGN SYSTEM
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

// =============================================================================
// Job type options
// =============================================================================
const JOB_TYPES = [
  "Residential Service",
  "Commercial Service",
  "New Construction",
  "EV Charger Install",
  "Panel Upgrade",
  "Service Upgrade",
  "Lighting Install",
  "Warehouse / Industrial",
  "Troubleshooting",
  "Other",
];

type NewProjectForm = {
  customerName: string;
  address:      string;
  jobType:      string;
  notes:        string;
};

const emptyForm = (): NewProjectForm => ({
  customerName: "",
  address:      "",
  jobType:      "Residential Service",
  notes:        "",
});

// =============================================================================
// Component
// =============================================================================
export default function ProjectsPage() {
  const [projects,     setProjects]     = useState<Project[]>([]);
  const [showForm,     setShowForm]     = useState(false);
  const [form,         setForm]         = useState<NewProjectForm>(emptyForm());
  const [errors,       setErrors]       = useState<Partial<NewProjectForm>>({});
  const [search,       setSearch]       = useState("");
  const [deleteConfirm,setDeleteConfirm]= useState<string | null>(null);

  useEffect(() => {
    setProjects(getProjects());
  }, []);

  // ── Filter ──
  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.customerName.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      p.jobType.toLowerCase().includes(q)
    );
  });

  // ── Create ──
  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const errs: Partial<NewProjectForm> = {};
    if (!form.customerName.trim()) errs.customerName = "Customer name is required";
    if (!form.address.trim())      errs.address      = "Address is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const created = saveProject({
      customerName: form.customerName.trim(),
      address:      form.address.trim(),
      jobType:      form.jobType,
      notes:        form.notes.trim(),
    });

    setProjects(getProjects());
    setShowForm(false);
    setForm(emptyForm());
    setErrors({});
  }

  // ── Delete ──
  function handleDelete(id: string) {
    deleteProject(id);
    setProjects(getProjects());
    setDeleteConfirm(null);
  }

  function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  <  1) return "just now";
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  <  7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  // ==========================================================================
  // Render
  // ==========================================================================
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
          display: flex; align-items: center; padding: 0 24px; gap: 16px;
        }
        .vs-logo {
          font-family: ${FONT.head}; font-weight: 800; font-size: 16px;
          color: #fff; letter-spacing: -0.3px;
          display: flex; align-items: center; gap: 9px; text-decoration: none;
        }
        .vs-logo-mark {
          width: 30px; height: 30px; border-radius: ${R.md}px;
          background: linear-gradient(135deg, ${DS.blue} 0%, ${DS.blueDark} 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; box-shadow: 0 4px 12px rgba(37,99,235,0.45);
        }
        .vs-topbar-divider { width: 1px; height: 20px; background: ${DS.shellBorder}; }
        .vs-topbar-nav { display: flex; align-items: center; gap: 4px; }
        .vs-nav-link {
          font-family: ${FONT.body}; font-size: 13px; font-weight: 500;
          color: rgba(255,255,255,0.50); text-decoration: none;
          padding: 5px 10px; border-radius: ${R.sm}px;
          transition: background 0.15s, color 0.15s;
        }
        .vs-nav-link:hover  { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.85); }
        .vs-nav-link.active { color: rgba(255,255,255,0.90); background: rgba(255,255,255,0.08); }

        /* ── Content ── */
        .vs-content { max-width: 900px; margin: 0 auto; padding: 32px 20px 64px; }

        /* ── Page heading row ── */
        .vs-page-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
        }
        .vs-page-title {
          font-family: ${FONT.head}; font-weight: 800; font-size: 24px;
          color: ${DS.text1}; letter-spacing: -0.5px; margin-bottom: 3px;
        }
        .vs-page-sub { font-size: 13.5px; color: ${DS.text3}; }

        /* ── Search bar ── */
        .vs-search-row {
          display: flex; gap: 10px; align-items: center;
          margin-bottom: 18px; flex-wrap: wrap;
        }
        .vs-search {
          flex: 1; min-width: 200px;
          padding: 9px 14px 9px 36px;
          border-radius: ${R.md}px;
          border: 1.5px solid ${DS.border};
          font-family: ${FONT.body}; font-size: 13.5px;
          color: ${DS.text1}; background: ${DS.card};
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='15' height='15' fill='none' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='8' stroke='%2394A3B8' stroke-width='2'/%3E%3Cpath d='M21 21l-4.35-4.35' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: 11px center;
        }
        .vs-search:focus {
          border-color: ${DS.blue};
          box-shadow: 0 0 0 3px rgba(37,99,235,0.11);
        }

        /* ── Buttons ── */
        .vs-btn-primary {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 18px; border-radius: ${R.md}px; border: none;
          background: linear-gradient(135deg, ${DS.blue} 0%, ${DS.blueDark} 100%);
          color: #fff; font-family: ${FONT.head}; font-weight: 700;
          font-size: 13px; cursor: pointer; box-shadow: ${DS.blueShadow};
          white-space: nowrap; transition: opacity 0.15s;
        }
        .vs-btn-secondary {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 16px; border-radius: ${R.md}px;
          border: 1px solid ${DS.border}; background: ${DS.card};
          color: ${DS.text1}; font-family: ${FONT.head}; font-weight: 600;
          font-size: 13px; cursor: pointer; box-shadow: ${DS.cardShadow};
          white-space: nowrap;
        }
        .vs-btn-ghost {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 10px; border-radius: ${R.sm}px;
          border: 1px solid ${DS.border}; background: transparent;
          color: ${DS.text3}; font-family: ${FONT.body}; font-weight: 500;
          font-size: 12px; cursor: pointer;
        }
        .vs-btn-danger {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 10px; border-radius: ${R.sm}px;
          border: 1px solid #FCA5A5; background: ${DS.redLight};
          color: ${DS.red}; font-family: ${FONT.body}; font-weight: 600;
          font-size: 12px; cursor: pointer;
        }

        /* ── New project form card ── */
        .vs-form-card {
          background: ${DS.card}; border: 1px solid ${DS.blueMid};
          border-radius: ${R.xl}px; box-shadow: ${DS.raisedShadow};
          overflow: hidden; margin-bottom: 24px;
        }
        .vs-form-header {
          padding: 14px 20px; background: ${DS.blueLight};
          border-bottom: 1px solid ${DS.blueMid};
          display: flex; align-items: center; justify-content: space-between;
        }
        .vs-form-title {
          font-family: ${FONT.head}; font-weight: 700; font-size: 14px;
          color: ${DS.blue};
        }
        .vs-form-body { padding: 20px; }
        .vs-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .vs-form-grid .full { grid-column: 1 / -1; }
        .vs-label {
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
        .vs-input.error { border-color: ${DS.red}; }
        .vs-select {
          width: 100%; padding: 10px 13px; border-radius: ${R.md}px;
          border: 1.5px solid ${DS.border}; font-family: ${FONT.body};
          font-size: 14px; color: ${DS.text1}; background: ${DS.card};
          outline: none; cursor: pointer; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 12px center;
        }
        .vs-select:focus { border-color: ${DS.blue}; box-shadow: 0 0 0 3px rgba(37,99,235,0.11); }
        .vs-textarea {
          width: 100%; padding: 10px 13px; border-radius: ${R.md}px;
          border: 1.5px solid ${DS.border}; font-family: ${FONT.body};
          font-size: 14px; color: ${DS.text1}; background: ${DS.card};
          outline: none; resize: vertical; min-height: 76px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .vs-textarea:focus { border-color: ${DS.blue}; box-shadow: 0 0 0 3px rgba(37,99,235,0.11); }
        .vs-field-error { font-size: 11.5px; color: ${DS.red}; margin-top: 5px; }
        .vs-form-actions {
          display: flex; justify-content: flex-end; gap: 10px;
          padding: 14px 20px; border-top: 1px solid ${DS.divider};
          background: ${DS.divider};
        }

        /* ── Project cards ── */
        .vs-projects-list { display: flex; flex-direction: column; gap: 10px; }

        .vs-project-card {
          background: ${DS.card}; border: 1px solid ${DS.border};
          border-radius: ${R.xl}px; box-shadow: ${DS.cardShadow};
          overflow: hidden; transition: box-shadow 0.15s, border-color 0.15s;
        }
        .vs-project-card:hover { box-shadow: ${DS.raisedShadow}; border-color: ${DS.blueMid}; }

        .vs-project-inner {
          display: flex; align-items: center;
          padding: 16px 20px; gap: 16px; text-decoration: none; color: inherit;
        }

        .vs-project-icon {
          width: 42px; height: 42px; border-radius: ${R.lg}px; flex-shrink: 0;
          background: ${DS.blueLight}; display: flex; align-items: center;
          justify-content: center; font-size: 18px;
        }

        .vs-project-info { flex: 1; min-width: 0; }
        .vs-project-name {
          font-family: ${FONT.head}; font-weight: 700; font-size: 15px;
          color: ${DS.text1}; margin-bottom: 3px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .vs-project-address {
          font-size: 13px; color: ${DS.text2}; margin-bottom: 4px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .vs-project-meta {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        }
        .vs-project-badge {
          display: inline-flex; align-items: center;
          padding: 2px 8px; border-radius: 20px;
          font-family: ${FONT.head}; font-weight: 600; font-size: 10.5px;
          letter-spacing: 0.3px; background: ${DS.divider};
          color: ${DS.text3}; border: 1px solid ${DS.border};
        }
        .vs-project-time { font-size: 11.5px; color: ${DS.text3}; font-family: ${FONT.mono}; }

        .vs-project-actions {
          display: flex; align-items: center; gap: 8px; flex-shrink: 0;
          padding: 0 16px;
        }

        /* ── Delete confirm inline ── */
        .vs-delete-confirm {
          padding: 12px 20px;
          background: ${DS.redLight}; border-top: 1px solid #FCA5A5;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap;
        }
        .vs-delete-text { font-size: 13px; color: ${DS.red}; font-weight: 500; }

        /* ── Empty state ── */
        .vs-empty {
          text-align: center; padding: 64px 20px;
          background: ${DS.card}; border: 1px dashed ${DS.border};
          border-radius: ${R.xl}px;
        }
        .vs-empty-icon { font-size: 40px; margin-bottom: 14px; }
        .vs-empty-title {
          font-family: ${FONT.head}; font-weight: 700; font-size: 16px;
          color: ${DS.text1}; margin-bottom: 8px;
        }
        .vs-empty-sub { font-size: 13.5px; color: ${DS.text3}; margin-bottom: 24px; }

        @media (max-width: 640px) {
          .vs-form-grid { grid-template-columns: 1fr; }
          .vs-project-inner { flex-wrap: wrap; }
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
            <a href="/dashboard" className="vs-nav-link">Dashboard</a>
            <a href="/projects"  className="vs-nav-link active">Projects</a>
          </div>
        </nav>

        <div className="vs-content">

          {/* ── Page header ── */}
          <div className="vs-page-header">
            <div>
              <div className="vs-page-title">Projects</div>
              <div className="vs-page-sub">
                {projects.length > 0
                  ? `${projects.length} project${projects.length !== 1 ? "s" : ""} saved`
                  : "Create your first project to get started"}
              </div>
            </div>
            {!showForm && (
              <button type="button" className="vs-btn-primary" onClick={() => setShowForm(true)}>
                + New Project
              </button>
            )}
          </div>

          {/* ── New project form ── */}
          {showForm && (
            <div className="vs-form-card">
              <div className="vs-form-header">
                <span className="vs-form-title">New Project</span>
              </div>
              <form onSubmit={handleCreate} noValidate>
                <div className="vs-form-body">
                  <div className="vs-form-grid">
                    <div>
                      <label className="vs-label" htmlFor="customerName">Customer Name *</label>
                      <input
                        id="customerName" type="text"
                        className={`vs-input${errors.customerName ? " error" : ""}`}
                        placeholder="John Smith"
                        value={form.customerName}
                        onChange={e => { setForm(f => ({ ...f, customerName: e.target.value })); setErrors(ev => ({ ...ev, customerName: "" })); }}
                      />
                      {errors.customerName && <div className="vs-field-error">{errors.customerName}</div>}
                    </div>

                    <div>
                      <label className="vs-label" htmlFor="jobType">Job Type *</label>
                      <select
                        id="jobType"
                        className="vs-select"
                        value={form.jobType}
                        onChange={e => setForm(f => ({ ...f, jobType: e.target.value }))}
                      >
                        {JOB_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div className="full">
                      <label className="vs-label" htmlFor="address">Job Address *</label>
                      <input
                        id="address" type="text"
                        className={`vs-input${errors.address ? " error" : ""}`}
                        placeholder="123 Main St, City, NC 27601"
                        value={form.address}
                        onChange={e => { setForm(f => ({ ...f, address: e.target.value })); setErrors(ev => ({ ...ev, address: "" })); }}
                      />
                      {errors.address && <div className="vs-field-error">{errors.address}</div>}
                    </div>

                    <div className="full">
                      <label className="vs-label" htmlFor="notes">Notes <span style={{ color: DS.text3, fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                      <textarea
                        id="notes"
                        className="vs-textarea"
                        placeholder="Any additional details about this project…"
                        value={form.notes}
                        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <div className="vs-form-actions">
                  <button type="button" className="vs-btn-secondary" onClick={() => { setShowForm(false); setForm(emptyForm()); setErrors({}); }}>
                    Cancel
                  </button>
                  <button type="submit" className="vs-btn-primary">
                    Create Project →
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Search (only show if projects exist) ── */}
          {projects.length > 0 && (
            <div className="vs-search-row">
              <input
                type="search"
                className="vs-search"
                placeholder="Search by name, address, or job type…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <span style={{ fontSize: 12, color: DS.text3, whiteSpace: "nowrap" }}>
                {filtered.length} of {projects.length}
              </span>
            </div>
          )}

          {/* ── Projects list ── */}
          {projects.length === 0 ? (
            <div className="vs-empty">
              <div className="vs-empty-icon">📋</div>
              <div className="vs-empty-title">No projects yet</div>
              <div className="vs-empty-sub">Create your first project to start generating estimates.</div>
              <button type="button" className="vs-btn-primary" onClick={() => setShowForm(true)}>
                + New Project
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="vs-empty">
              <div className="vs-empty-icon">🔍</div>
              <div className="vs-empty-title">No results</div>
              <div className="vs-empty-sub">No projects match "{search}"</div>
            </div>
          ) : (
            <div className="vs-projects-list">
              {filtered.map((p) => (
                <div key={p.id} className="vs-project-card">
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <Link href={`/projects/${p.id}`} className="vs-project-inner" style={{ flex: 1 }}>
                      <div className="vs-project-icon">🏠</div>
                      <div className="vs-project-info">
                        <div className="vs-project-name">{p.customerName}</div>
                        <div className="vs-project-address">{p.address}</div>
                        <div className="vs-project-meta">
                          <span className="vs-project-badge">{p.jobType}</span>
                          <span className="vs-project-time">{relativeTime(p.createdAt)}</span>
                        </div>
                      </div>
                    </Link>
                    <div className="vs-project-actions">
                      <Link href={`/projects/${p.id}`}>
                        <button type="button" className="vs-btn-ghost">Open →</button>
                      </Link>
                      <button
                        type="button"
                        className="vs-btn-ghost"
                        style={{ color: DS.red, borderColor: "#FCA5A5" }}
                        onClick={() => setDeleteConfirm(deleteConfirm === p.id ? null : p.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Inline delete confirm */}
                  {deleteConfirm === p.id && (
                    <div className="vs-delete-confirm">
                      <span className="vs-delete-text">
                        Delete <strong>{p.customerName}</strong>? This cannot be undone.
                      </span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="button" className="vs-btn-ghost" onClick={() => setDeleteConfirm(null)}>
                          Cancel
                        </button>
                        <button type="button" className="vs-btn-danger" onClick={() => handleDelete(p.id)}>
                          Yes, delete
                        </button>
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