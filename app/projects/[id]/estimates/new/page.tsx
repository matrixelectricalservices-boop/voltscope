"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getProjects } from "../../../../lib/projectStore";
import { ASSEMBLIES } from "../../../../lib/assemblies";

type ItemType = "Quick Bids";

// ─── UNCW Seahawks Design System ─────────────────────────────────────────────
const C = {
  teal: "#00778B",
  tealDark: "#005F70",
  tealLight: "#E0F4F7",
  tealGlow: "rgba(0, 119, 139, 0.18)",
  gold: "#C8A96E",
  goldLight: "#F5ECD8",
  goldGlow: "rgba(200, 169, 110, 0.22)",
  navy: "#003057",
  navyMid: "#04406B",
  navyLight: "#E8EFF6",
  white: "#FFFFFF",
  offWhite: "#F7FAFC",
  ink: "#0A1F33",
  muted: "rgba(0, 48, 87, 0.52)",
  divider: "rgba(0, 119, 139, 0.14)",
  green: "#1A7F5A",
  greenLight: "rgba(26, 127, 90, 0.12)",
  red: "#B91C1C",
  redLight: "rgba(185, 28, 28, 0.10)",
} as const;

const shadows = {
  card: "0 4px 24px rgba(0, 48, 87, 0.09), 0 1px 4px rgba(0, 48, 87, 0.06)",
  raised: "0 8px 32px rgba(0, 48, 87, 0.12), 0 2px 8px rgba(0, 48, 87, 0.07)",
  teal: "0 4px 20px rgba(0, 119, 139, 0.22)",
  gold: "0 4px 20px rgba(200, 169, 110, 0.28)",
  inset: "inset 0 1px 3px rgba(0, 48, 87, 0.08)",
} as const;

const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
} as const;

const font = {
  display: "'Barlow Condensed', 'Arial Narrow', Arial, sans-serif",
  body: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  mono: "'DM Mono', 'Fira Code', monospace",
} as const;

// ─── Shared style factories ───────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  background: C.white,
  border: `1px solid ${C.divider}`,
  borderRadius: radius.lg,
  boxShadow: shadows.card,
  padding: 18,
  fontFamily: font.body,
};

const itemCardStyle: React.CSSProperties = {
  background: C.offWhite,
  border: `1px solid ${C.divider}`,
  borderRadius: radius.md,
  boxShadow: "0 2px 8px rgba(0,48,87,0.05)",
  padding: 14,
};

const labelStyle: React.CSSProperties = {
  fontFamily: font.display,
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: 1.2,
  color: C.teal,
  textTransform: "uppercase" as const,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: radius.sm,
  border: `1.5px solid ${C.divider}`,
  background: C.white,
  boxShadow: shadows.inset,
  fontFamily: font.body,
  fontWeight: 600,
  fontSize: 14,
  color: C.ink,
  outline: "none",
  boxSizing: "border-box" as const,
};

const selectStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: radius.sm,
  border: `1.5px solid ${C.divider}`,
  background: C.white,
  fontFamily: font.body,
  fontWeight: 600,
  fontSize: 14,
  color: C.ink,
  width: "100%",
  outline: "none",
};

const btnPrimary: React.CSSProperties = {
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
  whiteSpace: "nowrap" as const,
};

const btnNeutral: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: radius.sm,
  border: `1.5px solid ${C.divider}`,
  background: C.white,
  color: C.teal,
  fontFamily: font.display,
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: 0.4,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,48,87,0.07)",
  whiteSpace: "nowrap" as const,
};

const btnDanger: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: radius.sm,
  border: `1.5px solid ${C.red}`,
  background: C.redLight,
  color: C.red,
  fontFamily: font.display,
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: 0.4,
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
};

