"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { getProjects } from "../../../../lib/projectStore";
import { generateEstimatePdf } from "../../../../lib/generateEstimatePdf";

// =============================================================================
// VOLTSCOPE DESIGN SYSTEM — copy these tokens to any new page
// =============================================================================
//
//  Fonts:    "Plus Jakarta Sans" (headings), "Inter" (body), "JetBrains Mono" (numbers)
//  Shell bg: #0B0F1A  (dark navy — topbar, sidebar)
//  Page bg:  #F4F6F9  (cool off-white workspace)
//  Card:     #FFFFFF
//  Primary:  #2563EB  (electric blue)
//  Amber:    #D97706  (money / financial values)
//  Success:  #059669
//  Danger:   #DC2626
//  Border:   #E4E7ED
//  Text-1:   #0F172A  (headings)
//  Text-2:   #475569  (body)
//  Text-3:   #94A3B8  (muted / labels)
//
// =============================================================================

const DS = {
  // Surfaces
  shell:       "#0B0F1A",
  shellBorder: "rgba(255,255,255,0.07)",
  pageBg:      "#F4F6F9",
  card:        "#FFFFFF",
  cardHover:   "#FAFBFC",
  // Text
  text1:   "#0F172A",
  text2:   "#475569",
  text3:   "#94A3B8",
  // Accents
  blue:        "#2563EB",
  blueDark:    "#1D4ED8",
  blueLight:   "#EFF6FF",
  blueMid:     "#DBEAFE",
  amber:       "#D97706",
  amberLight:  "#FFFBEB",
  amberMid:    "#FDE68A",
  green:       "#059669",
  greenLight:  "#ECFDF5",
  red:         "#DC2626",
  redLight:    "#FEF2F2",
  // Borders & dividers
  border:   "#E4E7ED",
  divider:  "#F1F3F7",
  // Shadows
  cardShadow:  "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
  raisedShadow:"0 4px 16px rgba(15,23,42,0.10), 0 2px 6px rgba(15,23,42,0.06)",
  blueShadow:  "0 4px 14px rgba(37,99,235,0.30)",
} as const;

const FONT = {
  head: "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif",
  body: "'Inter', 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
} as const;

const R = { xs: 6, sm: 8, md: 10, lg: 12, xl: 16 } as const;

// =============================================================================
// Types
// =============================================================================

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
  generatedAt:       string;
  summary:           string;
  assumptions:       string[];
  scopeType:         "line_item" | "assembly";
  materials:         MaterialLine[];
  labor:             LaborLine[];
  laborHours:        number;
  isNewConstruction?: boolean;
  sqft?:             number;
  ratePerSqft?:      number;
};

type Draft = {
  savedAt:             string;
  jobDescription?:     string;
  estimate?:           GeneratedEstimate;
  laborRate?:          number;
  markupPct?:          number;
  permitFee?:          number;
  materialCostIndex?:  number;
};

type UIState = { isSaved: boolean; lastSavedAt?: string };

// =============================================================================
// Helpers
// =============================================================================

function autoTitle(summary: string) {
  const s = summary.toLowerCase();
  if (s.includes("warehouse"))                                           return "Warehouse Electrical";
  if (s.includes("new home") || s.includes("new construction"))         return "New Construction";
  if (s.includes("commercial") || s.includes("office"))                 return "Commercial Buildout";
  if (s.includes("ev") || s.includes("charger"))                        return "EV Charger Install";
  if (s.includes("panel") || s.includes("service"))                     return "Panel / Service Work";
  if (s.includes("receptacle") || s.includes("outlet"))                 return "Outlet Installation";
  if (s.includes("light") || s.includes("fixture"))                     return "Lighting";
  return "Electrical Estimate";
}

function r2(n: number) { return Math.round(n * 100) / 100; }
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

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

// =============================================================================
// Reusable style objects
// =============================================================================

const card: CSSProperties = {
  background:   DS.card,
  border:       `1px solid ${DS.border}`,
  borderRadius: R.xl,
  boxShadow:    DS.cardShadow,
  overflow:     "hidden",
};

