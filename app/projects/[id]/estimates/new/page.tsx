"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

import { getProjects } from "../../../../lib/projectStore";
import { priceEstimate, type MaterialLine } from "../../../../lib/pricing/priceEngine";

type Draft = {
  savedAt: string;
  jobDescription?: string;
  estimate?: GeneratedEstimate;
  laborRate?: number;
  markupPct?: number;
};

type UIState = {
  isSaved: boolean;
  lastSavedAt?: string;
};

type EstimateLineItem = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  notes?: string;
  confidence?: "high" | "medium" | "low";
};

type GeneratedEstimate = {
  generatedAt: string;
  summary: string;
  assumptions: string[];
  lineItems: EstimateLineItem[];

  // pricing inputs
  materials: MaterialLine[];
  laborHours: number;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function clampQty(n: number) {
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(9999, Math.round(n));
}

// v0 parser — basic placeholder
function generateEstimateFromText(raw: string): GeneratedEstimate {
  const text = raw.trim();
  const lower = text.toLowerCase();

  const lineItems: EstimateLineItem[] = [];
  const assumptions: string[] = [];

  const add = (item: Omit<EstimateLineItem, "id">) =>
    lineItems.push({ id: uid(), ...item });

  const hasEV = /\bev\b|\be-v\b|charger|chargepoint|tesla|wall connector/.test(lower);

  const ftMatch = lower.match(/(\d{1,4})\s*(ft|feet|foot|')/);
  const runFt = ftMatch ? clampQty(parseInt(ftMatch[1], 10)) : undefined;

  if (hasEV) {
    add({
      name: "EV charger circuit (new branch circuit)",
      qty: 1,
      unit: "ea",
      notes: runFt != null ? `Approx. ${runFt} ft run (from description).` : "Run length not specified.",
      confidence: runFt != null ? "medium" : "low",
    });

    const ampsMatch = lower.match(/(\d{2,3})\s*a\b/);
    const amps = ampsMatch ? parseInt(ampsMatch[1], 10) : undefined;

    if (amps) {
      add({
        name: "Circuit breaker (2-pole)",
        qty: 1,
        unit: "ea",
        notes: `${amps}A (from description).`,
        confidence: "medium",
      });
    } else {
      add({
        name: "Circuit breaker (2-pole)",
        qty: 1,
        unit: "ea",
        notes: "Assumed 50A unless specified otherwise.",
        confidence: "low",
      });
      assumptions.push("Assumed EV circuit is 50A unless amperage is specified.");
    }

    const has1450 = /14-?50|nema\s*14\s*-?\s*50|50\s*a\s*receptacle/.test(lower);
    const hardwired = /hardwire|hard-wired|wall\s*connector/.test(lower);

    if (has1450 && !hardwired) {
      add({
        name: "NEMA 14-50 receptacle + cover/box",
        qty: 1,
        unit: "ea",
        confidence: "medium",
      });
    } else if (hardwired) {
      add({
        name: "EV charger hardwire connection (whip, fittings, strain relief)",
        qty: 1,
        unit: "ea",
        confidence: "medium",
      });
    } else {
      add({
        name: "EV termination hardware (receptacle OR hardwire)",
        qty: 1,
        unit: "ea",
        notes: "Exact termination type not specified.",
        confidence: "low",
      });
      assumptions.push(
        "Termination type (NEMA 14-50 vs hardwired) not specified; estimated as a placeholder line item."
      );
    }

    if (runFt != null) {
      add({
        name: "Branch circuit cable/conduit run",
        qty: runFt,
        unit: "ft",
        notes: "Includes routing material (type TBD after site conditions).",
        confidence: "medium",
      });
    } else {
      add({
        name: "Branch circuit cable/conduit run",
        qty: 1,
        unit: "lot",
        notes: "Run length not specified.",
        confidence: "low",
      });
    }

    if (/attic/.test(lower)) assumptions.push("Attic access assumed available.");
    if (/crawl/.test(lower)) assumptions.push("Crawlspace access assumed available.");
    if (/garage/.test(lower)) assumptions.push("Work area assumed in/near garage.");
  }

  const lightMatch = lower.match(/(\d{1,3})\s*(?:new\s*)?(light|lights|fixture|fixtures)\b/);
  if (lightMatch) {
    const qty = clampQty(parseInt(lightMatch[1], 10));
    add({ name: "Install light fixture(s)", qty, unit: "ea", confidence: "medium" });
  } else if (/\blight(s)?\b|\bfixture(s)?\b/.test(lower)) {
    add({
      name: "Install light fixture(s)",
      qty: 1,
      unit: "ea",
      notes: "Quantity not specified.",
      confidence: "low",
    });
    assumptions.push("Lighting quantity not specified; assumed 1 for placeholder.");
  }

  const recepMatch = lower.match(/(\d{1,3})\s*(receptacle|receptacles|outlet|outlets)\b/);
  if (recepMatch) {
    const qty = clampQty(parseInt(recepMatch[1], 10));
    add({ name: "Install receptacle(s)", qty, unit: "ea", confidence: "medium" });
  }

  if (/panel\s*upgrade|service\s*upgrade/.test(lower)) {
    add({
      name: "Electrical panel/service upgrade",
      qty: 1,
      unit: "ea",
      notes: "Exact amperage and scope TBD.",
      confidence: "low",
    });
    assumptions.push("Panel/service upgrade details TBD (amp rating, utility requirements, permits).");
  }

  if (lineItems.length === 0 && text.length > 0) {
    add({
      name: "General electrical scope (needs breakdown)",
      qty: 1,
      unit: "lot",
      notes: "No recognizable keywords found. Will need a more specific description.",
      confidence: "low",
    });
    assumptions.push("Description too vague for automatic line items; placeholder only.");
  }

  const summary =
    hasEV && text.length > 0
      ? "Detected EV charging-related scope and generated a starter line-item list."
      : "Generated a starter line-item list from the job description.";

  // Placeholder pricing inputs (you'll expand this later to real skuKey mapping)
  return {
    generatedAt: new Date().toISOString(),
    summary,
    assumptions,
    lineItems,
    materials: [
      { skuKey: "misc_consumables", qty: 1, unit: "lot", name: "Misc fittings/consumables" },
    ],
    laborHours: 4,
  };
}

export default function NewEstimatePage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id;

  const project = getProjects().find((p) => p.id === projectId);
  const draftKey = `voltscope:draft-estimate:${projectId ?? "unknown"}`;

  const [uiState, setUiState] = useState<UIState>({ isSaved: false, lastSavedAt: undefined });

  const [jobDescription, setJobDescription] = useState("");
  const [estimate, setEstimate] = useState<GeneratedEstimate | null>(null);

  const [markupPct, setMarkupPct] = useState(20);
  const [laborRate, setLaborRate] = useState(150);
  const [priced, setPriced] = useState<ReturnType<typeof priceEstimate> | null>(null);

 const [genState, setGenState] = useState<{ status: "idle" | "loading" | "ready" | "error"; msg?: string }>({
  status: "idle",
});

  // Load draft
  useEffect(() => {
    if (!projectId) return;

    const raw = localStorage.getItem(draftKey);
    if (!raw) return;

    try {
      const saved = JSON.parse(raw) as Partial<Draft>;

      if (typeof saved.jobDescription === "string") setJobDescription(saved.jobDescription);

      if (typeof saved.laborRate === "number" && Number.isFinite(saved.laborRate)) {
        setLaborRate(saved.laborRate);
      }
      if (typeof saved.markupPct === "number" && Number.isFinite(saved.markupPct)) {
        setMarkupPct(saved.markupPct);
      }

      if (saved.estimate && typeof saved.estimate === "object") {
        setEstimate(saved.estimate as GeneratedEstimate);
        setGenState({ status: "ready" });
      }

      if (saved.savedAt) setUiState({ isSaved: true, lastSavedAt: saved.savedAt });
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Recalculate pricing whenever estimate / laborRate / markupPct changes
  useEffect(() => {
    if (!estimate) {
      setPriced(null);
      return;
    }

    const next = priceEstimate({
      month: "2026-03",
      state: "NC",
      laborRate,
      markupPct,
      laborHours: estimate.laborHours,
      materials: estimate.materials,
    });

    setPriced(next);
  }, [estimate, laborRate, markupPct]);

  function saveDraft() {
    if (!projectId) return;

    const payload: Draft = {
      savedAt: new Date().toISOString(),
      jobDescription: jobDescription.trim(),
      estimate: estimate ?? undefined,
      laborRate,
      markupPct,
    };

    localStorage.setItem(draftKey, JSON.stringify(payload));
    setUiState({ isSaved: true, lastSavedAt: payload.savedAt });
  }

 async function handleGenerate() {
  const text = jobDescription.trim();

  if (!text) {
    setGenState({ status: "error", msg: "Please enter a job description first." });
    return;
  }

  setGenState({ status: "loading" });

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 26000);

  try {
    const r = await fetch("/api/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: text }),
      signal: controller.signal,
    });

    // IMPORTANT: always read as text first (prevents hanging on invalid JSON)
    const raw = await r.text();

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      setGenState({
        status: "error",
        msg: `API returned non-JSON (status ${r.status}). First chars: ${raw.slice(0, 40)}`,
      });
      return;
    }

    if (!r.ok) {
      setGenState({ status: "error", msg: data?.error ?? `Request failed (status ${r.status})` });
      return;
    }

    const generated: GeneratedEstimate = {
      generatedAt: new Date().toISOString(),
      summary: data?.summary ?? "AI generated estimate.",
      assumptions: Array.isArray(data?.assumptions) ? data.assumptions : [],
      lineItems: [
        {
          id: uid(),
          name: data?.summary ?? "AI-generated scope",
          qty: 1,
          unit: "lot",
          notes: "Generated by AI from job description.",
          confidence: "medium",
        },
      ],
      materials: Array.isArray(data?.materials) ? data.materials : [],
      laborHours: typeof data?.laborHours === "number" ? data.laborHours : 0,
    };

    setEstimate(generated);
    setGenState({ status: "ready" });

    if (projectId) {
      const payload: Draft = {
        savedAt: new Date().toISOString(),
        jobDescription: text,
        estimate: generated,
        laborRate,
        markupPct,
      };
      localStorage.setItem(draftKey, JSON.stringify(payload));
      setUiState({ isSaved: true, lastSavedAt: payload.savedAt });
    }
  } catch (e: any) {
    const msg =
      e?.name === "AbortError"
        ? "Request timed out (15s). Check /api/estimate server logs."
        : e?.message ?? "Request failed.";
    setGenState({ status: "error", msg });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

  // ─── UNCW Seahawks Design System ───────────────────────────────────────────
  const C = {
    teal: "#00778B",
    tealDark: "#005F70",
    tealLight: "#E0F4F7",
    gold: "#C8A96E",
    goldLight: "#F5ECD8",
    navy: "#003057",
    navyMid: "#04406B",
    white: "#FFFFFF",
    offWhite: "#F7FAFC",
    ink: "#0A1F33",
    muted: "rgba(0, 48, 87, 0.52)",
    divider: "rgba(0, 119, 139, 0.14)",
  } as const;

  const shadows = {
    card: "0 4px 24px rgba(0, 48, 87, 0.09), 0 1px 4px rgba(0, 48, 87, 0.06)",
    raised: "0 8px 32px rgba(0, 48, 87, 0.12), 0 2px 8px rgba(0, 48, 87, 0.07)",
    teal: "0 4px 20px rgba(0, 119, 139, 0.22)",
  } as const;

  const radius = { sm: 10, md: 14, lg: 18 } as const;

  const font = {
    display: "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif",
    body: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    mono: "'DM Mono', 'Fira Code', monospace",
  } as const;

  const panelStyle: CSSProperties = {
    background: C.white,
    border: `1px solid ${C.divider}`,
    borderRadius: radius.lg,
    boxShadow: shadows.card,
    padding: 18,
    fontFamily: font.body,
  };

  const btnPrimary: CSSProperties = {
    padding: "10px 20px",
    borderRadius: radius.sm,
    border: `1.5px solid ${C.tealDark}`,
    background: `linear-gradient(160deg, ${C.teal} 0%, ${C.tealDark} 100%)`,
    color: C.white,
    fontFamily: font.display,
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: 0.6,
    cursor: "pointer",
    boxShadow: shadows.teal,
    whiteSpace: "nowrap",
  };

  const btnSecondary: CSSProperties = {
    padding: "10px 14px",
    borderRadius: radius.sm,
    border: `1px solid rgba(0, 119, 139, 0.26)`,
    background: `linear-gradient(180deg, ${C.white} 0%, #F6FBFC 100%)`,
    color: C.navy,
    fontFamily: font.display,
    fontWeight: 800,
    fontSize: 13,
    letterSpacing: 0.55,
    cursor: "pointer",
    boxShadow: "0 6px 18px rgba(0, 48, 87, 0.08)",
    whiteSpace: "nowrap",
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    padding: "12px 12px",
    borderRadius: radius.md,
    border: `1px solid rgba(0, 119, 139, 0.22)`,
    outline: "none",
    fontFamily: font.body,
    fontSize: 14,
    lineHeight: 1.4,
    color: C.ink,
    background: "linear-gradient(180deg, #FFFFFF 0%, #FBFEFF 100%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
  };

  const helperStyle: CSSProperties = {
    marginTop: 8,
    fontSize: 12,
    color: C.muted,
    fontFamily: font.body,
  };

  const miniInput: CSSProperties = {
    width: 120,
    padding: "8px 10px",
    borderRadius: radius.md,
    border: `1px solid rgba(0, 119, 139, 0.22)`,
    outline: "none",
    fontFamily: font.mono,
    fontSize: 13,
    color: C.ink,
    background: "linear-gradient(180deg, #FFFFFF 0%, #FBFEFF 100%)",
  };

  const pill = (tone: "high" | "medium" | "low") => {
    const map = {
      high: { bg: "rgba(0,119,139,0.10)", bd: "rgba(0,119,139,0.25)", fg: C.tealDark, label: "High" },
      medium: { bg: "rgba(200,169,110,0.12)", bd: "rgba(200,169,110,0.35)", fg: C.navy, label: "Med" },
      low: { bg: "rgba(0,48,87,0.08)", bd: "rgba(0,48,87,0.18)", fg: C.navy, label: "Low" },
    }[tone];

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "2px 10px",
          borderRadius: 999,
          fontFamily: font.display,
          fontWeight: 800,
          fontSize: 11,
          letterSpacing: 0.7,
          textTransform: "uppercase",
          background: map.bg,
          border: `1px solid ${map.bd}`,
          color: map.fg,
          whiteSpace: "nowrap",
        }}
        title="Parser confidence (v0)"
      >
        {map.label}
      </span>
    );
  };

  const canGenerate = useMemo(() => jobDescription.trim().length > 0, [jobDescription]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.offWhite}; }

        .page {
          min-height: 100vh;
          background: linear-gradient(160deg, #EAF4F7 0%, #F7FAFC 40%, #F0EBE1 100%);
          padding: 20px;
          font-family: ${font.body};
          color: ${C.ink};
        }

        .header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px 20px;
          border-radius: ${radius.lg}px;
          background: linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 100%);
          box-shadow: ${shadows.raised};
          flex-wrap: wrap;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 260px;
        }

        .header-accent {
          width: 4px;
          height: 38px;
          border-radius: 4px;
          background: linear-gradient(180deg, ${C.gold} 0%, ${C.teal} 100%);
          flex-shrink: 0;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          color: rgba(255,255,255,0.75);
          font-weight: 600;
          font-size: 13px;
          padding: 7px 12px;
          border-radius: ${radius.sm}px;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.08);
          transition: background 0.15s, color 0.15s;
          white-space: nowrap;
        }
        .back-link:hover { background: rgba(255,255,255,0.16); color: ${C.white}; }

        .header-title {
          font-family: ${font.display};
          font-weight: 800;
          font-size: 22px;
          letter-spacing: 0.5px;
          color: ${C.white};
          line-height: 1.1;
        }

        .header-sub {
          font-size: 13px;
          color: rgba(255,255,255,0.55);
          margin-top: 2px;
          font-weight: 500;
        }

        .content {
          max-width: 1160px;
          margin: 0 auto;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          margin-top: 14px;
        }

        .panel-title {
          font-family: ${font.display};
          font-weight: 800;
          font-size: 16px;
          letter-spacing: 0.3px;
          color: ${C.navy};
          margin: 0;
        }

        .badge {
          display: inline-block;
          padding: 2px 9px;
          border-radius: 20px;
          font-family: ${font.display};
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          background: ${C.tealLight};
          color: ${C.tealDark};
          border: 1px solid rgba(0,119,139,0.20);
          white-space: nowrap;
        }

        .meta-row {
          margin-top: 6px;
          font-size: 13px;
          color: ${C.muted};
        }

        .meta-strong {
          font-weight: 700;
          color: ${C.teal};
        }

        .saved-row {
          margin-top: 10px;
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
          color: rgba(255,255,255,0.70);
          font-size: 12px;
          font-family: ${font.mono};
        }

        @media (max-width: 720px) {
          .header-left { min-width: 0; }
        }
      `}</style>

      <div className="page">
        <div className="content">
          {/* Header */}
          <div className="header-bar">
            <div className="header-left">
              <div className="header-accent" />
              <Link href={`/projects/${projectId}`} className="back-link">
                ← Back
              </Link>
              <div>
                <div className="header-title">New Estimate</div>
                <div className="header-sub">
                  {project?.customerName ?? "Unnamed Project"} &nbsp;·&nbsp; {project?.jobType ?? "Unknown"}
                </div>
                {uiState.isSaved && uiState.lastSavedAt && (
                  <div className="saved-row">
                    Last saved: {new Date(uiState.lastSavedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            <button type="button" onClick={saveDraft} style={btnPrimary}>
              💾 Save Draft
            </button>
          </div>

          <div className="grid">
            {/* Project Info Block */}
            <div style={panelStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <h2 className="panel-title">Project</h2>
                <span className="badge">Active</span>
              </div>

              <div
                style={{
                  fontFamily: font.display,
                  fontWeight: 800,
                  fontSize: 18,
                  color: C.navy,
                  letterSpacing: 0.2,
                }}
              >
                {project?.customerName ?? "Unnamed Project"}
              </div>

              <div className="meta-row">
                Job Type: <span className="meta-strong">{project?.jobType ?? "Unknown"}</span>
              </div>

              {projectId && <div className="meta-row">Project ID: {projectId}</div>}
            </div>

            {/* Job Description */}
            <div style={panelStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <h2 className="panel-title">Job Description</h2>
                <span className="badge">Input</span>
              </div>

              <textarea
                value={jobDescription}
                onChange={(e) => {
                  setJobDescription(e.target.value);
                  if (genState.status === "error") setGenState({ status: "idle" });
                }}

                
                placeholder="Describe the job scope... (example: Install EV charger in garage, 25ft run through attic, new 60A breaker, permit included)"
                rows={6}
                style={inputStyle}
              />

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  marginTop: 12,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={handleGenerate}
                  style={{
                    ...btnSecondary,
                    opacity: canGenerate ? 1 : 0.55,
                    cursor: canGenerate ? "pointer" : "not-allowed",
                  }}
                  disabled={!canGenerate}
                  title={!canGenerate ? "Enter a job description to generate." : "Generate a starter estimate."}
                >
                  ⚡ Generate Estimate
                </button>

                {genState.status === "error" && (
                  <span
                    style={{
                      fontFamily: font.mono,
                      fontSize: 12,
                      color: "rgba(160, 24, 24, 0.85)",
                      background: "rgba(255, 235, 235, 0.8)",
                      border: "1px solid rgba(160, 24, 24, 0.18)",
                      padding: "6px 10px",
                      borderRadius: 999,
                    }}
                  >
                    {genState.msg}
                  </span>
                )}

                {genState.status === "loading" && (
  <span
    style={{
      fontFamily: font.mono,
      fontSize: 12,
      color: "rgba(0,48,87,0.75)",
      background: "rgba(224,244,247,0.9)",
      border: "1px solid rgba(0,119,139,0.18)",
      padding: "6px 10px",
      borderRadius: 999,
    }}
  >
    Generating…
  </span>
)}

                {estimate?.generatedAt && genState.status === "ready" && (
                  <span
                    style={{
                      fontFamily: font.mono,
                      fontSize: 12,
                      color: "rgba(255,255,255,0.85)",
                      background: "rgba(0, 48, 87, 0.25)",
                      border: "1px solid rgba(255,255,255,0.16)",
                      padding: "6px 10px",
                      borderRadius: 999,
                    }}
                  >
                    Generated: {new Date(estimate.generatedAt).toLocaleString()}
                  </span>
                )}
              </div>

              <div style={helperStyle}>
                Tip: Include distances, voltage/amps, number of devices, and any access details (attic/crawlspace,
                trenching, etc).
              </div>
            </div>

            {/* Generated Estimate Preview */}
            {estimate && (
              <div style={panelStyle}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <h2 className="panel-title">Generated Estimate (Preview)</h2>
                  <span className="badge">Draft</span>
                </div>

                <div style={{ fontFamily: font.body, fontSize: 14, color: C.ink, marginBottom: 10 }}>
                  <span style={{ fontWeight: 800, color: C.navy }}>Summary:</span> {estimate.summary}
                </div>

                {estimate.assumptions.length > 0 && (
                  <div
                    style={{
                      marginBottom: 12,
                      padding: 12,
                      borderRadius: radius.md,
                      background: "linear-gradient(180deg, #FBFCFE 0%, #F5FAFB 100%)",
                      border: `1px solid ${C.divider}`,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: font.display,
                        fontWeight: 800,
                        letterSpacing: 0.35,
                        color: C.navy,
                        marginBottom: 6,
                      }}
                    >
                      Assumptions
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, color: C.muted, fontSize: 13 }}>
                      {estimate.assumptions.map((a, i) => (
                        <li key={i} style={{ marginTop: i === 0 ? 0 : 6 }}>
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ border: `1px solid ${C.divider}`, borderRadius: radius.md, overflow: "hidden" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 0.4fr 0.4fr 0.6fr",
                      background: `linear-gradient(180deg, ${C.tealLight} 0%, #F6FBFC 100%)`,
                      padding: "10px 12px",
                      fontFamily: font.display,
                      fontWeight: 800,
                      color: C.navy,
                      letterSpacing: 0.4,
                      fontSize: 12,
                      textTransform: "uppercase",
                    }}
                  >
                    <div>Item</div>
                    <div style={{ textAlign: "right" }}>Qty</div>
                    <div style={{ textAlign: "center" }}>Unit</div>
                    <div style={{ textAlign: "right" }}>Confidence</div>
                  </div>

                  {estimate.lineItems.map((li) => (
                    <div
                      key={li.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 0.4fr 0.4fr 0.6fr",
                        padding: "12px 12px",
                        borderTop: `1px solid ${C.divider}`,
                        alignItems: "start",
                        gap: 10,
                        background: C.white,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, color: C.navy, fontSize: 14, lineHeight: 1.25 }}>
                          {li.name}
                        </div>
                        {li.notes && (
                          <div style={{ marginTop: 4, fontSize: 12, color: C.muted, lineHeight: 1.35 }}>
                            {li.notes}
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: "right", fontFamily: font.mono, color: C.ink, fontSize: 13 }}>
                        {li.qty}
                      </div>

                      <div style={{ textAlign: "center", fontFamily: font.mono, color: C.muted, fontSize: 13 }}>
                        {li.unit}
                      </div>

                      <div style={{ textAlign: "right" }}>{pill(li.confidence ?? "low")}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 10, fontSize: 12, color: C.muted, fontFamily: font.mono }}>
                  v0 parser: Starter breakdown only. Next we’ll map line items → real skuKey materials + labor rules.
                </div>
              </div>
            )}

            {/* Totals + Editable Inputs */}
            {priced && (
              <div style={panelStyle}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <h2 className="panel-title">Totals</h2>

                  <span className="badge">Pricing</span>
                </div>
                {/* Materials List */}
<div
  style={{
    marginBottom: 12,
    border: `1px solid ${C.divider}`,
    borderRadius: radius.md,
    overflow: "hidden",
  }}
>
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1.2fr 0.35fr 0.55fr 0.55fr",
      gap: 0,
      background: `linear-gradient(180deg, ${C.tealLight} 0%, #F6FBFC 100%)`,
      padding: "10px 12px",
      fontFamily: font.display,
      fontWeight: 800,
      color: C.navy,
      letterSpacing: 0.4,
      fontSize: 12,
      textTransform: "uppercase",
    }}
  >
    <div>Material</div>
    <div style={{ textAlign: "right" }}>Qty</div>
    <div style={{ textAlign: "right" }}>Unit</div>
    <div style={{ textAlign: "right" }}>Line Total</div>
  </div>

  {priced.pricedMaterials.map((m) => (
    <div
      key={m.skuKey}
      style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 0.35fr 0.55fr 0.55fr",
        padding: "12px 12px",
        borderTop: `1px solid ${C.divider}`,
        alignItems: "start",
        gap: 10,
        background: m.missingFromPricebook ? "rgba(200,169,110,0.10)" : C.white,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 800, color: C.navy, fontSize: 14, lineHeight: 1.25 }}>
          {m.name}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, color: C.muted, fontFamily: font.mono }}>
          {m.skuKey}
          {m.missingFromPricebook ? " · missing from price book" : ""}
        </div>
      </div>

      <div style={{ textAlign: "right", fontFamily: font.mono, color: C.ink, fontSize: 13 }}>
        {m.qty}
      </div>

      <div style={{ textAlign: "right", fontFamily: font.mono, color: C.muted, fontSize: 13 }}>
        {m.unit} @ ${m.adjUnitCost.toFixed(2)}
      </div>

      <div style={{ textAlign: "right", fontFamily: font.mono, color: C.ink, fontSize: 13 }}>
        ${m.lineTotal.toFixed(2)}
      </div>
    </div>
  ))}
