"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getProjects, saveProject, deleteProject, type Project } from "@/app/lib/projectStore";
import { supabase } from "@/app/lib/supabase";
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

type NewCustomerForm = { customerName: string; address: string; notes: string; };
const emptyForm = (): NewCustomerForm => ({ customerName: "", address: "", notes: "" });

function relativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Inner component uses useSearchParams — must be inside Suspense ──
function ProjectsInner() {
  const searchParams = useSearchParams();

  const [projects,       setProjects]       = useState<Project[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [estimateCounts, setEstimateCounts] = useState<Record<string, number>>({});
  const [showForm,       setShowForm]       = useState(false);
  const [form,           setForm]           = useState<NewCustomerForm>(emptyForm());
  const [errors,         setErrors]         = useState<Partial<NewCustomerForm>>({});
  const [saving,         setSaving]         = useState(false);
  const [search,         setSearch]         = useState("");
  const [deleteConfirm,  setDeleteConfirm]  = useState<string | null>(null);

  useEffect(() => {
    if (searchParams?.get("new") === "1") setShowForm(true);
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      const data = await getProjects();
      setProjects(data);
      setLoading(false);
      if (data.length > 0) {
        const { data: ests } = await supabase.from("estimates").select("customer_id");
        if (ests) {
          const counts: Record<string, number> = {};
          for (const e of ests) counts[e.customer_id] = (counts[e.customer_id] ?? 0) + 1;
          setEstimateCounts(counts);
        }
      }
    }
    load();
  }, []);

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    return p.customerName.toLowerCase().includes(q) || p.address.toLowerCase().includes(q);
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const errs: Partial<NewCustomerForm> = {};
    if (!form.customerName.trim()) errs.customerName = "Customer name is required";
    if (!form.address.trim())      errs.address      = "Address is required";
    if (Object.keys(errs).length)  { setErrors(errs); return; }
    setSaving(true);
    const created = await saveProject({ customerName: form.customerName.trim(), address: form.address.trim(), jobType: "General", notes: form.notes.trim() });
    setSaving(false);
    if (created) { setProjects(await getProjects()); setShowForm(false); setForm(emptyForm()); setErrors({}); }
  }

  async function handleDelete(id: string) {
    await deleteProject(id);
    setProjects(await getProjects());
    setDeleteConfirm(null);
  }

  return (
    <div className="vs-content">
      <div className="vs-page-header">
        <div>
          <div className="vs-page-title">Customers</div>
          <div className="vs-page-sub">
            {loading ? "Loading…" : projects.length > 0
              ? `${projects.length} customer${projects.length !== 1 ? "s" : ""}`
              : "Add your first customer to get started"}
          </div>
        </div>
        {!showForm && (
          <button type="button" className="vs-btn-primary" onClick={() => setShowForm(true)}>+ New</button>
        )}
      </div>

      {showForm && (
        <div className="vs-form-card">
          <div className="vs-form-header"><span className="vs-form-title">New Customer</span></div>
          <form onSubmit={handleCreate} noValidate>
            <div className="vs-form-body">
              <div className="vs-form-grid">
                <div className="full">
                  <label className="vs-label" htmlFor="customerName">Customer / Company Name *</label>
                  <input id="customerName" type="text" className={`vs-input${errors.customerName ? " error" : ""}`}
                    placeholder="John Smith" value={form.customerName}
                    onChange={e => { setForm(f => ({ ...f, customerName: e.target.value })); setErrors(ev => ({ ...ev, customerName: "" })); }} />
                  {errors.customerName && <div className="vs-field-error">{errors.customerName}</div>}
                </div>
                <div className="full">
                  <label className="vs-label" htmlFor="address">Job Address *</label>
                  <input id="address" type="text" className={`vs-input${errors.address ? " error" : ""}`}
                    placeholder="123 Main St, City, NC 27601" value={form.address}
                    onChange={e => { setForm(f => ({ ...f, address: e.target.value })); setErrors(ev => ({ ...ev, address: "" })); }} />
                  {errors.address && <div className="vs-field-error">{errors.address}</div>}
                </div>
                <div className="full">
                  <label className="vs-label" htmlFor="notes">Notes <span style={{ color: DS.text3, fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                  <textarea id="notes" className="vs-textarea" placeholder="Any additional details…"
                    value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="vs-form-actions">
              <button type="button" className="vs-btn-secondary"
                onClick={() => { setShowForm(false); setForm(emptyForm()); setErrors({}); }}>Cancel</button>
              <button type="submit" className="vs-btn-primary" disabled={saving}>{saving ? "Saving…" : "Create →"}</button>
            </div>
          </form>
        </div>
      )}

      {projects.length > 0 && (
        <div className="vs-search-row">
          <input type="search" className="vs-search" placeholder="Search by name or address…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <span className="vs-search-count">{filtered.length}/{projects.length}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: DS.text3, fontSize: 13 }}>Loading…</div>
      ) : projects.length === 0 ? (
        <div className="vs-empty">
          <div className="vs-empty-icon">📋</div>
          <div className="vs-empty-title">No customers yet</div>
          <div className="vs-empty-sub">Add your first customer to start generating estimates.</div>
          <button type="button" className="vs-btn-primary" onClick={() => setShowForm(true)}>+ New Customer</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="vs-empty">
          <div className="vs-empty-icon">🔍</div>
          <div className="vs-empty-title">No results</div>
          <div className="vs-empty-sub">No customers match "{search}"</div>
        </div>
      ) : (
        <div className="vs-list">
          {filtered.map((p) => (
            <div key={p.id} className="vs-card">
              <div className="vs-card-row">
                <Link href={`/projects/${p.id}`} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, textDecoration: "none" }}>
                  <div className="vs-card-icon">🏠</div>
                  <div className="vs-card-info">
                    <div className="vs-card-name">{p.customerName}</div>
                    <div className="vs-card-address">{p.address}</div>
                    <div className="vs-card-meta">
                      {(estimateCounts[p.id] ?? 0) > 0 && (
                        <span className="vs-badge vs-badge-green">{estimateCounts[p.id]} est.</span>
                      )}
                      <span className="vs-card-time">{relativeTime(p.createdAt)}</span>
                    </div>
                  </div>
                </Link>
                <div className="vs-card-actions">
                  <Link href={`/projects/${p.id}`} className="vs-btn-ghost vs-btn-open">Open →</Link>
                  <button type="button" className="vs-btn-ghost" style={{ color: DS.red, borderColor: "#FCA5A5" }}
                    onClick={() => setDeleteConfirm(deleteConfirm === p.id ? null : p.id)}>✕</button>
                </div>
              </div>
              {deleteConfirm === p.id && (
                <div className="vs-delete-bar">
                  <span className="vs-delete-text">Delete <strong>{p.customerName}</strong>?</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="vs-btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                    <button type="button" className="vs-btn-danger" onClick={() => handleDelete(p.id)}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shell + Suspense wrapper ──
export default function ProjectsPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${DS.pageBg}; }
        .vs-page { min-height: 100vh; background: ${DS.pageBg}; font-family: ${FONT.body}; color: ${DS.text1}; }
        .vs-topbar { position: sticky; top: 0; z-index: 100; height: 56px; background: ${DS.shell}; border-bottom: 1px solid ${DS.shellBorder}; display: flex; align-items: center; padding: 0 16px; gap: 0; overflow: hidden; }
        .vs-logo { font-family: ${FONT.head}; font-weight: 800; font-size: 16px; color: #fff; letter-spacing: -0.3px; display: flex; align-items: center; gap: 8px; text-decoration: none; flex-shrink: 0; }
        .vs-logo-name { color: #fff; }
        .vs-logo-name span { color: #2563EB; }
        .vs-logo-mark { width: 30px; height: 30px; border-radius: ${R.md}px; background: #0B0F1A; border: 1px solid rgba(37,99,235,0.4); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .vs-topbar-divider { width: 1px; height: 20px; background: ${DS.shellBorder}; margin: 0 12px; flex-shrink: 0; }
        .vs-topbar-nav { display: flex; align-items: center; gap: 2px; flex: 1; min-width: 0; }
        .vs-nav-link { font-family: ${FONT.body}; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.50); text-decoration: none; padding: 5px 8px; border-radius: ${R.sm}px; transition: background 0.15s, color 0.15s; white-space: nowrap; }
        .vs-nav-link:hover  { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.85); }
        .vs-nav-link.active { color: rgba(255,255,255,0.90); background: rgba(255,255,255,0.08); }
        .vs-content { max-width: 860px; margin: 0 auto; padding: 24px 16px 60px; }
        .vs-page-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .vs-page-title { font-family: ${FONT.head}; font-weight: 800; font-size: 22px; color: ${DS.text1}; letter-spacing: -0.4px; margin-bottom: 2px; }
        .vs-page-sub { font-size: 13px; color: ${DS.text3}; }
        .vs-btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: ${R.md}px; border: none; background: linear-gradient(135deg, ${DS.blue} 0%, ${DS.blueDark} 100%); color: #fff; font-family: ${FONT.head}; font-weight: 700; font-size: 13px; cursor: pointer; box-shadow: ${DS.blueShadow}; white-space: nowrap; flex-shrink: 0; }
        .vs-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
        .vs-btn-secondary { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: ${R.md}px; border: 1px solid ${DS.border}; background: ${DS.card}; color: ${DS.text1}; font-family: ${FONT.head}; font-weight: 600; font-size: 13px; cursor: pointer; white-space: nowrap; }
        .vs-btn-ghost { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: ${R.sm}px; border: 1px solid ${DS.border}; background: transparent; color: ${DS.text3}; font-family: ${FONT.body}; font-weight: 500; font-size: 12px; cursor: pointer; white-space: nowrap; }
        .vs-btn-danger { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: ${R.sm}px; border: 1px solid #FCA5A5; background: ${DS.redLight}; color: ${DS.red}; font-family: ${FONT.body}; font-weight: 600; font-size: 12px; cursor: pointer; }
        .vs-form-card { background: ${DS.card}; border: 1px solid ${DS.blueMid}; border-radius: ${R.xl}px; box-shadow: ${DS.raisedShadow}; overflow: hidden; margin-bottom: 20px; }
        .vs-form-header { padding: 12px 16px; background: ${DS.blueLight}; border-bottom: 1px solid ${DS.blueMid}; }
        .vs-form-title { font-family: ${FONT.head}; font-weight: 700; font-size: 14px; color: ${DS.blue}; }
        .vs-form-body { padding: 16px; }
        .vs-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .vs-form-grid .full { grid-column: 1 / -1; }
        .vs-label { display: block; font-family: ${FONT.head}; font-weight: 600; font-size: 11px; letter-spacing: 0.4px; text-transform: uppercase; color: ${DS.text2}; margin-bottom: 5px; }
        .vs-input { width: 100%; padding: 9px 12px; border-radius: ${R.md}px; border: 1.5px solid ${DS.border}; font-family: ${FONT.body}; font-size: 14px; color: ${DS.text1}; background: ${DS.card}; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
        .vs-input:focus { border-color: ${DS.blue}; box-shadow: 0 0 0 3px rgba(37,99,235,0.11); }
        .vs-input.error { border-color: ${DS.red}; }
        .vs-select { width: 100%; padding: 9px 12px; border-radius: ${R.md}px; border: 1.5px solid ${DS.border}; font-family: ${FONT.body}; font-size: 14px; color: ${DS.text1}; background: ${DS.card}; outline: none; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; }
        .vs-select:focus { border-color: ${DS.blue}; box-shadow: 0 0 0 3px rgba(37,99,235,0.11); }
        .vs-textarea { width: 100%; padding: 9px 12px; border-radius: ${R.md}px; border: 1.5px solid ${DS.border}; font-family: ${FONT.body}; font-size: 14px; color: ${DS.text1}; background: ${DS.card}; outline: none; resize: vertical; min-height: 72px; }
        .vs-textarea:focus { border-color: ${DS.blue}; box-shadow: 0 0 0 3px rgba(37,99,235,0.11); }
        .vs-field-error { font-size: 11.5px; color: ${DS.red}; margin-top: 4px; }
        .vs-form-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid ${DS.divider}; background: ${DS.divider}; }
        .vs-search-row { display: flex; gap: 10px; align-items: center; margin-bottom: 16px; }
        .vs-search { flex: 1; padding: 9px 14px 9px 36px; border-radius: ${R.md}px; border: 1.5px solid ${DS.border}; font-family: ${FONT.body}; font-size: 13.5px; color: ${DS.text1}; background: ${DS.card}; outline: none; min-width: 0; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='15' height='15' fill='none' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='8' stroke='%2394A3B8' stroke-width='2'/%3E%3Cpath d='M21 21l-4.35-4.35' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: 11px center; }
        .vs-search:focus { border-color: ${DS.blue}; box-shadow: 0 0 0 3px rgba(37,99,235,0.11); }
        .vs-search-count { font-size: 12px; color: ${DS.text3}; white-space: nowrap; flex-shrink: 0; }
        .vs-list { display: flex; flex-direction: column; gap: 10px; }
        .vs-card { background: ${DS.card}; border: 1px solid ${DS.border}; border-radius: ${R.xl}px; box-shadow: ${DS.cardShadow}; overflow: hidden; transition: box-shadow 0.15s, border-color 0.15s; }
        .vs-card:hover { box-shadow: ${DS.raisedShadow}; border-color: ${DS.blueMid}; }
        .vs-card-row { display: flex; align-items: center; padding: 14px 16px; gap: 12px; }
        .vs-card-icon { width: 40px; height: 40px; border-radius: ${R.lg}px; flex-shrink: 0; background: ${DS.blueLight}; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .vs-card-info { flex: 1; min-width: 0; }
        .vs-card-name { font-family: ${FONT.head}; font-weight: 700; font-size: 15px; color: ${DS.text1}; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .vs-card-address { font-size: 12.5px; color: ${DS.text2}; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .vs-card-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .vs-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-family: ${FONT.head}; font-weight: 600; font-size: 10.5px; letter-spacing: 0.3px; white-space: nowrap; }
        .vs-badge-gray  { background: ${DS.divider}; color: ${DS.text3}; border: 1px solid ${DS.border}; }
        .vs-badge-green { background: ${DS.greenLight}; color: ${DS.green}; border: 1px solid #A7F3D0; }
        .vs-card-time { font-size: 11px; color: ${DS.text3}; font-family: ${FONT.mono}; }
        .vs-card-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .vs-delete-bar { padding: 10px 16px; background: ${DS.redLight}; border-top: 1px solid #FCA5A5; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .vs-delete-text { font-size: 13px; color: ${DS.red}; font-weight: 500; }
        .vs-empty { text-align: center; padding: 56px 20px; background: ${DS.card}; border: 1px dashed ${DS.border}; border-radius: ${R.xl}px; }
        .vs-empty-icon { font-size: 36px; margin-bottom: 12px; }
        .vs-empty-title { font-family: ${FONT.head}; font-weight: 700; font-size: 15px; color: ${DS.text1}; margin-bottom: 6px; }
        .vs-empty-sub { font-size: 13px; color: ${DS.text3}; margin-bottom: 20px; }
        @media (max-width: 600px) { .vs-form-grid { grid-template-columns: 1fr; } .vs-card-row { padding: 12px 14px; gap: 10px; } .vs-card-icon { width: 36px; height: 36px; font-size: 16px; } .vs-card-name { font-size: 14px; } .vs-btn-open { display: none; } }
      `}</style>

      <div className="vs-page">
      <TopNav  />

        <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: DS.text3, fontSize: 13 }}>Loading…</div>}>
          <ProjectsInner />
        </Suspense>
      </div>
    </>
  );
}