const btnPrimary: CSSProperties = {
  display:      "inline-flex",
  alignItems:   "center",
  gap:          6,
  padding:      "9px 18px",
  borderRadius: R.md,
  border:       "none",
  background:   `linear-gradient(135deg, ${DS.blue} 0%, ${DS.blueDark} 100%)`,
  color:        "#fff",
  fontFamily:   FONT.head,
  fontWeight:   600,
  fontSize:     13,
  letterSpacing: 0.2,
  cursor:       "pointer",
  boxShadow:    DS.blueShadow,
  whiteSpace:   "nowrap",
  transition:   "opacity 0.15s",
};

const btnSecondary: CSSProperties = {
  display:      "inline-flex",
  alignItems:   "center",
  gap:          6,
  padding:      "9px 16px",
  borderRadius: R.md,
  border:       `1px solid ${DS.border}`,
  background:   DS.card,
  color:        DS.text1,
  fontFamily:   FONT.head,
  fontWeight:   600,
  fontSize:     13,
  cursor:       "pointer",
  boxShadow:    DS.cardShadow,
  whiteSpace:   "nowrap",
  transition:   "background 0.15s",
};

const btnGhost: CSSProperties = {
  display:      "inline-flex",
  alignItems:   "center",
  gap:          5,
  padding:      "6px 12px",
  borderRadius: R.sm,
  border:       `1px solid ${DS.border}`,
  background:   "transparent",
  color:        DS.text2,
  fontFamily:   FONT.body,
  fontWeight:   500,
  fontSize:     12,
  cursor:       "pointer",
  whiteSpace:   "nowrap",
};

const inputStyle: CSSProperties = {
  width:        "100%",
  padding:      "11px 14px",
  borderRadius: R.md,
  border:       `1px solid ${DS.border}`,
  outline:      "none",
  fontFamily:   FONT.body,
  fontSize:     14,
  lineHeight:   1.55,
  color:        DS.text1,
  background:   DS.card,
  resize:       "vertical",
};

const miniInput: CSSProperties = {
  width:        90,
  padding:      "7px 10px",
  borderRadius: R.sm,
  border:       `1px solid ${DS.border}`,
  outline:      "none",
  fontFamily:   FONT.mono,
  fontSize:     13,
  color:        DS.text1,
  background:   DS.card,
  textAlign:    "right",
};

const sectionLabel: CSSProperties = {
  fontFamily:    FONT.head,
  fontWeight:    700,
  fontSize:      11,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  color:         DS.text3,
};

const tableHeaderCell: CSSProperties = {
  ...sectionLabel,
  padding:       "10px 14px",
  background:    DS.divider,
  textAlign:     "left",
  borderBottom:  `1px solid ${DS.border}`,
};

// =============================================================================
// Component
// =============================================================================