const btnIcon: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 8,
  border: `1.5px solid ${C.divider}`,
  background: C.white,
  color: C.teal,
  fontFamily: font.body,
  fontWeight: 700,
  fontSize: 16,
  cursor: "pointer",
  display: "flex" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  flexShrink: 0,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewEstimatePage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id;

  const project = getProjects().find((p) => p.id === projectId);

  // ✅ multiple sq-ft assemblies
  const SQFT_IDS = useMemo(
    () =>
      new Set<string>([
        "res-new-construction-sqft",
        "comm-new-construction-sqft",
      ]),
    []
  );

  const SQFT_DEFAULT_QTY: Record<string, number> = {
    "res-new-construction-sqft": 1500,
    "comm-new-construction-sqft": 2500,
  };

  const ITEM_TYPES: ItemType[] = ["Quick Bids"];

  // ✅ display order is controlled here
  const QUICK_BID_IDS = [
    "res-new-construction-sqft",
    "comm-new-construction-sqft",
    "ev-charger-50a-lt50ft",
    "generator-22kw-ts-loadshed",
    "service-changeout-200a",
    "service-changeout-400a",
    "rec-20a-resi",
    "rec-20a-comm",
  ] as const;

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [markupPct, setMarkupPct] = useState(30);
  const [laborRate, setLaborRate] = useState(150);

  // ✅ per-id $/sqft
  const [sqFtRates, setSqFtRates] = useState<Record<string, number>>({
    "res-new-construction-sqft": 10,
    "comm-new-construction-sqft": 20,
  });

  const getSqFtRate = (id: string) => sqFtRates[id] ?? 0;
  const setSqFtRate = (id: string, value: number) =>
    setSqFtRates((prev) => ({ ...prev, [id]: value }));

  const [itemType, setItemType] = useState<ItemType>("Quick Bids");

  const draftKey = `voltscope:draft-estimate:${projectId ?? "unknown"}`;

  useEffect(() => {
    if (!projectId) return;

    const raw = localStorage.getItem(draftKey);
    if (!raw) return;

    try {
      const saved = JSON.parse(raw) as {
        quantities?: Record<string, number>;
        markupPct?: number;
        itemType?: ItemType;
        laborRate?: number;
        sqFtRates?: Record<string, number>;
      };

      if (saved.quantities) setQuantities(saved.quantities);
      if (typeof saved.markupPct === "number") setMarkupPct(saved.markupPct);
      if (saved.itemType) setItemType(saved.itemType);
      if (typeof saved.laborRate === "number") setLaborRate(saved.laborRate);
      if (saved.sqFtRates) setSqFtRates(saved.sqFtRates);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function saveDraft() {
    if (!projectId) return;

    localStorage.setItem(
      draftKey,
      JSON.stringify({
        quantities,
        markupPct,
        itemType,
        laborRate,
        sqFtRates, // ✅
        savedAt: new Date().toISOString(),
      })
    );
  }

  const visibleAssemblies = useMemo(() => {
    if (itemType === "Quick Bids") {
      return QUICK_BID_IDS.map((id) => ASSEMBLIES.find((a) => a.id === id)).filter(
        (a): a is (typeof ASSEMBLIES)[number] => Boolean(a)
      );
    }
    return [];
  }, [itemType]);

  const onlySqFtSelected = useMemo(() => {
    const positive = Object.entries(quantities)
      .filter(([, qty]) => (qty ?? 0) > 0)
      .map(([id]) => id);

    return positive.length > 0 && positive.every((id) => SQFT_IDS.has(id));
  }, [quantities, SQFT_IDS]);

  const materialTotal = ASSEMBLIES.reduce((sum, a) => {
    const qty = quantities[a.id] ?? 0;

    if (SQFT_IDS.has(a.id)) return sum + qty * getSqFtRate(a.id);
    return sum + qty * a.materialCost;
  }, 0);

  const laborHoursTotal = ASSEMBLIES.reduce((sum, a) => {
    const qty = quantities[a.id] ?? 0;
    return sum + qty * a.laborHours;
  }, 0);

  const effectiveLaborHours = onlySqFtSelected ? 0 : laborHoursTotal;
  const laborTotal = effectiveLaborHours * laborRate;
  const estimateTotal = materialTotal + laborTotal;
  const price = estimateTotal * (1 + markupPct / 100);
  const grossProfit = price - estimateTotal;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.offWhite}; }

        .seahawks-page {
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
          font-family: ${font.body};
          font-weight: 600;
          font-size: 13px;
          padding: 7px 12px;
          border-radius: ${radius.sm}px;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.08);
          transition: background 0.15s, color 0.15s;
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

        .top-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-top: 14px;
        }

        .main-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-top: 18px;
          align-items: start;
        }

        .panel-title {
          font-family: ${font.display};
          font-weight: 800;
          font-size: 16px;
          letter-spacing: 0.3px;
          color: ${C.navy};
          margin: 0;
        }

        .panel-count {
          font-family: ${font.mono};
          font-size: 12px;
          color: ${C.muted};
          background: ${C.tealLight};
          border-radius: 20px;
          padding: 2px 10px;
        }

        .item-card { transition: box-shadow 0.15s, border-color 0.15s; }
        .item-card:hover {
          box-shadow: 0 4px 16px rgba(0,119,139,0.12);
          border-color: rgba(0,119,139,0.28);
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid ${C.divider};
        }
        .stat-row:last-child { border-bottom: none; }

        .stat-label { font-size: 13px; font-weight: 600; color: ${C.muted}; }
        .stat-value { font-family: ${font.mono}; font-size: 14px; font-weight: 600; color: ${C.navy}; }

        .badge {
          display: inline-block;
          padding: 2px 9px;
          border-radius: 20px;
          font-family: ${font.display};
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
        }

        .badge-teal {
          background: ${C.tealLight};
          color: ${C.tealDark};
          border: 1px solid rgba(0,119,139,0.20);
        }

        .badge-gold {
          background: ${C.goldLight};
          color: ${C.navyMid};
          border: 1px solid rgba(200,169,110,0.30);
        }

        .empty-state {
          padding: 24px 18px;
          border-radius: ${radius.md}px;
          border: 1.5px dashed rgba(0,119,139,0.25);
          text-align: center;
          color: ${C.muted};
          font-size: 14px;
          font-weight: 500;
          background: ${C.tealLight};
          margin-top: 12px;
        }

        @media (max-width: 720px) {
          .top-grid, .main-grid { grid-template-columns: 1fr; }
        }

        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { opacity: 0.4; }
      `}</style>

      <div className="seahawks-page" style={{ maxWidth: 1160, margin: "0 auto" }}>
        <div className="header-bar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="header-accent" />
            <Link href={`/projects/${projectId}`} className="back-link">
              ← Back
            </Link>
            <div>
              <div className="header-title">New Estimate</div>
              <div className="header-sub">
                {project?.customerName ?? "Unnamed Project"} &nbsp;·&nbsp;{" "}
                {project?.jobType ?? "Unknown"}
              </div>
            </div>
          </div>

          <button type="button" onClick={saveDraft} style={btnPrimary}>
            💾 Save Draft
          </button>
        </div>

        <div className="top-grid">
          <div style={panelStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <h2 className="panel-title">Project</h2>
              <span className="badge badge-teal">Active</span>
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
            <div style={{ marginTop: 6, fontSize: 13, color: C.muted }}>
              Job Type: &nbsp;
              <span style={{ fontWeight: 700, color: C.teal }}>
                {project?.jobType ?? "Unknown"}
              </span>
            </div>
          </div>

          <div style={panelStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <h2 className="panel-title">Item Types</h2>
              <span className="badge badge-gold">Template</span>
            </div>
            <label style={labelStyle}>Select a Template Set</label>
            <div style={{ marginTop: 8 }}>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value as ItemType)}
                style={selectStyle}
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="main-grid">
          {/* LEFT */}
          <div style={panelStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <h2 className="panel-title">Assemblies</h2>
              <span className="panel-count">{visibleAssemblies.length} items</span>
            </div>

            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
              {visibleAssemblies.map((a) => {
                const isSqFt = SQFT_IDS.has(a.id);
                const materialDisplay = isSqFt ? getSqFtRate(a.id) : a.materialCost;
                const defaultQty = SQFT_DEFAULT_QTY[a.id] ?? 0;

                return (
                  <li key={a.id} className="item-card" style={itemCardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: font.display,
                            fontWeight: 800,
                            fontSize: 15,
                            color: C.navy,
                            letterSpacing: 0.2,
                            lineHeight: 1.2,
                          }}
                        >
                          {a.name}
                        </div>

                        {!isSqFt && (
                          <div style={{ fontSize: 13, color: C.muted, marginTop: 5, lineHeight: 1.5 }}>
                            <span className="badge badge-teal" style={{ marginRight: 6 }}>
                              {a.unit}
                            </span>
                            Material: <strong style={{ color: C.teal }}>${materialDisplay.toFixed(2)}</strong>
                            &nbsp;·&nbsp; Labor: <strong style={{ color: C.teal }}>{a.laborHours} hrs</strong>
                          </div>
                        )}

                        {isSqFt && (
                          <div style={{ fontSize: 13, color: C.muted, marginTop: 5 }}>
                            Quick bid by square footage — defaults to {defaultQty.toLocaleString()} sq ft
                          </div>
                        )}
                      </div>

                      {!isSqFt && (
                        <button
                          type="button"
                          onClick={() =>
                            setQuantities({ ...quantities, [a.id]: (quantities[a.id] ?? 0) + 1 })
                          }
                          style={btnNeutral}
                        >
                          + Add
                        </button>
                      )}
                    </div>

                    {isSqFt && (
                      <div
                        style={{
                          marginTop: 12,
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr auto",
                          gap: 10,
                          alignItems: "end",
                        }}
                      >
                        <div style={{ display: "grid", gap: 5 }}>
                          <label style={labelStyle}>Sq Ft</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1}
                            value={quantities[a.id] ?? defaultQty}
                            onChange={(e) =>
                              setQuantities({
                                ...quantities,
                                [a.id]: e.target.value === "" ? 0 : Number(e.target.value),
                              })
                            }
                            onFocus={() => {
                              if (!Object.prototype.hasOwnProperty.call(quantities, a.id)) {
                                setQuantities({ ...quantities, [a.id]: defaultQty });
                              }
                            }}
                            style={inputStyle}
                          />
                        </div>

                        <div style={{ display: "grid", gap: 5 }}>
                          <label style={labelStyle}>$ / Sq Ft</label>
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={0.25}
                            value={getSqFtRate(a.id)}
                            onChange={(e) => setSqFtRate(a.id, Number(e.target.value))}
                            style={inputStyle}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!Object.prototype.hasOwnProperty.call(quantities, a.id)) {
                              setQuantities({ ...quantities, [a.id]: defaultQty });
                            }
                          }}
                          style={btnNeutral}
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* RIGHT */}
          <div style={{ display: "grid", gap: 14 }}>
            <div style={panelStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 className="panel-title">Selected Items</h2>
                <span className="panel-count">{Object.keys(quantities).length} tracked</span>
              </div>

              {(() => {
                const selected = ASSEMBLIES.map((a) => ({
                  a,
                  qty: quantities[a.id] ?? 0,
                })).filter(({ a, qty }) => {
                  const hasKey = Object.prototype.hasOwnProperty.call(quantities, a.id);
                  const isSqFt = SQFT_IDS.has(a.id);
                  return isSqFt ? hasKey : qty > 0;
                });

                if (selected.length === 0) {
                  return <div className="empty-state">No items selected yet. Add an assembly from the left panel.</div>;
                }

                return (
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
                    {selected.map(({ a, qty }) => {
                      const isSqFt = SQFT_IDS.has(a.id);

                      return (
                        <li key={a.id} className="item-card" style={itemCardStyle}>
                          {isSqFt ? (
                            <div>
                              <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 15, color: C.navy, letterSpacing: 0.2 }}>
                                {a.name}
                              </div>

                              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end" }}>
                                <div style={{ display: "grid", gap: 5 }}>
                                  <label style={labelStyle}>Sq Ft</label>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    step={1}
                                    value={qty}
                                    onChange={(e) =>
                                      setQuantities({
                                        ...quantities,
                                        [a.id]: e.target.value === "" ? 0 : Number(e.target.value),
                                      })
                                    }
                                    style={inputStyle}
                                  />
                                </div>

                                <div style={{ display: "grid", gap: 5 }}>
                                  <label style={labelStyle}>$ / Sq Ft</label>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    step={0.25}
                                    value={getSqFtRate(a.id)}
                                    onChange={(e) => setSqFtRate(a.id, Number(e.target.value))}
                                    style={inputStyle}
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = { ...quantities };
                                    delete next[a.id];
                                    setQuantities(next);
                                  }}
                                  style={btnDanger}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                                <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                                  <div style={{ fontFamily: font.display, fontWeight: 800, fontSize: 15, color: C.navy, letterSpacing: 0.2, lineHeight: 1.2 }}>
                                    {a.name}
                                  </div>

                                  <div style={{ fontSize: 13, color: C.muted, marginTop: 5 }}>
                                    <span className="badge badge-teal" style={{ marginRight: 6 }}>
                                      {a.unit}
                                    </span>
                                    Material: <strong style={{ color: C.teal }}>${a.materialCost.toFixed(2)}</strong>
                                    &nbsp;·&nbsp; Labor: <strong style={{ color: C.teal }}>{a.laborHours} hrs</strong>
                                  </div>

                                  <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                                    Ext Material: <strong style={{ color: C.navy }}>${(qty * a.materialCost).toFixed(2)}</strong>
                                    &nbsp;·&nbsp; Ext Labor: <strong style={{ color: C.navy }}>{(qty * a.laborHours).toFixed(2)} hrs</strong>
                                  </div>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setQuantities({
                                        ...quantities,
                                        [a.id]: Math.max(0, (quantities[a.id] ?? 0) - 1),
                                      })
                                    }
                                    style={btnIcon}
                                  >
                                    –
                                  </button>

                                  <div
                                    style={{
                                      minWidth: 38,
                                      textAlign: "center",
                                      fontFamily: font.mono,
                                      fontWeight: 700,
                                      fontSize: 14,
                                      color: C.navy,
                                      padding: "5px 8px",
                                      borderRadius: 8,
                                      border: `1.5px solid ${C.divider}`,
                                      background: C.white,
                                    }}
                                  >
                                    {qty}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setQuantities({
                                        ...quantities,
                                        [a.id]: (quantities[a.id] ?? 0) + 1,
                                      })
                                    }
                                    style={btnIcon}
                                  >
                                    +
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = { ...quantities };
                                      delete next[a.id];
                                      setQuantities(next);
                                    }}
                                    style={btnDanger}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}
            </div>

            <div style={panelStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 className="panel-title">Totals</h2>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>Auto-calculated</span>
              </div>

              <div
                style={{
                  background: C.offWhite,
                  borderRadius: radius.md,
                  padding: "10px 14px",
                  border: `1px solid ${C.divider}`,
                  marginBottom: 12,
                }}
              >
                {onlySqFtSelected ? (
                  <div className="stat-row">
                    <span className="stat-label">Sq Ft Total</span>
                    <span className="stat-value">${materialTotal.toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div className="stat-row">
                      <span className="stat-label">Material</span>
                      <span className="stat-value">${materialTotal.toFixed(2)}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Labor Hours</span>
                      <span className="stat-value">{laborHoursTotal.toFixed(2)} hrs</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Labor Cost</span>
                      <span className="stat-value">${laborTotal.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              {!onlySqFtSelected && (
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Labor Rate ($ / hr)</label>
                  <div style={{ marginTop: 6 }}>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={1}
                      value={laborRate}
                      onChange={(e) => setLaborRate(Number(e.target.value))}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Markup %</label>
                <div style={{ marginTop: 6 }}>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={1}
                    value={markupPct}
                    onChange={(e) => setMarkupPct(Number(e.target.value))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div
                style={{
                  padding: "16px 18px",
                  borderRadius: radius.md,
                  background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navyMid} 100%)`,
                  boxShadow: shadows.raised,
                }}
              >
                <div
                  style={{
                    fontFamily: font.display,
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: 1.4,
                    color: C.gold,
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  Price to Customer
                </div>

                <div
                  style={{
                    fontFamily: font.display,
                    fontWeight: 800,
                    fontSize: 36,
                    color: C.white,
                    letterSpacing: -0.5,
                    lineHeight: 1,
                  }}
                >
                  ${price.toFixed(2)}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: "1px solid rgba(255,255,255,0.12)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.60)", fontWeight: 500 }}>
                    Gross Profit
                  </span>
                  <span
                    style={{
                      fontFamily: font.mono,
                      fontWeight: 700,
                      fontSize: 16,
                      color: C.gold,
                    }}
                  >
                    ${grossProfit.toFixed(2)}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: 12, fontSize: 12, color: C.muted, fontStyle: "italic" }}>
                Next: add "What's Included" notes per assembly.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}