</div>


                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontFamily: font.display, fontWeight: 800, color: C.navy }}>
                      Labor Rate
                    </span>
                    <input
                      style={miniInput}
                      inputMode="numeric"
                      value={laborRate}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setLaborRate(Number.isFinite(v) ? v : 0);
                      }}
                      onBlur={saveDraft}
                    />
                    <span style={{ fontFamily: font.mono, color: C.muted, fontSize: 12 }}>/hr</span>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontFamily: font.display, fontWeight: 800, color: C.navy }}>
                      Markup
                    </span>
                    <input
                      style={miniInput}
                      inputMode="numeric"
                      value={markupPct}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setMarkupPct(Number.isFinite(v) ? v : 0);
                      }}
                      onBlur={saveDraft}
                    />
                    <span style={{ fontFamily: font.mono, color: C.muted, fontSize: 12 }}>%</span>
                  </div>

                  <button type="button" onClick={saveDraft} style={btnSecondary}>
                    💾 Save Pricing
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div
                    style={{
                      padding: 12,
                      borderRadius: radius.md,
                      border: `1px solid ${C.divider}`,
                      background: "linear-gradient(180deg, #FFFFFF 0%, #FBFEFF 100%)",
                    }}
                  >
                    <div style={{ fontFamily: font.display, fontWeight: 800, color: C.navy }}>Material Total</div>
                    <div style={{ fontFamily: font.mono, fontSize: 18, marginTop: 6 }}>
                      ${priced.materialTotal.toFixed(2)}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 12,
                      borderRadius: radius.md,
                      border: `1px solid ${C.divider}`,
                      background: "linear-gradient(180deg, #FFFFFF 0%, #FBFEFF 100%)",
                    }}
                  >
                    <div style={{ fontFamily: font.display, fontWeight: 800, color: C.navy }}>Labor Total</div>
                    <div style={{ fontFamily: font.mono, fontSize: 18, marginTop: 6 }}>
                      ${priced.laborTotal.toFixed(2)}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: C.muted, fontFamily: font.mono }}>
                      {estimate?.laborHours ?? 0} hrs @ ${laborRate}/hr
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 12,
                      borderRadius: radius.md,
                      border: `1px solid ${C.divider}`,
                      background: "linear-gradient(180deg, #FFFFFF 0%, #FBFEFF 100%)",
                    }}
                  >
                    <div style={{ fontFamily: font.display, fontWeight: 800, color: C.navy }}>Subtotal</div>
                    <div style={{ fontFamily: font.mono, fontSize: 18, marginTop: 6 }}>
                      ${priced.subtotal.toFixed(2)}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 12,
                      borderRadius: radius.md,
                      border: `1px solid ${C.divider}`,
                      background: "linear-gradient(180deg, #FFFFFF 0%, #FBFEFF 100%)",
                    }}
                  >
                    <div style={{ fontFamily: font.display, fontWeight: 800, color: C.navy }}>Profit (Markup)</div>
                    <div style={{ fontFamily: font.mono, fontSize: 18, marginTop: 6 }}>
                      ${priced.profit.toFixed(2)}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: C.muted, fontFamily: font.mono }}>
                      Markup: {markupPct}%
                    </div>
                  </div>

                  <div
                    style={{
                      gridColumn: "1 / -1",
                      padding: 14,
                      borderRadius: radius.md,
                      border: `1px solid rgba(0,119,139,0.22)`,
                      background: `linear-gradient(135deg, ${C.tealLight} 0%, #F6FBFC 60%, ${C.goldLight} 100%)`,
                    }}
                  >
                    <div style={{ fontFamily: font.display, fontWeight: 900, color: C.navy }}>
                      Final Price to Customer
                    </div>
                    <div style={{ fontFamily: font.mono, fontSize: 26, marginTop: 8, color: C.ink }}>
                      ${priced.finalTotal.toFixed(2)}
                    </div>

                    <div style={{ marginTop: 8, fontSize: 12, color: C.muted, fontFamily: font.mono }}>
                      Applied: {priced.applied.state} · Mx {priced.applied.materialMultiplier} · Lx{" "}
                      {priced.applied.laborMultiplier}
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