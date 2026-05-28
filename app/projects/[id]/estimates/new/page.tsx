"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { getProjects, type Project } from "../../../../lib/projectStore";
import { generateEstimatePdf } from "../../../../lib/generateEstimatePdf";
import { loadProfile } from "../../../../lib/userProfile";
import { saveEstimate, updateEstimate, getEstimate } from "../../../../lib/estimateStore";

const DS = {
  shell:       "#0B0F1A",
  shellBorder: "rgba(255,255,255,0.07)",
  pageBg:      "#F4F6F9",
  card:        "#FFFFFF",
  text1:       "#0F172A",
  text2:       "#475569",
  text3:       "#94A3B8",
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
  border:      "#E4E7ED",
  divider:     "#F1F3F7",
  cardShadow:  "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
  raisedShadow:"0 4px 16px rgba(15,23,42,0.10), 0 2px 6px rgba(15,23,42,0.06)",
  blueShadow:  "0 4px 14px rgba(37,99,235,0.30)",
} as const;

const FONT = {
  head: "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif",
  body: "'Inter', 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
} as const;

const R = { xs: 6, sm: 8, md: 10, lg: 12, xl: 16 } as const;

// ── Logo mark ──
const LogoMark = () => (
  <div style={{ width: 30, height: 30, borderRadius: R.md, background: "#0B0F1A", border: "1px solid rgba(37,99,235,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <line x1="5" y1="17" x2="5" y2="9" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="15" y1="17" x2="15" y2="9" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M5 9 Q10 2 15 9" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="8" cy="6" r="1.2" fill="#93c5fd"/>
      <circle cx="12" cy="6" r="1.2" fill="#93c5fd"/>
    </svg>
  </div>
);

// ── Types ──
type MaterialLine = { item: string; qty: number; unit: string; unitCost: number; lineTotal: number; notes?: string; category: string; };
type LaborLine    = { description: string; hours: number; rate: number; total: number; };
type GeneratedEstimate = {
  generatedAt: string; summary: string; assumptions: string[];
  scopeType: "line_item" | "assembly"; materials: MaterialLine[];
  labor: LaborLine[]; laborHours: number;
  isNewConstruction?: boolean; sqft?: number; ratePerSqft?: number;
};
type Draft = {
  savedAt: string; jobDescription?: string; estimate?: GeneratedEstimate;
  laborRate?: number; markupPct?: number; permitFee?: number; materialCostIndex?: number;
};
type UIState = { isSaved: boolean; lastSavedAt?: string };

function autoTitle(summary: string) {
  const s = summary.toLowerCase();
  if (s.includes("warehouse"))                                return "Warehouse Electrical";
  if (s.includes("new home") || s.includes("new construction")) return "New Construction";
  if (s.includes("commercial") || s.includes("office"))      return "Commercial Buildout";
  if (s.includes("ev") || s.includes("charger"))             return "EV Charger Install";
  if (s.includes("panel") || s.includes("service"))          return "Panel / Service Work";
  if (s.includes("receptacle") || s.includes("outlet"))      return "Outlet Installation";
  if (s.includes("light") || s.includes("fixture"))          return "Lighting";
  return "Electrical Estimate";
}

function r2(n: number) { return Math.round(n * 100) / 100; }
function fmt(n: number) { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const CATEGORY_ORDER = ["equipment","wire","conduit","devices","boxes","fittings","consumables"];
const CATEGORY_LABEL: Record<string, string> = {
  equipment: "Equipment", wire: "Wire & Cable", conduit: "Conduit & Raceway",
  devices: "Devices", boxes: "Boxes & Covers", fittings: "Fittings & Hardware", consumables: "Consumables",
};

// ── Shared button styles ──
const btnPrimary: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "10px 18px", borderRadius: R.md, border: "none",
  background: `linear-gradient(135deg, ${DS.blue} 0%, ${DS.blueDark} 100%)`,
  color: "#fff", fontFamily: FONT.head, fontWeight: 600, fontSize: 14,
  cursor: "pointer", boxShadow: DS.blueShadow, whiteSpace: "nowrap",
};
const btnSecondary: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "10px 16px", borderRadius: R.md, border: `1px solid ${DS.border}`,
  background: DS.card, color: DS.text1, fontFamily: FONT.head, fontWeight: 600,
  fontSize: 14, cursor: "pointer", whiteSpace: "nowrap",
};
const btnGhost: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "6px 12px", borderRadius: R.sm, border: `1px solid ${DS.border}`,
  background: "transparent", color: DS.text2, fontFamily: FONT.body,
  fontWeight: 500, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
};
const inputStyle: CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: R.md,
  border: `1px solid ${DS.border}`, outline: "none",
  fontFamily: FONT.body, fontSize: 15, lineHeight: 1.55,
  color: DS.text1, background: DS.card, resize: "vertical",
};
const miniInput: CSSProperties = {
  width: 90, padding: "8px 10px", borderRadius: R.sm,
  border: `1px solid ${DS.border}`, outline: "none",
  fontFamily: FONT.mono, fontSize: 14, color: DS.text1,
  background: DS.card, textAlign: "right",
};