export default function NewEstimatePage() {
  const params    = useParams<{ id: string }>();
  const projectId = params?.id;
  const project   = getProjects().find((p) => p.id === projectId);
  const draftKey  = `voltscope:draft-estimate:${projectId ?? "unknown"}`;

  const [uiState,           setUiState]           = useState<UIState>({ isSaved: false });
  const [jobDescription,    setJobDescription]    = useState("");
  const [estimate,          setEstimate]          = useState<GeneratedEstimate | null>(null);
  const [laborRate,         setLaborRate]         = useState(150);
  const [markupPct,         setMarkupPct]         = useState(20);
  const [permitFee,         setPermitFee]         = useState(0);
  const [materialCostIndex, setMaterialCostIndex] = useState(1.0);
  const [showAllMaterials,  setShowAllMaterials]  = useState(false);
  const [genState, setGenState] = useState<{ status: "idle"|"loading"|"ready"|"error"; msg?: string }>({ status: "idle" });
  const [progress, setProgress] = useState(0);

  // ── Restore draft
  useEffect(() => {
    if (!projectId) return;
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Partial<Draft>;
      if (typeof saved.jobDescription    === "string") setJobDescription(saved.jobDescription);
      if (typeof saved.laborRate         === "number") setLaborRate(Math.max(150, saved.laborRate));
      if (typeof saved.markupPct         === "number") setMarkupPct(saved.markupPct);
      if (typeof saved.permitFee         === "number") setPermitFee(saved.permitFee);
      if (typeof saved.materialCostIndex === "number") setMaterialCostIndex(saved.materialCostIndex);
      if (saved.estimate) { setEstimate(saved.estimate); setGenState({ status: "ready" }); }
      if (saved.savedAt) setUiState({ isSaved: true, lastSavedAt: saved.savedAt });
    } catch { /* ignore */ }
  }, [projectId, draftKey]);

  // ── Progress bar
  useEffect(() => {
    if (genState.status !== "loading") { setProgress(0); return; }
    setProgress(10);
    const id = window.setInterval(() =>
      setProgress((p) => Math.min(90, p + Math.max(1, Math.round((90 - p) * 0.12)))), 280);
    return () => window.clearInterval(id);
  }, [genState.status]);

  // ── Live totals
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
      if (!r.ok || !data) { setGenState({ status: "error", msg: data?.error ?? "API error — please try again." }); return; }
      const generated: GeneratedEstimate = {
        generatedAt:       new Date().toISOString(),
        summary:           data.summary      ?? "Electrical scope estimate.",
        assumptions:       Array.isArray(data.assumptions) ? data.assumptions : [],
        scopeType:         data.scopeType    === "assembly" ? "assembly" : "line_item",
        materials:         Array.isArray(data.materials)   ? data.materials   : [],
        labor:             Array.isArray(data.labor)       ? data.labor       : [],
        laborHours:        typeof data.laborHours === "number" ? data.laborHours : 0,
        isNewConstruction: data.isNewConstruction === true,
        sqft:              typeof data.sqft === "number" && data.sqft > 0 ? data.sqft : undefined,
        ratePerSqft:       typeof data.ratePerSqft === "number" ? data.ratePerSqft : undefined,
      };
      setEstimate(generated);
      setProgress(100);
      setShowAllMaterials(false);
      setGenState({ status: "ready" });
      if (projectId) {
        const payload: Draft = { savedAt: new Date().toISOString(), jobDescription: text, estimate: generated, laborRate, markupPct, permitFee, materialCostIndex };
        localStorage.setItem(draftKey, JSON.stringify(payload));
        setUiState({ isSaved: true, lastSavedAt: payload.savedAt });
      }
    } catch (e: unknown) {
      const isTimeout = e instanceof Error && e.name === "AbortError";
      setGenState({ status: "error", msg: isTimeout ? "Request timed out." : "Request failed — please try again." });
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function clearEstimate() {
    setJobDescription(""); setEstimate(null); setProgress(0);
    setGenState({ status: "idle" }); setShowAllMaterials(false);
    if (projectId) { localStorage.removeItem(draftKey); setUiState({ isSaved: false }); }
  }

  function handleDownloadPdf(mode: "business" | "proposal") {
    if (!estimate || !totals) return;
    generateEstimatePdf({
      companyName:    "Voltscope Electric",
      companyPhone:   "(555) 000-0000",
      companyEmail:   "estimates@voltscope.com",
      customerName:   project?.customerName ?? "Customer",
      jobType:        project?.jobType,
      jobDescription: jobDescription,
      estimateDate:   new Date().toLocaleDateString("en-US"),
      mode,
      summary:        estimate.summary,
      assumptions:    estimate.assumptions,
      scopeType:      estimate.scopeType,
      sqft:           estimate.sqft,
      materials:      materialLines,
      labor:          estimate.labor.map((l) => ({ ...l, rate: laborRate, total: l.hours * laborRate })),
      laborHours:     estimate.laborHours,
      laborRate,
      materialTotal:  totals.materialTotal,
      laborTotal:     totals.laborTotal,
      subtotal:       totals.subtotal,
      markup:         totals.markup,
      markupPct,
      permitFee,
      finalTotal:     totals.finalTotal,
      ratePerSqft:    totals.ratePerSqft,
    });
  }

  const canGenerate = jobDescription.trim().length > 0 && genState.status !== "loading" && genState.status !== "ready";
  const PREVIEW     = 6;
  const visibleMats = showAllMaterials ? materialLines : materialLines.slice(0, PREVIEW);
  const hiddenCount = Math.max(0, materialLines.length - PREVIEW);
  const isAssembly  = estimate?.scopeType === "assembly";

  const groupedMaterials = useMemo(() => {
    const groups: Record<string, MaterialLine[]> = {};
    for (const m of materialLines) {
      const cat = m.category ?? "consumables";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    }
    return groups;
  }, [materialLines]);

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${DS.pageBg}; }

        .vs-page {
          min-height: 100vh;
          background: ${DS.pageBg};
          font-family: ${FONT.body};
          color: ${DS.text1};
        }

        /* ── Top navigation bar ── */
        .vs-topbar {
          position: sticky;
          top: 0;
          z-index: 100;
          height: 56px;
          background: ${DS.shell};
          border-bottom: 1px solid ${DS.shellBorder};
          display: flex;
          align-items: center;
          padding: 0 24px;
          gap: 16px;
        }

        .vs-topbar-logo {
          font-family: ${FONT.head};
          font-weight: 800;
          font-size: 15px;
          color: #fff;
          letter-spacing: -0.3px;
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }

        .vs-topbar-logo-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${DS.blue};
          box-shadow: 0 0 8px ${DS.blue};
        }

        .vs-topbar-divider {
          width: 1px;
          height: 20px;
          background: ${DS.shellBorder};
        }

        .vs-topbar-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: ${FONT.body};
          font-size: 13px;
          font-weight: 500;
          color: rgba(255,255,255,0.55);
          text-decoration: none;
          padding: 5px 10px;
          border-radius: ${R.sm}px;
          border: 1px solid ${DS.shellBorder};
          transition: background 0.15s, color 0.15s;
        }
        .vs-topbar-back:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); }

        .vs-topbar-project {
          font-family: ${FONT.head};
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.85);
        }

        .vs-topbar-sub {
          font-size: 12px;
          color: rgba(255,255,255,0.35);
          font-family: ${FONT.body};
        }

        .vs-topbar-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .vs-topbar-save-status {
          font-size: 11px;
          color: rgba(255,255,255,0.30);
          font-family: ${FONT.mono};
        }

        /* ── Content area ── */
        .vs-content {
          max-width: 900px;
          margin: 0 auto;
          padding: 28px 20px 60px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* ── Page heading ── */
        .vs-page-title {
          font-family: ${FONT.head};
          font-weight: 800;
          font-size: 22px;
          color: ${DS.text1};
          letter-spacing: -0.4px;
        }
        .vs-page-sub {
          font-size: 13px;
          color: ${DS.text3};
          margin-top: 3px;
        }

        /* ── Card ── */
        .vs-card {
          background: ${DS.card};
          border: 1px solid ${DS.border};
          border-radius: ${R.xl}px;
          box-shadow: ${DS.cardShadow};
          overflow: hidden;
        }

        .vs-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid ${DS.divider};
          gap: 12px;
          flex-wrap: wrap;
        }

        .vs-card-title {
          font-family: ${FONT.head};
          font-weight: 700;
          font-size: 14px;
          color: ${DS.text1};
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .vs-card-body { padding: 20px; }

        /* ── Badge ── */
        .vs-badge {
          display: inline-flex;
          align-items: center;
          padding: 3px 9px;
          border-radius: 20px;
          font-family: ${FONT.head};
          font-weight: 600;
          font-size: 11px;
          letter-spacing: 0.3px;
          white-space: nowrap;
        }
        .vs-badge-blue  { background: ${DS.blueMid};  color: ${DS.blue};  border: 1px solid ${DS.blueLight}; }
        .vs-badge-amber { background: ${DS.amberLight}; color: ${DS.amber}; border: 1px solid ${DS.amberMid}; }
        .vs-badge-green { background: ${DS.greenLight}; color: ${DS.green}; border: 1px solid #A7F3D0; }
        .vs-badge-gray  { background: ${DS.divider}; color: ${DS.text3}; border: 1px solid ${DS.border}; }

        /* ── Table ── */
        .vs-table { width: 100%; border-collapse: collapse; }
        .vs-table th {
          padding: 10px 16px;
          background: ${DS.divider};
          font-family: ${FONT.head};
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          color: ${DS.text3};
          text-align: left;
          border-bottom: 1px solid ${DS.border};
          white-space: nowrap;
        }
        .vs-table th.right { text-align: right; }
        .vs-table td {
          padding: 12px 16px;
          border-bottom: 1px solid ${DS.divider};
          font-size: 13.5px;
          color: ${DS.text1};
          vertical-align: top;
        }
        .vs-table td.right { text-align: right; }
        .vs-table td.mono  { font-family: ${FONT.mono}; font-size: 13px; }
        .vs-table td.muted { color: ${DS.text3}; font-size: 12px; }
        .vs-table tr:last-child td { border-bottom: none; }
        .vs-table tr:nth-child(even) td { background: ${DS.divider}; }
        .vs-table .item-name { font-weight: 600; color: ${DS.text1}; line-height: 1.3; }
        .vs-table .item-note { font-size: 11.5px; color: ${DS.text3}; margin-top: 2px; font-family: ${FONT.mono}; }

        /* ── Category group header ── */
        .vs-cat-header {
          padding: 8px 16px;
          background: ${DS.divider};
          font-family: ${FONT.head};
          font-weight: 700;
          font-size: 10.5px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: ${DS.text3};
          border-top: 1px solid ${DS.border};
          border-bottom: 1px solid ${DS.border};
        }

        /* ── Stat tile ── */
        .vs-stat-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .vs-stat {
          padding: 16px;
          border-radius: ${R.lg}px;
          border: 1px solid ${DS.border};
          background: ${DS.card};
        }
        .vs-stat-label {
          font-family: ${FONT.head};
          font-weight: 600;
          font-size: 11px;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: ${DS.text3};
        }
        .vs-stat-value {
          font-family: ${FONT.mono};
          font-weight: 500;
          font-size: 22px;
          color: ${DS.text1};
          margin-top: 6px;
          letter-spacing: -0.5px;
        }
        .vs-stat-sub {
          font-size: 11px;
          color: ${DS.text3};
          margin-top: 4px;
          font-family: ${FONT.body};
        }
        .vs-stat-amber .vs-stat-value { color: ${DS.amber}; }
        .vs-stat-blue  .vs-stat-value { color: ${DS.blue}; }

        /* ── Final total card ── */
        .vs-total-card {
          grid-column: 1 / -1;
          padding: 20px 24px;
          border-radius: ${R.lg}px;
          background: linear-gradient(135deg, ${DS.shell} 0%, #1a2744 100%);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .vs-total-label {
          font-family: ${FONT.head};
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.45);
        }
        .vs-total-value {
          font-family: ${FONT.mono};
          font-size: 36px;
          font-weight: 500;
          color: #fff;
          letter-spacing: -1px;
          margin-top: 6px;
        }
        .vs-total-meta {
          font-size: 12px;
          color: rgba(255,255,255,0.30);
          font-family: ${FONT.body};
          margin-top: 6px;
        }

        /* ── Progress bar ── */
        .vs-progress-track {
          width: 100%;
          height: 3px;
          background: ${DS.divider};
          border-radius: 99px;
          overflow: hidden;
          margin-top: 10px;
        }
        .vs-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, ${DS.blue}, #60a5fa);
          border-radius: 99px;
          transition: width 200ms ease;
        }

        /* ── Input focus ring ── */
        textarea:focus, input:focus {
          border-color: ${DS.blue} !important;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12) !important;
        }

        /* ── Pricing settings row ── */
        .vs-settings-row {
          display: flex;
          gap: 20px;
          align-items: flex-end;
          flex-wrap: wrap;
        }
        .vs-setting-field { display: flex; flex-direction: column; gap: 5px; }
        .vs-setting-label {
          font-family: ${FONT.head};
          font-weight: 600;
          font-size: 11px;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: ${DS.text3};
        }
        .vs-setting-input-row { display: flex; align-items: center; gap: 6px; }
        .vs-setting-suffix { font-size: 12px; color: ${DS.text3}; font-family: ${FONT.mono}; }

        /* ── Assumption pills ── */
        .vs-assumption {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 12.5px;
          color: ${DS.text2};
          line-height: 1.5;
          padding: 6px 0;
          border-bottom: 1px solid ${DS.divider};
        }
        .vs-assumption:last-child { border-bottom: none; }
        .vs-assumption-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: ${DS.blue}; flex-shrink: 0; margin-top: 7px;
        }

        /* ── Permit pill ── */
        .vs-permit-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 14px;
          border-radius: ${R.md}px;
          background: ${DS.greenLight};
          border: 1px solid #A7F3D0;
          font-family: ${FONT.body};
          font-size: 13px;
          font-weight: 500;
          color: ${DS.green};
          margin-top: 10px;
        }

        /* ── Status messages ── */
        .vs-status-loading {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 6px 12px; border-radius: ${R.sm}px;
          background: ${DS.blueLight}; color: ${DS.blue};
          font-size: 12px; font-weight: 500; font-family: ${FONT.body};
          border: 1px solid ${DS.blueMid};
        }
        .vs-status-error {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 6px 12px; border-radius: ${R.sm}px;
          background: ${DS.redLight}; color: ${DS.red};
          font-size: 12px; font-weight: 500; font-family: ${FONT.body};
          border: 1px solid #FCA5A5;
        }
        .vs-status-ok {
          font-size: 11px; color: ${DS.text3};
          font-family: ${FONT.mono};
        }

        /* ── Loading spinner ── */
        @keyframes vs-spin { to { transform: rotate(360deg); } }
        .vs-spinner {
          width: 13px; height: 13px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: vs-spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        @media (max-width: 640px) {
          .vs-stat-grid { grid-template-columns: 1fr; }
          .vs-topbar-project, .vs-topbar-sub { display: none; }
        }
      `}</style>

      <div className="vs-page">

        {/* ── Top bar ── */}
        <nav className="vs-topbar">
          <Link href="/" className="vs-topbar-logo">
            <span className="vs-topbar-logo-dot" />
            Voltscope
          </Link>
          <div className="vs-topbar-divider" />
          <Link href={`/projects/${projectId}`} className="vs-topbar-back">
            ← Projects
          </Link>
          <div className="vs-topbar-divider" />
          <div>
            <div className="vs-topbar-project">{project?.customerName ?? "New Estimate"}</div>
            <div className="vs-topbar-sub">{project?.jobType ?? "Estimate"}</div>
          </div>
          <div className="vs-topbar-actions">
            {uiState.isSaved && uiState.lastSavedAt && (
              <span className="vs-topbar-save-status">
                Saved {new Date(uiState.lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {estimate && totals && (
              <>
                <button type="button" onClick={() => handleDownloadPdf("proposal")} style={btnSecondary}>
                  ↑ Customer Proposal
                </button>
                <button type="button" onClick={() => handleDownloadPdf("business")} style={btnSecondary}>
                  ↑ Business Copy
                </button>
              </>
            )}
            <button type="button" onClick={saveDraft} style={btnPrimary}>
              Save Draft
            </button>
          </div>
        </nav>

        <div className="vs-content">

          {/* ── Page heading ── */}
          <div>
            <div className="vs-page-title">New Estimate</div>
            <div className="vs-page-sub">Describe the job scope to generate a priced estimate.</div>
          </div>

          {/* ── Job description card ── */}
          <div className="vs-card">
            <div className="vs-card-header">
              <span className="vs-card-title">Job Description</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {genState.status === "ready" && estimate?.generatedAt && (
                  <span className="vs-status-ok">
                    Generated {new Date(estimate.generatedAt).toLocaleString()}
                  </span>
                )}
                {genState.status === "ready" && (
                  <button type="button" onClick={clearEstimate} style={btnGhost}>
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>
            <div className="vs-card-body">
              <textarea
                value={jobDescription}
                onChange={(e) => {
                  setJobDescription(e.target.value);
                  if (genState.status === "error") setGenState({ status: "idle" });
                }}
                placeholder="Describe the scope — e.g. Install 60A EV charger in garage, 35ft EMT run, new 2-pole breaker. Or: 4,000 sq ft warehouse, 200A service, LED high bay lighting."
                rows={5}
                style={inputStyle}
                disabled={genState.status === "loading"}
              />

              {genState.status === "loading" && (
                <div className="vs-progress-track">
                  <div className="vs-progress-fill" style={{ width: `${progress}%` }} />
                </div>
              )}

              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  style={{ ...btnPrimary, opacity: canGenerate ? 1 : 0.45, cursor: canGenerate ? "pointer" : "not-allowed" }}
                >
                  {genState.status === "loading"
                    ? <><span className="vs-spinner" /> Generating…</>
                    : "⚡  Generate Estimate"}
                </button>

                {genState.status === "error" && (
                  <span className="vs-status-error">⚠ {genState.msg}</span>
                )}
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: DS.text3, lineHeight: 1.5 }}>
                Tip: include sq footage, voltage/amps, number of devices, run lengths, and access details (attic, crawlspace, finished walls).
              </div>
            </div>
          </div>

          {/* ── Scope summary ── */}
          {estimate && (
            <div className="vs-card">
              <div className="vs-card-header">
                <span className="vs-card-title">
                  {autoTitle(estimate.summary)}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <span className={`vs-badge ${isAssembly ? "vs-badge-amber" : "vs-badge-blue"}`}>
                    {isAssembly ? "Assembly" : "Line Item"}
                  </span>
                  {estimate.sqft && (
                    <span className="vs-badge vs-badge-gray">
                      {estimate.sqft.toLocaleString()} sq ft
                    </span>
                  )}
                </div>
              </div>
              <div className="vs-card-body">
                <p style={{ fontSize: 14, color: DS.text2, lineHeight: 1.6, marginBottom: 12 }}>
                  {estimate.summary}
                </p>
                {estimate.assumptions.length > 0 && (
                  <div>
                    {estimate.assumptions.map((a, i) => (
                      <div key={i} className="vs-assumption">
                        <span className="vs-assumption-dot" />
                        {a}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Pricing settings ── */}
          {estimate && (
            <div className="vs-card">
              <div className="vs-card-header">
                <span className="vs-card-title">Pricing Settings</span>
                <span className="vs-badge vs-badge-gray">Live</span>
              </div>
              <div className="vs-card-body">
                <div className="vs-settings-row">
                  {[
                    { label: "Labor Rate",  value: laborRate,  set: setLaborRate,  suffix: "/ hr" },
                    { label: "Markup",      value: markupPct,  set: setMarkupPct,  suffix: "%" },
                    { label: "Permit Fee",  value: permitFee,  set: setPermitFee,  suffix: "$" },
                  ].map(({ label, value, set, suffix }) => (
                    <div key={label} className="vs-setting-field">
                      <span className="vs-setting-label">{label}</span>
                      <div className="vs-setting-input-row">
                        <input
                          style={miniInput}
                          inputMode="decimal"
                          value={value}
                          onChange={(e) => { const v = Number(e.target.value); set(Number.isFinite(v) ? v : 0); }}
                          onBlur={saveDraft}
                        />
                        <span className="vs-setting-suffix">{suffix}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginLeft: "auto" }}>
                    <button type="button" onClick={saveDraft} style={btnGhost}>Save Settings</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Materials table ── */}
          {estimate && materialLines.length > 0 && (
            <div className="vs-card">
              <div className="vs-card-header">
                <span className="vs-card-title">
                  Materials
                  <span style={{ fontFamily: FONT.mono, fontWeight: 400, fontSize: 12, color: DS.text3 }}>
                    {materialLines.length} items
                  </span>
                </span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="vs-badge vs-badge-blue">AI Priced</span>
                  {materialLines.length > PREVIEW && (
                    <button type="button" onClick={() => setShowAllMaterials(s => !s)} style={btnGhost}>
                      {showAllMaterials ? "Show less" : `Show all ${materialLines.length}`}
                    </button>
                  )}
                </div>
              </div>

              <table className="vs-table">
                <thead>
                  <tr>
                    <th style={{ width: "44%" }}>Item</th>
                    <th className="right">Qty</th>
                    <th className="right">Unit</th>
                    <th className="right">Unit Cost</th>
                    <th className="right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(isAssembly || showAllMaterials
                    ? CATEGORY_ORDER.filter(cat => groupedMaterials[cat]?.length > 0).flatMap(cat => [
                        { type: "cat", cat } as const,
                        ...groupedMaterials[cat].map((m, i) => ({ type: "row", m, key: `${cat}-${i}` } as const)),
                      ])
                    : visibleMats.map((m, i) => ({ type: "row", m, key: `row-${i}` } as const))
                  ).map((item) => {
                    if (item.type === "cat") {
                      return (
                        <tr key={`cat-${item.cat}`}>
                          <td colSpan={5} className="vs-cat-header" style={{ padding: "8px 16px" }}>
                            {CATEGORY_LABEL[item.cat] ?? item.cat}
                          </td>
                        </tr>
                      );
                    }
                    const { m } = item;
                    return (
                      <tr key={item.key}>
                        <td>
                          <div className="item-name">{m.item}</div>
                          {m.notes && <div className="item-note">{m.notes}</div>}
                        </td>
                        <td className="right mono">{m.qty}</td>
                        <td className="right mono muted">{m.unit}</td>
                        <td className="right mono muted">${fmt(m.unitCost)}</td>
                        <td className="right mono" style={{ fontWeight: 600 }}>${fmt(m.lineTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!showAllMaterials && !isAssembly && hiddenCount > 0 && (
                <div style={{ padding: "10px 16px", fontSize: 12, color: DS.text3, borderTop: `1px solid ${DS.divider}` }}>
                  Showing {visibleMats.length} of {materialLines.length} — {hiddenCount} more hidden
                </div>
              )}
            </div>
          )}

          {/* ── Labor table ── */}
          {estimate && estimate.labor.length > 0 && (
            <div className="vs-card">
              <div className="vs-card-header">
                <span className="vs-card-title">
                  Labor
                  <span style={{ fontFamily: FONT.mono, fontWeight: 400, fontSize: 12, color: DS.text3 }}>
                    {estimate.laborHours} hrs
                  </span>
                </span>
                <span className="vs-badge vs-badge-amber">
                  ${fmt(totals?.laborTotal ?? 0)}
                </span>
              </div>
              <table className="vs-table">
                <thead>
                  <tr>
                    <th style={{ width: "58%" }}>Task</th>
                    <th className="right">Hours</th>
                    <th className="right">Rate</th>
                    <th className="right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {estimate.labor.map((l, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{l.description}</td>
                      <td className="right mono">{l.hours}</td>
                      <td className="right mono muted">${laborRate}/hr</td>
                      <td className="right mono" style={{ fontWeight: 600, color: DS.amber }}>
                        ${fmt(r2(l.hours * laborRate))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Totals ── */}
          {totals && estimate && (
            <div className="vs-card">
              <div className="vs-card-header">
                <span className="vs-card-title">Summary</span>
              </div>
              <div className="vs-card-body">
                <div className="vs-stat-grid">
                  <div className="vs-stat">
                    <div className="vs-stat-label">Material Total</div>
                    <div className="vs-stat-value">${fmt(totals.materialTotal)}</div>
                    <div className="vs-stat-sub">{materialLines.length} line items</div>
                  </div>
                  <div className="vs-stat vs-stat-amber">
                    <div className="vs-stat-label">Labor Total</div>
                    <div className="vs-stat-value">${fmt(totals.laborTotal)}</div>
                    <div className="vs-stat-sub">{estimate.laborHours} hrs @ ${laborRate}/hr</div>
                  </div>
                  <div className="vs-stat">
                    <div className="vs-stat-label">Subtotal</div>
                    <div className="vs-stat-value">${fmt(totals.subtotal)}</div>
                    <div className="vs-stat-sub">
                      {permitFee > 0 ? `Includes permit $${fmt(permitFee)}` : "Before markup"}
                    </div>
                  </div>
                  <div className="vs-stat vs-stat-blue">
                    <div className="vs-stat-label">Markup ({markupPct}%)</div>
                    <div className="vs-stat-value">${fmt(totals.markup)}</div>
                    <div className="vs-stat-sub">Profit margin</div>
                  </div>

                  <div className="vs-total-card">
                    <div>
                      <div className="vs-total-label">Total Price to Customer</div>
                      <div className="vs-total-value">${fmt(totals.finalTotal)}</div>
                      <div className="vs-total-meta">
                        {markupPct}% markup
                        {estimate.sqft && totals.ratePerSqft && ` · ${estimate.sqft.toLocaleString()} sq ft · $${totals.ratePerSqft.toFixed(2)}/sq ft`}
                      </div>
                    </div>
                    {estimate && totals && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <button type="button" onClick={() => handleDownloadPdf("proposal")} style={{ ...btnPrimary, fontSize: 12 }}>
                          ↑ Customer Proposal
                        </button>
                        <button type="button" onClick={() => handleDownloadPdf("business")} style={{ ...btnSecondary, fontSize: 12, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)" }}>
                          ↑ Business Copy
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}