"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { getProjects } from "../../../../lib/projectStore";

// ---------------------------------------------------------------------------
// Types — match route.ts response exactly
// ---------------------------------------------------------------------------

type MaterialLine = {
  item:      string;
  qty:       number;
  unit:      string;
  unitCost:  number;
  lineTotal: number;
  notes?:    string;
  category:  string;
};

type LaborLine = {
  description: string;
  hours:       number;
  rate:        number;
  total:       number;
};

type GeneratedEstimate = {
  generatedAt:  string;
  summary:      string;
  assumptions:  string[];
  scopeType:    "line_item" | "assembly";
  materials:    MaterialLine[];
  labor:        LaborLine[];
  laborHours:   number;
  // optional assembly fields
  isNewConstruction?: boolean;
  sqft?:            number;
  ratePerSqft?:     number;
};

type Draft = {
  savedAt:        string;
  jobDescription?: string;
  estimate?:      GeneratedEstimate;
  laborRate?:     number;
  markupPct?:     number;
  permitFee?:     number;
  materialCostIndex?: number;
};

type UIState = { isSaved: boolean; lastSavedAt?: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function autoTitle(summary: string) {
  const s = summary.toLowerCase();
  if (s.includes("warehouse"))                     return "Warehouse Electrical";
  if (s.includes("new home") || s.includes("new construction") || s.includes("rough-in")) return "New Construction";
  if (s.includes("commercial") || s.includes("office")) return "Commercial Buildout";
  if (s.includes("ev") || s.includes("charger"))   return "EV Charger Installation";
  if (s.includes("panel") || s.includes("service"))return "Panel / Service Work";
  if (s.includes("receptacle") || s.includes("outlet")) return "Outlet Installation";
  if (s.includes("light") || s.includes("fixture"))return "Lighting Installation";
  if (s.includes("generator"))                     return "Generator Work";
  return "Electrical Scope of Work";
}

function r2(n: number) { return Math.round(n * 100) / 100; }

const CATEGORY_ORDER = ["equipment","wire","conduit","devices","boxes","fittings","consumables"];
const CATEGORY_LABEL: Record<string, string> = {
  equipment:   "Equipment",
  wire:        "Wire & Cable",
  conduit:     "Conduit & Raceway",
  devices:     "Devices",
  boxes:       "Boxes & Covers",
  fittings:    "Fittings & Hardware",
  consumables: "Consumables",
};

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const C = {
  teal: "#00778B", tealDark: "#005F70", tealLight: "#E0F4F7",
  gold: "#C8A96E", goldLight: "#F5ECD8",
  navy: "#003057", navyMid: "#04406B",
  white: "#FFFFFF", offWhite: "#F7FAFC",
  ink: "#0A1F33", muted: "rgba(0,48,87,0.52)",
  divider: "rgba(0,119,139,0.14)",
} as const;

const shadows = {
  card:   "0 4px 24px rgba(0,48,87,0.09), 0 1px 4px rgba(0,48,87,0.06)",
  raised: "0 8px 32px rgba(0,48,87,0.12), 0 2px 8px rgba(0,48,87,0.07)",
  teal:   "0 4px 20px rgba(0,119,139,0.22)",
} as const;

const radius = { sm: 10, md: 14, lg: 18 } as const;

const font = {
  display: "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif",
  body:    "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  mono:    "'DM Mono', 'Fira Code', monospace",
} as const;

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const panelStyle: CSSProperties = {
  background: C.white, border: `1px solid ${C.divider}`,
  borderRadius: radius.lg, boxShadow: shadows.card,
  padding: 18, fontFamily: font.body,
};

const btnPrimary: CSSProperties = {
  padding: "10px 20px", borderRadius: radius.sm,
  border: `1.5px solid ${C.tealDark}`,
  background: `linear-gradient(160deg, ${C.teal} 0%, ${C.tealDark} 100%)`,
  color: C.white, fontFamily: font.display, fontWeight: 700,
  fontSize: 14, letterSpacing: 0.6, cursor: "pointer",
  boxShadow: shadows.teal, whiteSpace: "nowrap",
};

const btnSecondary: CSSProperties = {
  padding: "9px 14px", borderRadius: radius.sm,
  border: `1px solid rgba(0,119,139,0.26)`,
  background: `linear-gradient(180deg, ${C.white} 0%, #F6FBFC 100%)`,
  color: C.navy, fontFamily: font.display, fontWeight: 800,
  fontSize: 13, letterSpacing: 0.55, cursor: "pointer",
  boxShadow: "0 6px 18px rgba(0,48,87,0.08)", whiteSpace: "nowrap",
};

const inputStyle: CSSProperties = {
  width: "100%", padding: "12px 12px", borderRadius: radius.md,
  border: `1px solid rgba(0,119,139,0.22)`, outline: "none",
  fontFamily: font.body, fontSize: 14, lineHeight: 1.4,
  color: C.ink, background: "linear-gradient(180deg, #FFFFFF 0%, #FBFEFF 100%)",
};

const miniInput: CSSProperties = {
  width: 110, padding: "8px 10px", borderRadius: radius.md,
  border: `1px solid rgba(0,119,139,0.22)`, outline: "none",
  fontFamily: font.mono, fontSize: 13, color: C.ink,
  background: "linear-gradient(180deg, #FFFFFF 0%, #FBFEFF 100%)",
};

const colHeader: CSSProperties = {
  fontFamily: font.display, fontWeight: 800, fontSize: 11,
  letterSpacing: 0.8, textTransform: "uppercase", color: C.muted,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewEstimatePage() {
  const params    = useParams<{ id: string }>();
  const projectId = params?.id;
  const project   = getProjects().find((p) => p.id === projectId);
  const draftKey  = `voltscope:draft-estimate:${projectId ?? "unknown"}`;

  const [uiState,            setUiState]           = useState<UIState>({ isSaved: false });
  const [jobDescription,     setJobDescription]    = useState("");
  const [estimate,           setEstimate]          = useState<GeneratedEstimate | null>(null);
  const [laborRate,          setLaborRate]         = useState(95);
  const [markupPct,          setMarkupPct]         = useState(20);
  const [permitFee,          setPermitFee]         = useState(0);
  const [materialCostIndex,  setMaterialCostIndex] = useState(1.0);
  const [showAllMaterials,   setShowAllMaterials]  = useState(false);
  const [genState, setGenState] = useState<{ status: "idle"|"loading"|"ready"|"error"; msg?: string }>({ status: "idle" });
  const [progress, setProgress] = useState(0);

  // ── Restore draft ──
  useEffect(() => {
    if (!projectId) return;
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Partial<Draft>;
      if (typeof saved.jobDescription    === "string") setJobDescription(saved.jobDescription);
      if (typeof saved.laborRate         === "number") setLaborRate(saved.laborRate);
      if (typeof saved.markupPct         === "number") setMarkupPct(saved.markupPct);
      if (typeof saved.permitFee         === "number") setPermitFee(saved.permitFee);
      if (typeof saved.materialCostIndex === "number") setMaterialCostIndex(saved.materialCostIndex);
      if (saved.estimate) { setEstimate(saved.estimate); setGenState({ status: "ready" }); }
      if (saved.savedAt) setUiState({ isSaved: true, lastSavedAt: saved.savedAt });
    } catch { /* ignore */ }
  }, [projectId, draftKey]);

  // ── Progress bar ──
  useEffect(() => {
    if (genState.status !== "loading") { setProgress(0); return; }
    setProgress(10);
    const id = window.setInterval(() =>
      setProgress((p) => Math.min(90, p + Math.max(1, Math.round((90 - p) * 0.12)))), 300);
    return () => window.clearInterval(id);
  }, [genState.status]);

  // ── Recompute totals live when sliders change ──
  // The API already priced materials; labor changes with laborRate, markup changes with markupPct/permitFee
  const totals = useMemo(() => {
    if (!estimate) return null;
    const materialTotal = r2(estimate.materials.reduce((s, m) => s + r2(m.qty * m.unitCost * materialCostIndex), 0));
    const laborTotal    = r2(estimate.laborHours * laborRate);
    const subtotal      = r2(materialTotal + laborTotal + permitFee);
    const markup        = r2(subtotal * (markupPct / 100));
    const finalTotal    = r2(subtotal + markup);
    const ratePerSqft   = estimate.sqft ? r2(finalTotal / estimate.sqft) : undefined;
    return { materialTotal, laborTotal, subtotal, markup, finalTotal, ratePerSqft };
  }, [estimate, laborRate, markupPct, permitFee, materialCostIndex]);

  // Recomputed material lines with current materialCostIndex applied
  const materialLines = useMemo(() => {
    if (!estimate) return [];
    return estimate.materials.map((m) => ({
      ...m,
      unitCost:  r2(m.unitCost * materialCostIndex),
      lineTotal: r2(m.qty * m.unitCost * materialCostIndex),
    }));
  }, [estimate, materialCostIndex]);

  function saveDraft() {
    if (!projectId) return;
    const payload: Draft = {
      savedAt: new Date().toISOString(),
      jobDescription: jobDescription.trim(),
      estimate: estimate ?? undefined,
      laborRate, markupPct, permitFee, materialCostIndex,
    };
    localStorage.setItem(draftKey, JSON.stringify(payload));
    setUiState({ isSaved: true, lastSavedAt: payload.savedAt });
  }

  async function handleGenerate() {
    const text = jobDescription.trim();
    if (!text) { setGenState({ status: "error", msg: "Please enter a job description first." }); return; }
    setGenState({ status: "loading" });

    const controller = new AbortController();
    const timeoutId  = window.setTimeout(() => controller.abort(), 55_000);

    try {
      const r = await fetch("/api/estimate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ description: text, laborRate, markupPct, permitFee, materialCostIndex }),
        signal:  controller.signal,
      });

      const data = await r.json().catch(() => null);

      if (!r.ok || !data) {
        setGenState({ status: "error", msg: data?.error ?? "API error — please try again." });
        return;
      }

      const generated: GeneratedEstimate = {
        generatedAt:      new Date().toISOString(),
        summary:          data.summary      ?? "Electrical scope estimate.",
        assumptions:      Array.isArray(data.assumptions) ? data.assumptions : [],
        scopeType:        data.scopeType    === "assembly" ? "assembly" : "line_item",
        materials:        Array.isArray(data.materials)   ? data.materials   : [],
        labor:            Array.isArray(data.labor)       ? data.labor       : [],
        laborHours:       typeof data.laborHours === "number" ? data.laborHours : 0,
        isNewConstruction: data.isNewConstruction === true,
        sqft:             typeof data.sqft === "number" && data.sqft > 0 ? data.sqft : undefined,
        ratePerSqft:      typeof data.ratePerSqft === "number" ? data.ratePerSqft : undefined,
      };

      setEstimate(generated);
      setProgress(100);
      setShowAllMaterials(false);
      setGenState({ status: "ready" });

      if (projectId) {
        const payload: Draft = {
          savedAt: new Date().toISOString(),
          jobDescription: text,
          estimate: generated,
          laborRate, markupPct, permitFee, materialCostIndex,
        };
        localStorage.setItem(draftKey, JSON.stringify(payload));
        setUiState({ isSaved: true, lastSavedAt: payload.savedAt });
      }
    } catch (e: unknown) {
      const isTimeout = e instanceof Error && e.name === "AbortError";
      setGenState({ status: "error", msg: isTimeout ? "Request timed out — please try again." : "Request failed — please try again." });
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function clearEstimate() {
    setJobDescription(""); setEstimate(null); setProgress(0);
    setGenState({ status: "idle" }); setShowAllMaterials(false);
    if (projectId) { localStorage.removeItem(draftKey); setUiState({ isSaved: false }); }
  }

  const canGenerate = jobDescription.trim().length > 0 && genState.status !== "loading" && genState.status !== "ready";

  const PREVIEW = 6;
  const visibleMaterials = showAllMaterials ? materialLines : materialLines.slice(0, PREVIEW);
  const hiddenCount      = Math.max(0, materialLines.length - PREVIEW);

  // Group materials by category for display
  const groupedMaterials = useMemo(() => {
    const groups: Record<string, MaterialLine[]> = {};
    for (const m of materialLines) {
      const cat = m.category ?? "consumables";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    }
    return groups;
  }, [materialLines]);

  const isAssembly = estimate?.scopeType === "assembly";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.offWhite}; }
        .page {
          min-height: 100vh;
          background: linear-gradient(160deg, #EAF4F7 0%, #F7FAFC 40%, #F0EBE1 100%);
          padding: 20px; font-family: ${font.body}; color: ${C.ink};
        }
        .content  { max-width: 960px; margin: 0 auto; }
        .grid     { display: grid; gap: 14px; margin-top: 14px; }
        .header-bar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 14px; padding: 14px 20px; border-radius: ${radius.lg}px;
          background: linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 100%);
          box-shadow: ${shadows.raised}; flex-wrap: wrap;
        }
        .header-left { display: flex; align-items: center; gap: 12px; }
        .header-accent { width: 4px; height: 38px; border-radius: 4px; background: linear-gradient(180deg, ${C.gold} 0%, ${C.teal} 100%); flex-shrink: 0; }
        .back-link {
          display: inline-flex; align-items: center; gap: 6px; text-decoration: none;
          color: rgba(255,255,255,0.75); font-weight: 600; font-size: 13px;
          padding: 7px 12px; border-radius: ${radius.sm}px;
          border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.08);
          transition: background 0.15s;
        }
        .back-link:hover { background: rgba(255,255,255,0.16); color: ${C.white}; }
        .panel-title { font-family: ${font.display}; font-weight: 800; font-size: 16px; color: ${C.navy}; margin: 0; }
        .badge {
          display: inline-block; padding: 2px 9px; border-radius: 20px;
          font-family: ${font.display}; font-weight: 700; font-size: 11px;
          letter-spacing: 0.8px; text-transform: uppercase;
          background: ${C.tealLight}; color: ${C.tealDark}; border: 1px solid rgba(0,119,139,0.20);
          white-space: nowrap;
        }
        .row-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 12px; flex-wrap: wrap; }
        .cat-header { font-family: ${font.display}; font-weight: 800; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: ${C.muted}; padding: 6px 16px; background: rgba(0,48,87,0.04); border-bottom: 1px solid ${C.divider}; border-top: 1px solid ${C.divider}; }
        .cat-header:first-child { border-top: none; }
      `}</style>

      <div className="page">
        <div className="content">

          {/* ── Header ── */}
          <div className="header-bar">
            <div className="header-left">
              <div className="header-accent" />
              <Link href={`/projects/${projectId}`} className="back-link">← Back</Link>
              <div>
                <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 22, color: C.white }}>New Estimate</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
                  {project?.customerName ?? "Unnamed Project"} · {project?.jobType ?? "Unknown"}
                </div>
                {uiState.isSaved && uiState.lastSavedAt && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2, fontFamily: font.mono }}>
                    Saved {new Date(uiState.lastSavedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
            <button type="button" onClick={saveDraft} style={btnPrimary}>💾 Save Draft</button>
          </div>

          <div className="grid">

            {/* ── Job Description ── */}
            <div style={panelStyle}>
              <div className="row-header">
                <h2 className="panel-title">Job Description</h2>
                <span className="badge">Input</span>
              </div>

              <textarea
                value={jobDescription}
                onChange={(e) => { setJobDescription(e.target.value); if (genState.status === "error") setGenState({ status: "idle" }); }}
                placeholder="Describe the scope... e.g. 4000 sq ft warehouse, 200A service, LED high bay lighting throughout. Or: Install 60A EV charger in garage, 35ft EMT run, new breaker."
                rows={5}
                style={inputStyle}
              />

              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
                <button
                  type="button" onClick={handleGenerate}
                  disabled={!canGenerate}
                  style={{ ...btnSecondary, opacity: canGenerate ? 1 : 0.5, cursor: canGenerate ? "pointer" : "not-allowed" }}
                >
                  ⚡ Generate Estimate
                </button>

                <button
                  type="button" onClick={clearEstimate}
                  disabled={genState.status !== "ready"}
                  style={{ ...btnSecondary, opacity: genState.status === "ready" ? 1 : 0.5, cursor: genState.status === "ready" ? "pointer" : "not-allowed" }}
                >
                  🧹 Start New
                </button>

                {genState.status === "loading" && (
                  <>
                    <span style={{ fontFamily: font.mono, fontSize: 12, color: C.teal, background: C.tealLight, padding: "5px 10px", borderRadius: 999, border: `1px solid rgba(0,119,139,0.18)` }}>
                      Generating estimate…
                    </span>
                    <div style={{ width: "100%", maxWidth: 360, height: 7, borderRadius: 999, overflow: "hidden", background: "rgba(0,48,87,0.07)" }}>
                      <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg, ${C.teal}, ${C.tealDark})`, transition: "width 220ms ease" }} />
                    </div>
                  </>
                )}

                {genState.status === "error" && (
                  <span style={{ fontFamily: font.mono, fontSize: 12, color: "#a01818", background: "rgba(255,235,235,0.9)", padding: "5px 10px", borderRadius: 999, border: "1px solid rgba(160,24,24,0.18)" }}>
                    {genState.msg}
                  </span>
                )}

                {genState.status === "ready" && estimate?.generatedAt && (
                  <span style={{ fontFamily: font.mono, fontSize: 11, color: C.muted, background: "rgba(0,48,87,0.05)", padding: "5px 10px", borderRadius: 999 }}>
                    Generated {new Date(estimate.generatedAt).toLocaleString()}
                  </span>
                )}
              </div>

              <div style={{ marginTop: 8, fontSize: 12, color: C.muted }}>
                Tip: include square footage, voltage/amps, number of devices, run distances, and access details for the best result.
              </div>
            </div>

            {/* ── Scope Summary ── */}
            {estimate && (
              <div style={{ ...panelStyle, padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", background: `linear-gradient(135deg, ${C.tealLight} 0%, #F8FCFD 100%)`, borderBottom: `1px solid ${C.divider}` }}>
                  <div className="row-header" style={{ marginBottom: 0 }}>
                    <h2 className="panel-title">Scope Summary</h2>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span className="badge">{isAssembly ? "Assembly" : "Line Item"}</span>
                      {estimate.sqft && <span className="badge" style={{ background: C.goldLight, color: "#8B6B3D", borderColor: "rgba(200,169,110,0.3)" }}>{estimate.sqft.toLocaleString()} sq ft</span>}
                    </div>
                  </div>
                </div>
                <div style={{ padding: 18 }}>
                  <div style={{ fontFamily: font.display, fontSize: 20, fontWeight: 800, color: C.navy, marginBottom: 6 }}>
                    {autoTitle(estimate.summary)}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.55, color: C.ink }}>{estimate.summary}</div>
                  {estimate.assumptions.length > 0 && (
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                      {estimate.assumptions.map((a, i) => (
                        <div key={i} style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, display: "flex", gap: 6 }}>
                          <span style={{ color: C.teal, flexShrink: 0 }}>·</span>{a}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Pricing Settings ── */}
            {estimate && (
              <div style={panelStyle}>
                <div className="row-header">
                  <h2 className="panel-title">Pricing Settings</h2>
                  <span className="badge">Adjustable</span>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                  {[
                    { label: "Labor Rate",    value: laborRate,         set: setLaborRate,         suffix: "/hr",  note: "$/hr" },
                    { label: "Markup",        value: markupPct,         set: setMarkupPct,         suffix: "%",    note: "%" },
                    { label: "Permit Fee",    value: permitFee,         set: setPermitFee,         suffix: "$",    note: "$" },
                    { label: "Material Index",value: materialCostIndex, set: setMaterialCostIndex, suffix: "×",    note: "1.0 = normal" },
                  ].map(({ label, value, set, suffix, note }) => (
                    <div key={label} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <div>
                        <div style={{ fontFamily: font.display, fontWeight: 800, color: C.navy, fontSize: 13 }}>{label}</div>
                        <div style={{ fontFamily: font.mono, fontSize: 10, color: C.muted }}>{note}</div>
                      </div>
                      <input
                        style={miniInput} inputMode="decimal" value={value}
                        onChange={(e) => { const v = Number(e.target.value); set(Number.isFinite(v) ? v : 0); }}
                        onBlur={saveDraft}
                      />
                      <span style={{ fontFamily: font.mono, color: C.muted, fontSize: 12 }}>{suffix}</span>
                    </div>
                  ))}
                  <button type="button" onClick={saveDraft} style={{ ...btnSecondary, marginLeft: "auto" }}>💾 Save</button>
                </div>
                {materialCostIndex !== 1.0 && (
                  <div style={{ marginTop: 10, fontSize: 12, color: "#7A5A00", background: C.goldLight, padding: "6px 10px", borderRadius: radius.sm, fontFamily: font.mono }}>
                    Material cost index {materialCostIndex}× applied to all material line items.
                  </div>
                )}
              </div>
            )}

            {/* ── Material List ── */}
            {estimate && materialLines.length > 0 && (
              <div style={{ ...panelStyle, padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", background: `linear-gradient(135deg, ${C.tealLight} 0%, #F8FCFD 100%)`, borderBottom: `1px solid ${C.divider}` }}>
                  <div className="row-header" style={{ marginBottom: 0 }}>
                    <div>
                      <h2 className="panel-title">Materials</h2>
                      <div style={{ marginTop: 3, fontSize: 12, color: C.muted, fontFamily: font.mono }}>
                        {materialLines.length} items · ${totals?.materialTotal.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span className="badge">AI Priced</span>
                      {materialLines.length > PREVIEW && (
                        <button type="button" onClick={() => setShowAllMaterials(s => !s)} style={{ ...btnSecondary, padding: "5px 10px", fontSize: 12 }}>
                          {showAllMaterials ? "Show Less" : `All (${materialLines.length})`}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Column headers */}
                <div style={{ display: "grid", gridTemplateColumns: "2.2fr 0.5fr 0.9fr 0.7fr", padding: "8px 16px", background: "rgba(0,48,87,0.03)", borderBottom: `1px solid ${C.divider}`, gap: 10 }}>
                  {(["Item", "Qty", "Unit / Cost", "Total"] as const).map((h, i) => (
                    <div key={h} style={{ ...colHeader, textAlign: i > 0 ? "right" : "left" }}>{h}</div>
                  ))}
                </div>

                {/* Rows — grouped by category when showing all, flat otherwise */}
                {isAssembly || showAllMaterials ? (
                  // Grouped view
                  CATEGORY_ORDER.filter(cat => groupedMaterials[cat]?.length > 0).map(cat => (
                    <div key={cat}>
                      <div className="cat-header">{CATEGORY_LABEL[cat] ?? cat}</div>
                      {groupedMaterials[cat].map((m, i) => (
                        <MaterialRow key={`${cat}-${i}`} m={m} font={font} C={C} divider={C.divider} />
                      ))}
                    </div>
                  ))
                ) : (
                  // Flat preview
                  visibleMaterials.map((m, i) => (
                    <MaterialRow key={i} m={m} font={font} C={C} divider={C.divider} />
                  ))
                )}

                {!showAllMaterials && !isAssembly && hiddenCount > 0 && (
                  <div style={{ padding: "10px 16px", background: "rgba(0,119,139,0.04)", fontSize: 12, color: C.muted, borderTop: `1px solid ${C.divider}` }}>
                    Showing {visibleMaterials.length} of {materialLines.length} items · {hiddenCount} more hidden
                  </div>
                )}
              </div>
            )}

            {/* ── Labor ── */}
            {estimate && estimate.labor.length > 0 && (
              <div style={{ ...panelStyle, padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", background: `linear-gradient(135deg, #F0EBE1 0%, #F8FCFD 100%)`, borderBottom: `1px solid ${C.divider}` }}>
                  <div className="row-header" style={{ marginBottom: 0 }}>
                    <div>
                      <h2 className="panel-title">Labor</h2>
                      <div style={{ marginTop: 3, fontSize: 12, color: C.muted, fontFamily: font.mono }}>
                        {estimate.laborHours} hrs total · ${totals?.laborTotal.toFixed(2)} @ ${laborRate}/hr
                      </div>
                    </div>
                    <span className="badge" style={{ background: C.goldLight, color: "#8B6B3D", borderColor: "rgba(200,169,110,0.3)" }}>Labor</span>
                  </div>
                </div>

                {/* Column headers */}
                <div style={{ display: "grid", gridTemplateColumns: "2.5fr 0.5fr 0.7fr 0.7fr", padding: "8px 16px", background: "rgba(0,48,87,0.03)", borderBottom: `1px solid ${C.divider}`, gap: 10 }}>
                  {(["Task", "Hours", "Rate", "Total"] as const).map((h, i) => (
                    <div key={h} style={{ ...colHeader, textAlign: i > 0 ? "right" : "left" }}>{h}</div>
                  ))}
                </div>

                {estimate.labor.map((l, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "2.5fr 0.5fr 0.7fr 0.7fr", padding: "12px 16px", borderBottom: i < estimate.labor.length - 1 ? `1px solid ${C.divider}` : "none", alignItems: "center", gap: 10, background: "linear-gradient(180deg, #FFFFFF 0%, #FBFEFF 100%)" }}>
                    <div style={{ fontWeight: 600, color: C.navy, fontSize: 14 }}>{l.description}</div>
                    <div style={{ textAlign: "right", fontFamily: font.mono, color: C.ink, fontSize: 13 }}>{l.hours}</div>
                    <div style={{ textAlign: "right", fontFamily: font.mono, color: C.muted, fontSize: 13 }}>${laborRate}/hr</div>
                    <div style={{ textAlign: "right", fontFamily: font.mono, color: C.ink, fontSize: 13, fontWeight: 600 }}>${r2(l.hours * laborRate).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Totals ── */}
            {totals && estimate && (
              <div style={panelStyle}>
                <div className="row-header">
                  <h2 className="panel-title">Totals</h2>
                  <span className="badge">Summary</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Material Total",  value: totals.materialTotal, sub: `${materialLines.length} line items` },
                    { label: "Labor Total",      value: totals.laborTotal,    sub: `${estimate.laborHours} hrs @ $${laborRate}/hr` },
                    { label: "Subtotal",         value: totals.subtotal,      sub: permitFee > 0 ? `Includes permit $${permitFee.toFixed(2)}` : "Before markup" },
                    { label: "Profit (Markup)",  value: totals.markup,        sub: `${markupPct}% markup` },
                  ].map(({ label, value, sub }) => (
                    <div key={label} style={{ padding: 14, borderRadius: radius.md, border: `1px solid ${C.divider}`, background: "linear-gradient(180deg, #FFFFFF 0%, #FBFEFF 100%)" }}>
                      <div style={{ fontFamily: font.display, fontWeight: 800, color: C.navy, fontSize: 13 }}>{label}</div>
                      <div style={{ fontFamily: font.mono, fontSize: 20, marginTop: 6, color: C.ink }}>${value.toFixed(2)}</div>
                      <div style={{ marginTop: 4, fontSize: 11, color: C.muted, fontFamily: font.mono }}>{sub}</div>
                    </div>
                  ))}

                  {/* Final total */}
                  <div style={{ gridColumn: "1 / -1", padding: 16, borderRadius: radius.md, border: `1px solid rgba(0,119,139,0.22)`, background: `linear-gradient(135deg, ${C.tealLight} 0%, #F6FBFC 60%, ${C.goldLight} 100%)` }}>
                    <div style={{ fontFamily: font.display, fontWeight: 900, color: C.navy, fontSize: 14, letterSpacing: 0.4 }}>
                      Final Price to Customer
                    </div>
                    <div style={{ fontFamily: font.mono, fontSize: 34, marginTop: 8, color: C.ink, fontWeight: 600 }}>
                      ${totals.finalTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: C.muted, fontFamily: font.mono, display: "flex", gap: 14, flexWrap: "wrap" }}>
                      <span>Markup {markupPct}%</span>
                      {estimate.sqft && totals.ratePerSqft && <span>{estimate.sqft.toLocaleString()} sq ft · ${totals.ratePerSqft.toFixed(2)}/sq ft</span>}
                      {materialCostIndex !== 1.0 && <span>Material index {materialCostIndex}×</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// MaterialRow sub-component
// ---------------------------------------------------------------------------

function MaterialRow({ m, font, C, divider }: {
  m: MaterialLine;
  font: { mono: string; display: string; body: string };
  C: Record<string, string>;
  divider: string;
}) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "2.2fr 0.5fr 0.9fr 0.7fr",
      padding: "12px 16px", borderBottom: `1px solid ${divider}`,
      alignItems: "start", gap: 10,
      background: "linear-gradient(180deg, #FFFFFF 0%, #FBFEFF 100%)",
    }}>
      <div>
        <div style={{ fontWeight: 600, color: C.navy, fontSize: 14, lineHeight: 1.3 }}>{m.item}</div>
        {m.notes && (
          <div style={{ marginTop: 3, fontSize: 11, color: C.muted, fontFamily: font.mono, lineHeight: 1.4 }}>{m.notes}</div>
        )}
      </div>
      <div style={{ textAlign: "right", fontFamily: font.mono, color: C.ink, fontSize: 13, paddingTop: 2 }}>{m.qty}</div>
      <div style={{ textAlign: "right", fontFamily: font.mono, color: C.muted, fontSize: 13, paddingTop: 2 }}>
        {m.unit} @ ${m.unitCost.toFixed(2)}
      </div>
      <div style={{ textAlign: "right", fontFamily: font.mono, color: C.ink, fontSize: 13, fontWeight: 600, paddingTop: 2 }}>
        ${m.lineTotal.toFixed(2)}
      </div>
    </div>
  );
}