export default function NewEstimatePage() {
  const params       = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const projectId    = params?.id;
  const draftKey     = `sparcbid:draft-estimate:${projectId ?? "unknown"}`;

  const [project,           setProject]          = useState<Project | null>(null);
  const currentEstimateId = useRef<string | null>(null);
  const isSaving          = useRef(false);
  const [uiState,           setUiState]          = useState<UIState>({ isSaved: false });
  const [savedConfirm,      setSavedConfirm]     = useState(false);
  const [jobDescription,    setJobDescription]   = useState("");
  const [jobType,           setJobType]          = useState<"Residential"|"Commercial"|"Industrial">("Residential");
  const [zipCode,           setZipCode]          = useState("");
  const [zipError,          setZipError]         = useState("");
  const [estimate,          setEstimate]         = useState<GeneratedEstimate | null>(null);
  const [laborRate,         setLaborRate]        = useState(125);
  const [markupPct,         setMarkupPct]        = useState(20);
  const [permitFee,         setPermitFee]        = useState(125);
  const [materialCostIndex, setMaterialCostIndex]= useState(1.0);
  const [showAllMaterials,  setShowAllMaterials] = useState(false);
  const [genState, setGenState] = useState<{ status: "idle"|"loading"|"ready"|"error"; msg?: string }>({ status: "idle" });
  const [progress, setProgress] = useState(0);

  const LABOR_RATES: Record<"Residential"|"Commercial"|"Industrial", number> = {
    Residential: 125, Commercial: 150, Industrial: 200,
  };

  // Load project
  useEffect(() => {
    if (projectId) getProjects().then((all) => setProject(all.find((p) => p.id === projectId) ?? null));
  }, [projectId]);

  // Restore draft from localStorage — only if no ?load= param (fresh form should be clean)
  useEffect(() => {
    if (!projectId) return;
    const loadId = searchParams?.get("load");
    if (loadId) return; // loading a saved estimate — don't restore draft
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Partial<Draft>;
      if (typeof saved.jobDescription    === "string") setJobDescription(saved.jobDescription);
      if (typeof saved.laborRate         === "number") setLaborRate(saved.laborRate);
      if (typeof saved.markupPct         === "number") setMarkupPct(saved.markupPct);
      if (typeof saved.permitFee         === "number" && saved.permitFee > 0) setPermitFee(saved.permitFee);
      if (typeof saved.materialCostIndex === "number") setMaterialCostIndex(saved.materialCostIndex);
      if (saved.estimate) { setEstimate(saved.estimate); setGenState({ status: "ready" }); }
      if (saved.savedAt) setUiState({ isSaved: true, lastSavedAt: saved.savedAt });
    } catch { /* ignore */ }
  }, [projectId, draftKey]);

  // Load saved estimate from ?load=id
  useEffect(() => {
    const loadId = searchParams?.get("load");
    if (!loadId) return;
    getEstimate(loadId).then((saved) => {
      if (!saved) return;
      currentEstimateId.current = saved.id;
      setEstimate({ generatedAt: saved.savedAt, summary: saved.snapshot.summary, assumptions: saved.snapshot.assumptions, scopeType: saved.snapshot.scopeType, materials: saved.snapshot.materials, labor: saved.snapshot.labor, laborHours: saved.snapshot.laborHours, sqft: saved.snapshot.sqft, ratePerSqft: saved.snapshot.ratePerSqft });
      setLaborRate(saved.snapshot.laborRate);
      setMarkupPct(saved.snapshot.markupPct);
      setPermitFee(saved.snapshot.permitFee);
      setJobDescription(saved.description);
      setGenState({ status: "ready" });
    });
  }, [searchParams]);

  // Progress bar
  useEffect(() => {
    if (genState.status !== "loading") { setProgress(0); return; }
    setProgress(10);
    const id = window.setInterval(() => setProgress((p) => Math.min(90, p + Math.max(1, Math.round((90 - p) * 0.12)))), 280);
    return () => window.clearInterval(id);
  }, [genState.status]);

  // Totals
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
    return estimate.materials.map((m) => ({ ...m, unitCost: r2(m.unitCost * materialCostIndex), lineTotal: r2(m.qty * m.unitCost * materialCostIndex) }));
  }, [estimate, materialCostIndex]);

  const groupedMaterials = useMemo(() => {
    const groups: Record<string, MaterialLine[]> = {};
    for (const m of materialLines) { const cat = m.category ?? "consumables"; if (!groups[cat]) groups[cat] = []; groups[cat].push(m); }
    return groups;
  }, [materialLines]);

  function saveDraft() {
    if (!projectId) return;
    setUiState({ isSaved: true, lastSavedAt: new Date().toISOString() });
    setSavedConfirm(true);
    setTimeout(() => setSavedConfirm(false), 2000);
    if (estimate && totals) {
      const snapshot = { summary: estimate.summary, assumptions: estimate.assumptions, scopeType: estimate.scopeType, materials: materialLines, labor: estimate.labor, laborHours: estimate.laborHours, sqft: estimate.sqft, ratePerSqft: totals.ratePerSqft, laborRate, markupPct, permitFee };
      if (currentEstimateId.current) {
        updateEstimate(currentEstimateId.current, jobDescription.trim(), snapshot);
      } else {
        saveEstimate(projectId, jobDescription.trim(), snapshot).then((saved) => {
          if (saved) currentEstimateId.current = saved.id;
        });
      }
    }
  }

  async function handleGenerate() {
    const text = jobDescription.trim();
    if (!text) { setGenState({ status: "error", msg: "Please enter a job description first." }); return; }
    if (!zipCode.trim() || !/^\d{5}$/.test(zipCode.trim())) {
      setZipError("Please enter a valid 5-digit zip code.");
      return;
    }
    setZipError("");
    setGenState({ status: "loading" });
    const controller = new AbortController();
    const timeoutId  = window.setTimeout(() => controller.abort(), 55_000);
    try {
      const res  = await fetch("/api/estimate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: text, jobType, zipCode: zipCode.trim(), laborRate, markupPct, permitFee, materialCostIndex }), signal: controller.signal });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) { setGenState({ status: "error", msg: data?.error ?? "API error — please try again." }); return; }
      const generated: GeneratedEstimate = {
        generatedAt: new Date().toISOString(), summary: data.summary ?? "Electrical scope estimate.",
        assumptions: Array.isArray(data.assumptions) ? data.assumptions : [],
        scopeType: data.scopeType === "assembly" ? "assembly" : "line_item",
        materials: Array.isArray(data.materials) ? data.materials : [],
        labor: Array.isArray(data.labor) ? data.labor : [],
        laborHours: typeof data.laborHours === "number" ? data.laborHours : 0,
        isNewConstruction: data.isNewConstruction === true,
        sqft: typeof data.sqft === "number" && data.sqft > 0 ? data.sqft : undefined,
        ratePerSqft: typeof data.ratePerSqft === "number" ? data.ratePerSqft : undefined,
      };
      setEstimate(generated); setProgress(100); setShowAllMaterials(false); setGenState({ status: "ready" });
      // Save to DB exactly once — capture ID to prevent duplicates on subsequent saves
      if (projectId) {
        const lines = generated.materials.map((m) => ({ ...m, lineTotal: r2(m.qty * m.unitCost) }));
        saveEstimate(projectId, text, {
          summary: generated.summary, assumptions: generated.assumptions,
          scopeType: generated.scopeType, materials: lines, labor: generated.labor,
          laborHours: generated.laborHours, sqft: generated.sqft,
          ratePerSqft: generated.ratePerSqft, laborRate, markupPct, permitFee,
        }).then((saved) => {
          if (saved) currentEstimateId.current = saved.id;
        });
        localStorage.removeItem(draftKey);
        setUiState({ isSaved: true, lastSavedAt: new Date().toISOString() });
      }
    } catch (e: unknown) {
      setGenState({ status: "error", msg: e instanceof Error && e.name === "AbortError" ? "Request timed out." : "Request failed — please try again." });
    } finally { window.clearTimeout(timeoutId); }
  }

  function clearEstimate() {
    setJobDescription(""); setEstimate(null); setProgress(0);
    setGenState({ status: "idle" }); setShowAllMaterials(false);
    currentEstimateId.current = null;
    isSaving.current = false;
    if (projectId) { localStorage.removeItem(draftKey); setUiState({ isSaved: false }); }
    const url = new URL(window.location.href); url.searchParams.delete("load"); window.history.replaceState({}, "", url.toString());
  }

  function handleDownloadPdf(mode: "business" | "proposal") {
    if (!estimate || !totals) return;
    const profile = loadProfile();
    generateEstimatePdf({
      companyName: profile.company || "Your Company", companyPhone: profile.phone || "", companyEmail: profile.email || "",
      customerName: project?.customerName ?? "Customer", jobType: project?.jobType, jobDescription,
      estimateDate: new Date().toLocaleDateString("en-US"), mode,
      summary: estimate.summary, assumptions: estimate.assumptions, scopeType: estimate.scopeType, sqft: estimate.sqft,
      materials: materialLines, labor: estimate.labor.map((l) => ({ ...l, rate: laborRate, total: l.hours * laborRate })),
      laborHours: estimate.laborHours, laborRate, materialTotal: totals.materialTotal, laborTotal: totals.laborTotal,
      subtotal: totals.subtotal, markup: totals.markup, markupPct, permitFee, finalTotal: totals.finalTotal, ratePerSqft: totals.ratePerSqft,
    });
  }

  const canGenerate = jobDescription.trim().length > 0 && genState.status !== "loading" && genState.status !== "ready";
  const PREVIEW     = 5;
  const visibleMats = showAllMaterials ? materialLines : materialLines.slice(0, PREVIEW);
  const hiddenCount = Math.max(0, materialLines.length - PREVIEW);
  const isAssembly  = estimate?.scopeType === "assembly";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${DS.pageBg}; }
        .vs-page { min-height: 100vh; background: ${DS.pageBg}; font-family: ${FONT.body}; color: ${DS.text1}; }

        /* ── Topbar ── */
        .vs-topbar { position: sticky; top: 0; z-index: 100; height: 56px; background: ${DS.shell}; border-bottom: 1px solid ${DS.shellBorder}; display: flex; align-items: center; padding: 0 16px; gap: 0; overflow: hidden; }
        .vs-logo { font-family: ${FONT.head}; font-weight: 800; font-size: 16px; color: #fff; letter-spacing: -0.3px; display: flex; align-items: center; gap: 8px; text-decoration: none; flex-shrink: 0; }
        .vs-logo-name { color: #fff; }
        .vs-logo-name span { color: #2563EB; }
        .vs-topbar-divider { width: 1px; height: 20px; background: ${DS.shellBorder}; margin: 0 12px; flex-shrink: 0; }
        .vs-breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 13px; flex: 1; min-width: 0; overflow: hidden; }
        .vs-breadcrumb a { color: rgba(255,255,255,0.45); text-decoration: none; flex-shrink: 0; white-space: nowrap; }
        .vs-breadcrumb a:hover { color: rgba(255,255,255,0.8); }
        .vs-breadcrumb-sep { color: rgba(255,255,255,0.2); flex-shrink: 0; }
        .vs-breadcrumb-current { color: rgba(255,255,255,0.85); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .vs-topbar-right { flex-shrink: 0; margin-left: 8px; display: flex; align-items: center; gap: 8px; }
        .vs-save-status { font-size: 11px; color: rgba(255,255,255,0.30); font-family: ${FONT.mono}; white-space: nowrap; }

        /* ── Content ── */
        .vs-content { max-width: 720px; margin: 0 auto; padding: 20px 16px 80px; display: flex; flex-direction: column; gap: 14px; }

        /* ── Page title ── */
        .vs-page-title { font-family: ${FONT.head}; font-weight: 800; font-size: 20px; color: ${DS.text1}; letter-spacing: -0.3px; }
        .vs-page-sub { font-size: 13px; color: ${DS.text3}; margin-top: 2px; }

        /* ── Card ── */
        .vs-card { background: ${DS.card}; border: 1px solid ${DS.border}; border-radius: ${R.xl}px; box-shadow: ${DS.cardShadow}; overflow: hidden; }
        .vs-card-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid ${DS.divider}; gap: 10px; flex-wrap: wrap; }
        .vs-card-title { font-family: ${FONT.head}; font-weight: 700; font-size: 14px; color: ${DS.text1}; display: flex; align-items: center; gap: 8px; }
        .vs-card-body { padding: 16px; }

        /* ── Badge ── */
        .vs-badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 20px; font-family: ${FONT.head}; font-weight: 600; font-size: 11px; white-space: nowrap; }
        .vs-badge-blue  { background: ${DS.blueMid};    color: ${DS.blue};  border: 1px solid ${DS.blueLight}; }
        .vs-badge-amber { background: ${DS.amberLight}; color: ${DS.amber}; border: 1px solid ${DS.amberMid}; }
        .vs-badge-green { background: ${DS.greenLight}; color: ${DS.green}; border: 1px solid #A7F3D0; }
        .vs-badge-gray  { background: ${DS.divider};    color: ${DS.text3}; border: 1px solid ${DS.border}; }

        /* ── Progress ── */
        .vs-progress-track { width: 100%; height: 3px; background: ${DS.divider}; border-radius: 99px; overflow: hidden; margin-top: 10px; }
        .vs-progress-fill { height: 100%; background: linear-gradient(90deg, ${DS.blue}, #60a5fa); border-radius: 99px; transition: width 200ms ease; }

        /* ── Settings row ── */
        .vs-settings-row { display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; }
        .vs-setting-field { display: flex; flex-direction: column; gap: 4px; }
        .vs-setting-label { font-family: ${FONT.head}; font-weight: 600; font-size: 11px; letter-spacing: 0.4px; text-transform: uppercase; color: ${DS.text3}; }
        .vs-setting-input-row { display: flex; align-items: center; gap: 5px; }
        .vs-setting-suffix { font-size: 12px; color: ${DS.text3}; font-family: ${FONT.mono}; }

        /* ── Materials table ── */
        .vs-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .vs-table th { padding: 8px 12px; background: ${DS.divider}; font-family: ${FONT.head}; font-weight: 700; font-size: 10.5px; letter-spacing: 0.6px; text-transform: uppercase; color: ${DS.text3}; text-align: left; border-bottom: 1px solid ${DS.border}; white-space: nowrap; }
        .vs-table th.r { text-align: right; }
        .vs-table td { padding: 10px 12px; border-bottom: 1px solid ${DS.divider}; color: ${DS.text1}; vertical-align: top; }
        .vs-table td.r { text-align: right; }
        .vs-table td.mono { font-family: ${FONT.mono}; font-size: 12.5px; }
        .vs-table td.muted { color: ${DS.text3}; }
        .vs-table tr:last-child td { border-bottom: none; }
        .vs-table tr:nth-child(even) td { background: ${DS.divider}; }
        .vs-item-name { font-weight: 600; line-height: 1.3; }
        .vs-item-note { font-size: 11px; color: ${DS.text3}; margin-top: 2px; font-family: ${FONT.mono}; }
        .vs-cat-row td { padding: 6px 12px; background: ${DS.divider}; font-family: ${FONT.head}; font-weight: 700; font-size: 10px; letter-spacing: 0.8px; text-transform: uppercase; color: ${DS.text3}; border-top: 1px solid ${DS.border}; border-bottom: 1px solid ${DS.border}; }

        /* ── Assumption ── */
        .vs-assumption { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px; color: ${DS.text2}; line-height: 1.5; padding: 5px 0; border-bottom: 1px solid ${DS.divider}; }
        .vs-assumption:last-child { border-bottom: none; }
        .vs-assumption-dot { width: 5px; height: 5px; border-radius: 50%; background: ${DS.blue}; flex-shrink: 0; margin-top: 7px; }

        /* ── Totals summary ── */
        .vs-totals-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 16px; }
        .vs-total-item { padding: 12px 14px; border-radius: ${R.lg}px; border: 1px solid ${DS.border}; background: ${DS.card}; }
        .vs-total-item-label { font-family: ${FONT.head}; font-weight: 600; font-size: 10.5px; letter-spacing: 0.4px; text-transform: uppercase; color: ${DS.text3}; }
        .vs-total-item-value { font-family: ${FONT.mono}; font-weight: 500; font-size: 18px; color: ${DS.text1}; margin-top: 4px; letter-spacing: -0.3px; }
        .vs-total-item-value.amber { color: ${DS.amber}; }
        .vs-total-item-value.blue  { color: ${DS.blue}; }

        /* ── Final total panel ── */
        .vs-final-panel { background: linear-gradient(135deg, ${DS.shell} 0%, #1a2744 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: ${R.xl}px; padding: 20px; margin-bottom: 16px; }
        .vs-final-label { font-family: ${FONT.head}; font-weight: 700; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,0.45); margin-bottom: 4px; }
        .vs-final-value { font-family: ${FONT.mono}; font-size: 40px; font-weight: 500; color: #fff; letter-spacing: -1.5px; line-height: 1; margin-bottom: 6px; }
        .vs-final-meta { font-size: 12px; color: rgba(255,255,255,0.30); }

        /* ── PDF buttons ── */
        .vs-pdf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .vs-pdf-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 14px 12px; border-radius: ${R.lg}px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.80); font-family: ${FONT.head}; font-weight: 600; font-size: 13px; cursor: pointer; transition: background 0.15s; text-align: center; }
        .vs-pdf-btn:hover { background: rgba(255,255,255,0.10); }
        .vs-pdf-btn-icon { font-size: 20px; margin-bottom: 2px; }
        .vs-pdf-btn-sub { font-size: 10.5px; color: rgba(255,255,255,0.40); font-weight: 400; }

        /* ── Status ── */
        .vs-status-error { display: inline-flex; align-items: center; gap: 7px; padding: 8px 12px; border-radius: ${R.sm}px; background: ${DS.redLight}; color: ${DS.red}; font-size: 13px; font-weight: 500; border: 1px solid #FCA5A5; }
        .vs-status-ok { font-size: 11px; color: ${DS.text3}; font-family: ${FONT.mono}; }

        @keyframes vs-spin { to { transform: rotate(360deg); } }
        .vs-spinner { width: 14px; height: 14px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: vs-spin 0.7s linear infinite; flex-shrink: 0; }

        textarea:focus, input:focus { border-color: ${DS.blue} !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.12) !important; outline: none; }

        /* ── Mobile ── */
        @media (max-width: 600px) {
          .vs-totals-grid { grid-template-columns: 1fr 1fr; }
          .vs-final-value { font-size: 32px; }
          .vs-table th.hide-mobile, .vs-table td.hide-mobile { display: none; }
          .vs-settings-row { gap: 12px; }
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
            <a href={`/projects/${projectId}`}>{project?.customerName ?? "Customer"}</a>
            <span className="vs-breadcrumb-sep">›</span>
            <span className="vs-breadcrumb-current">Estimate</span>
          </div>
          <div className="vs-topbar-right">
            {uiState.isSaved && uiState.lastSavedAt && (
              <span className="vs-save-status">
                Saved {new Date(uiState.lastSavedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <button type="button" onClick={saveDraft} style={{
              ...btnPrimary, fontSize: 13, padding: "7px 14px",
              background: savedConfirm ? `linear-gradient(135deg, ${DS.green} 0%, #047857 100%)` : `linear-gradient(135deg, ${DS.blue} 0%, ${DS.blueDark} 100%)`,
              boxShadow: savedConfirm ? "0 4px 14px rgba(5,150,105,0.35)" : DS.blueShadow,
            }}>
              {savedConfirm ? "✓ Saved" : "Save"}
            </button>
          </div>
        </nav>

        <div className="vs-content">

          {/* Page heading */}
          <div>
            <div className="vs-page-title">New Estimate</div>
            <div className="vs-page-sub">{project?.customerName ?? "Describe the job scope to generate a priced estimate."}</div>
          </div>

          {/* ── Job description ── */}
          <div className="vs-card">
            <div className="vs-card-header">
              <span className="vs-card-title">Job Description</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {genState.status === "ready" && estimate?.generatedAt && (
                  <span className="vs-status-ok">Generated {new Date(estimate.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                )}
                {genState.status === "ready" && (
                  <button type="button" onClick={clearEstimate} style={btnGhost}>✕ Clear</button>
                )}
              </div>
            </div>
            <div className="vs-card-body">
              <textarea
                value={jobDescription}
                onChange={(e) => { setJobDescription(e.target.value); if (genState.status === "error") setGenState({ status: "idle" }); }}
                placeholder="e.g. Install 60A EV charger in garage, 35ft EMT run, new 2-pole breaker. Or: 4,000 sq ft warehouse, 200A service, LED high bay lighting."
                rows={4} style={inputStyle} disabled={genState.status === "loading"}
              />
              {genState.status === "loading" && (
                <div className="vs-progress-track">
                  <div className="vs-progress-fill" style={{ width: `${progress}%` }} />
                </div>
              )}
              {/* Job type + zip row */}
              <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontFamily: FONT.head, fontWeight: 600, fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase" as const, color: DS.text3 }}>
                    Job Type {genState.status === "ready" && <span style={{ color: DS.blue, fontSize: 10 }}>· locked</span>}
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["Residential","Commercial","Industrial"] as const).map((t) => (
                      <button key={t} type="button"
                        disabled={genState.status === "ready" || genState.status === "loading"}
                        onClick={() => { setJobType(t); setLaborRate(LABOR_RATES[t]); }}
                        style={{
                          padding: "7px 14px", borderRadius: R.md, border: "none",
                          fontFamily: FONT.head, fontWeight: 600, fontSize: 12,
                          cursor: genState.status === "ready" ? "default" : "pointer",
                          transition: "all 0.15s",
                          background: jobType === t ? DS.blue : DS.divider,
                          color: jobType === t ? "#fff" : DS.text2,
                          boxShadow: jobType === t ? DS.blueShadow : "none",
                          opacity: genState.status === "ready" && jobType !== t ? 0.4 : 1,
                        }}>{t}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontFamily: FONT.head, fontWeight: 600, fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase" as const, color: DS.text3 }}>
                    Zip Code {genState.status === "ready" && <span style={{ color: DS.blue, fontSize: 10 }}>· locked</span>}
                  </span>
                  <input
                    type="text" inputMode="numeric" maxLength={5}
                    placeholder="28401"
                    value={zipCode}
                    disabled={genState.status === "ready" || genState.status === "loading"}
                    onChange={e => { setZipCode(e.target.value.replace(/\D/g, "")); setZipError(""); }}
                    style={{ width: 110, padding: "7px 12px", borderRadius: R.md, border: `1.5px solid ${zipError ? DS.red : DS.border}`, outline: "none", fontFamily: FONT.mono, fontSize: 14, color: DS.text1, background: genState.status === "ready" ? DS.divider : DS.card, cursor: genState.status === "ready" ? "default" : "text" }}
                  />
                  {zipError && <span style={{ fontSize: 11, color: DS.red }}>{zipError}</span>}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
                <button type="button" onClick={handleGenerate} disabled={!canGenerate}
                  style={{ ...btnPrimary, opacity: canGenerate ? 1 : 0.45, cursor: canGenerate ? "pointer" : "not-allowed", fontSize: 14 }}>
                  {genState.status === "loading" ? <><span className="vs-spinner" /> Generating…</> : "Generate Estimate"}
                </button>
                {genState.status === "error" && <span className="vs-status-error">⚠ {genState.msg}</span>}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: DS.text3, lineHeight: 1.5 }}>
                Tip: include sq footage, voltage/amps, number of devices, run lengths, and access details.
              </div>
            </div>
          </div>

          {/* ── Scope summary ── */}
          {estimate && (
            <div className="vs-card">
              <div className="vs-card-header">
                <span className="vs-card-title">{autoTitle(estimate.summary)}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <span className={`vs-badge ${isAssembly ? "vs-badge-amber" : "vs-badge-blue"}`}>{isAssembly ? "Assembly" : "Line Item"}</span>
                  {estimate.sqft && <span className="vs-badge vs-badge-gray">{estimate.sqft.toLocaleString()} sq ft</span>}
                </div>
              </div>
              <div className="vs-card-body">
                <p style={{ fontSize: 14, color: DS.text2, lineHeight: 1.6, marginBottom: estimate.assumptions.length > 0 ? 12 : 0 }}>
                  {estimate.summary}
                </p>
                {estimate.assumptions.length > 0 && estimate.assumptions.map((a, i) => (
                  <div key={i} className="vs-assumption">
                    <span className="vs-assumption-dot" />{a}
                  </div>
                ))}
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
                    { label: "Labor Rate", value: laborRate, set: setLaborRate, suffix: "/hr" },
                    { label: "Markup",     value: markupPct, set: setMarkupPct, suffix: "%" },
                    { label: "Permit Fee", value: permitFee, set: setPermitFee, suffix: "$" },
                  ].map(({ label, value, set, suffix }) => (
                    <div key={label} className="vs-setting-field">
                      <span className="vs-setting-label">{label}</span>
                      <div className="vs-setting-input-row">
                        <input style={miniInput} inputMode="decimal" value={value}
                          onChange={(e) => { const v = Number(e.target.value); set(Number.isFinite(v) ? v : 0); }}
                          onBlur={saveDraft} />
                        <span className="vs-setting-suffix">{suffix}</span>
                      </div>
                    </div>
                  ))}
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
                  <span style={{ fontFamily: FONT.mono, fontWeight: 400, fontSize: 12, color: DS.text3 }}>{materialLines.length} items</span>
                </span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="vs-badge vs-badge-blue">Smart Priced</span>
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
                    <th style={{ width: "46%" }}>Item</th>
                    <th className="r hide-mobile">Qty</th>
                    <th className="r hide-mobile">Unit</th>
                    <th className="r">Unit Cost</th>
                    <th className="r">Total</th>
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
                    if (item.type === "cat") return (
                      <tr key={`cat-${item.cat}`}><td colSpan={5} className="vs-cat-row">{CATEGORY_LABEL[item.cat] ?? item.cat}</td></tr>
                    );
                    const { m } = item;
                    return (
                      <tr key={item.key}>
                        <td><div className="vs-item-name">{m.item}</div>{m.notes && <div className="vs-item-note">{m.notes}</div>}</td>
                        <td className="r mono hide-mobile">{m.qty}</td>
                        <td className="r mono muted hide-mobile">{m.unit}</td>
                        <td className="r mono muted">${fmt(m.unitCost)}</td>
                        <td className="r mono" style={{ fontWeight: 600 }}>${fmt(m.lineTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!showAllMaterials && !isAssembly && hiddenCount > 0 && (
                <div style={{ padding: "8px 12px", fontSize: 12, color: DS.text3, borderTop: `1px solid ${DS.divider}` }}>
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
                  <span style={{ fontFamily: FONT.mono, fontWeight: 400, fontSize: 12, color: DS.text3 }}>{estimate.laborHours} hrs</span>
                </span>
                <span className="vs-badge vs-badge-amber">${fmt(totals?.laborTotal ?? 0)}</span>
              </div>
              <table className="vs-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th className="r hide-mobile">Hours</th>
                    <th className="r hide-mobile">Rate</th>
                    <th className="r">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {estimate.labor.map((l, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{l.description}</td>
                      <td className="r mono hide-mobile">{l.hours}</td>
                      <td className="r mono muted hide-mobile">${laborRate}/hr</td>
                      <td className="r mono" style={{ fontWeight: 600, color: DS.amber }}>${fmt(r2(l.hours * laborRate))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Totals + PDF ── */}
          {totals && estimate && (
            <div className="vs-card">
              <div className="vs-card-header">
                <span className="vs-card-title">Summary</span>
              </div>
              <div className="vs-card-body">

                {/* Breakdown grid */}
                <div className="vs-totals-grid">
                  <div className="vs-total-item">
                    <div className="vs-total-item-label">Materials</div>
                    <div className="vs-total-item-value">${fmt(totals.materialTotal)}</div>
                  </div>
                  <div className="vs-total-item">
                    <div className="vs-total-item-label">Labor</div>
                    <div className="vs-total-item-value amber">${fmt(totals.laborTotal)}</div>
                  </div>
                  <div className="vs-total-item">
                    <div className="vs-total-item-label">Permit Fee</div>
                    <div className="vs-total-item-value">${fmt(permitFee)}</div>
                    <div style={{ fontSize: 10, color: DS.text3, marginTop: 2 }}>editable in Pricing Settings ↑</div>
                  </div>
                  <div className="vs-total-item">
                    <div className="vs-total-item-label">Subtotal</div>
                    <div className="vs-total-item-value">${fmt(totals.subtotal)}</div>
                    <div style={{ fontSize: 10, color: DS.text3, marginTop: 2 }}>incl. permit</div>
                  </div>
                  <div className="vs-total-item">
                    <div className="vs-total-item-label">Markup ({markupPct}%)</div>
                    <div className="vs-total-item-value blue">${fmt(totals.markup)}</div>
                  </div>
                </div>

                {/* Final total + PDF buttons together */}
                <div className="vs-final-panel">
                  <div className="vs-final-label">Total Price to Customer</div>
                  <div className="vs-final-value">${fmt(totals.finalTotal)}</div>
                  <div className="vs-final-meta">
                    {markupPct}% markup
                    {estimate.sqft && totals.ratePerSqft && ` · ${estimate.sqft.toLocaleString()} sq ft · $${totals.ratePerSqft.toFixed(2)}/sq ft`}
                  </div>

                  {/* PDF buttons live right under the total */}
                  <div style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: FONT.head, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>
                      Download PDF
                    </div>
                    <div className="vs-pdf-row">
                      <button type="button" className="vs-pdf-btn" onClick={() => handleDownloadPdf("proposal")}>
                        <span className="vs-pdf-btn-icon">📄</span>
                        Customer Proposal
                        <span className="vs-pdf-btn-sub">Scope only · no costs</span>
                      </button>
                      <button type="button" className="vs-pdf-btn" onClick={() => handleDownloadPdf("business")}>
                        <span className="vs-pdf-btn-icon">📊</span>
                        Business Copy
                        <span className="vs-pdf-btn-sub">Full breakdown · private</span>
                      </button>
                    </div>
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