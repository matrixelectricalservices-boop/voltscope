"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getProjects } from "../../../../lib/projectStore";
import { ASSEMBLIES } from "../../../../lib/assemblies";

type ItemType = "Quick Bids";

export default function NewEstimatePage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id;

  const project = getProjects().find((p) => p.id === projectId);

  const SQFT_ID = "res-new-construction-sqft";

  const ITEM_TYPES: ItemType[] = ["Quick Bids"];

  // ✅ Put your 3 assembly IDs here (must match ASSEMBLIES ids)
  const QUICK_BID_IDS = [
    "res-new-construction-sqft",
    "rec-20a-comm",
    "rec-20a-resi",
  ] as const;

  const ui = {
    pageBg: "linear-gradient(180deg, #f8fafc 0%, #ffffff 70%)",
    panelBg: "rgba(255,255,255,0.92)",
    panelBorder: "1px solid rgba(15, 23, 42, 0.10)",
    softShadow: "0 12px 35px rgba(15, 23, 42, 0.08)",
    smallShadow: "0 3px 12px rgba(15, 23, 42, 0.08)",
    text: "#0f172a",
    muted: "rgba(15, 23, 42, 0.62)",
    accent: "#2563eb",
    accentRing: "0 0 0 4px rgba(37, 99, 235, 0.15)",
    danger: "#b91c1c",
    dangerRing: "0 0 0 4px rgba(185, 28, 28, 0.12)",
  } as const;

  const btn = {
    primary: {
      padding: "10px 14px",
      borderRadius: 12,
      border: "1px solid rgba(37, 99, 235, 0.35)",
      background:
        "linear-gradient(180deg, rgba(37,99,235,0.18), rgba(37,99,235,0.06))",
      fontWeight: 900,
      cursor: "pointer",
      boxShadow: "0 10px 30px rgba(37,99,235,0.12)",
      color: ui.text,
    } as React.CSSProperties,
    neutral: {
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(15, 23, 42, 0.18)",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.75))",
      fontWeight: 900,
      cursor: "pointer",
      boxShadow: ui.smallShadow,
      color: ui.text,
    } as React.CSSProperties,
    danger: {
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(185, 28, 28, 0.35)",
      background:
        "linear-gradient(180deg, rgba(185,28,28,0.12), rgba(185,28,28,0.05))",
      fontWeight: 900,
      cursor: "pointer",
      color: ui.danger,
      boxShadow: "0 10px 25px rgba(185,28,28,0.08)",
      whiteSpace: "nowrap",
    } as React.CSSProperties,
    icon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      border: "1px solid rgba(15, 23, 42, 0.18)",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.75))",
      fontWeight: 900,
      cursor: "pointer",
      boxShadow: ui.smallShadow,
      color: ui.text,
    } as React.CSSProperties,
  } as const;

  const field = {
    label: {
      fontWeight: 900,
      fontSize: 12,
      letterSpacing: 0.2,
      color: ui.muted,
      textTransform: "uppercase",
    } as React.CSSProperties,
    input: {
      width: "100%",
      padding: 10,
      borderRadius: 12,
      border: "1px solid rgba(15, 23, 42, 0.16)",
      background: "rgba(255,255,255,0.95)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
      fontWeight: 900,
      color: ui.text,
      outline: "none",
    } as React.CSSProperties,
    select: {
      padding: 10,
      borderRadius: 12,
      border: "1px solid rgba(15, 23, 42, 0.16)",
      background: "rgba(255,255,255,0.95)",
      fontWeight: 900,
      color: ui.text,
      minWidth: 260,
      outline: "none",
    } as React.CSSProperties,
    helper: {
      fontSize: 12,
      color: ui.muted,
    } as React.CSSProperties,
  } as const;

  const card = {
    panel: {
      border: ui.panelBorder,
      borderRadius: 18,
      background: ui.panelBg,
      boxShadow: ui.softShadow,
      padding: 14,
      backdropFilter: "blur(10px)",
    } as React.CSSProperties,
    item: {
      border: "1px solid rgba(15, 23, 42, 0.10)",
      borderRadius: 16,
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.86))",
      boxShadow: ui.smallShadow,
      padding: 14,
    } as React.CSSProperties,
    headerBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: 14,
      borderRadius: 18,
      border: ui.panelBorder,
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.78))",
      boxShadow: ui.smallShadow,
      backdropFilter: "blur(10px)",
    } as React.CSSProperties,
  } as const;

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [markupPct, setMarkupPct] = useState(30);
  const [laborRate, setLaborRate] = useState(150);

  // $/sqft rate starts at 10, adjustable up/down
  const [sqFtRate, setSqFtRate] = useState(10);

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
        sqFtRate?: number;
      };

      if (saved.quantities) setQuantities(saved.quantities);
      if (typeof saved.markupPct === "number") setMarkupPct(saved.markupPct);
      if (saved.itemType) setItemType(saved.itemType);
      if (typeof saved.laborRate === "number") setLaborRate(saved.laborRate);
      if (typeof saved.sqFtRate === "number") setSqFtRate(saved.sqFtRate);
    } catch {
      // ignore bad data
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function saveDraft() {
    if (!projectId) return;

    const payload = {
      quantities,
      markupPct,
      itemType,
      laborRate,
      sqFtRate,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(draftKey, JSON.stringify(payload));
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
    const selectedIds = Object.entries(quantities)
      .filter(([, qty]) => (qty ?? 0) > 0)
      .map(([id]) => id);

    return selectedIds.length === 1 && selectedIds[0] === SQFT_ID;
  }, [quantities]);

  // Totals across ALL selected items (not filtered by subset)
  const materialTotal = ASSEMBLIES.reduce((sum, a) => {
    const qty = quantities[a.id] ?? 0;

    if (a.id === SQFT_ID) {
      return sum + qty * sqFtRate;
    }
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
    <main
      style={{
        padding: 22,
        maxWidth: 1120,
        margin: "0 auto",
        background: ui.pageBg,
        minHeight: "100vh",
        color: ui.text,
      }}
    >
      {/* Header Bar */}
      <div style={card.headerBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link
            href={`/projects/${projectId}`}
            style={{
              textDecoration: "none",
              color: ui.text,
              fontWeight: 900,
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid rgba(15, 23, 42, 0.10)",
              background: "rgba(255,255,255,0.7)",
            }}
          >
            ← Back
          </Link>

          <div>
            <div style={{ fontSize: 18, fontWeight: 950, letterSpacing: -0.2 }}>
              New Estimate
            </div>
            <div style={{ fontSize: 12, color: ui.muted, marginTop: 2 }}>
              {project?.customerName ?? "Unnamed Project"} •{" "}
              {project?.jobType ?? "Unknown"}
            </div>
          </div>
        </div>

        <button type="button" onClick={saveDraft} style={btn.primary}>
          Save Draft
        </button>
      </div>

      {/* Top Controls */}
      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 14,
        }}
      >
        <div style={card.panel}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 950, letterSpacing: -0.2 }}>Project</div>
              <div style={field.helper}>Customer + job type</div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 950 }}>
              {project?.customerName ?? "Unnamed Project"}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: ui.muted }}>
              Type: <strong style={{ color: ui.text }}>{project?.jobType ?? "Unknown"}</strong>
            </div>
          </div>
        </div>

        <div style={card.panel}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 950, letterSpacing: -0.2 }}>Item Types</div>
              <div style={field.helper}>Pick a template set</div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={field.label}>Item Types</label>
            <div style={{ marginTop: 8 }}>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value as ItemType)}
                style={field.select}
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
      </div>

      {/* TWO COLUMN LAYOUT */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 18,
          marginTop: 18,
        }}
      >
        {/* LEFT: Library */}
        <div style={card.panel}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 950, letterSpacing: -0.1 }}>
              Assemblies
            </h2>
            <div style={{ fontSize: 12, color: ui.muted }}>
              {visibleAssemblies.length} items
            </div>
          </div>

          <ul style={{ marginTop: 12, paddingLeft: 0, listStyle: "none" }}>
            {visibleAssemblies.map((a) => {
              const isSqFt = a.id === SQFT_ID;
              const materialDisplay = isSqFt ? sqFtRate : a.materialCost;

              return (
                <li key={a.id} style={{ ...card.item, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 950, letterSpacing: -0.15 }}>{a.name}</div>
                      {!isSqFt && (
                        <div style={{ fontSize: 12, color: ui.muted, marginTop: 4 }}>
                          Unit: {a.unit} • Material: ${materialDisplay.toFixed(2)} • Labor:{" "}
                          {a.laborHours} hrs
                        </div>
                      )}
                      {isSqFt && (
                        <div style={{ fontSize: 12, color: ui.muted, marginTop: 4 }}>
                          Quick bid by square footage (defaults to 1,500 sq ft)
                        </div>
                      )}
                    </div>

                    {!isSqFt && (
                      <button
                        type="button"
                        onClick={() =>
                          setQuantities({
                            ...quantities,
                            [a.id]: (quantities[a.id] ?? 0) + 1,
                          })
                        }
                        style={btn.neutral}
                      >
                        Add
                      </button>
                    )}
                  </div>

                  {/* SQ FT library controls */}
                  {isSqFt && (
                    <div
                      style={{
                        marginTop: 12,
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        gap: 12,
                        alignItems: "end",
                      }}
                    >
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ display: "grid", gap: 6 }}>
                          <label style={field.label}>Sq Ft</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1}
                            value={quantities[a.id] ?? 1500}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const value = raw === "" ? 0 : Number(raw);
                              setQuantities({ ...quantities, [a.id]: value });
                            }}
                            onFocus={() => {
                              if (!Object.prototype.hasOwnProperty.call(quantities, a.id)) {
                                setQuantities({ ...quantities, [a.id]: 1500 });
                              }
                            }}
                            style={field.input}
                            onBlur={(e) => {
                              // little polish: if NaN ever sneaks in, normalize
                              if (Number.isNaN(Number(e.target.value))) {
                                setQuantities({ ...quantities, [a.id]: 0 });
                              }
                            }}
                          />
                        </div>

                        <div style={{ display: "grid", gap: 6 }}>
                          <label style={field.label}>$ / Sq Ft</label>
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={0.25}
                            value={sqFtRate}
                            onChange={(e) => setSqFtRate(Number(e.target.value))}
                            style={field.input}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!Object.prototype.hasOwnProperty.call(quantities, a.id)) {
                            setQuantities({ ...quantities, [a.id]: 1500 });
                          }
                        }}
                        style={btn.neutral}
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

        {/* RIGHT: Selected + Totals */}
        <div style={card.panel}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 950, letterSpacing: -0.1 }}>
              Selected Items
            </h2>
            <div style={{ fontSize: 12, color: ui.muted }}>
              {Object.keys(quantities).length} tracked
            </div>
          </div>

          {(() => {
            const selected = ASSEMBLIES.map((a) => ({
              a,
              qty: quantities[a.id] ?? 0,
            })).filter((x) => {
              const hasKey = Object.prototype.hasOwnProperty.call(quantities, x.a.id);
              const isSqFt = x.a.id === SQFT_ID;
              if (!isSqFt) return x.qty > 0;
              return hasKey;
            });

            if (selected.length === 0) {
              return (
                <div
                  style={{
                    marginTop: 12,
                    padding: 14,
                    borderRadius: 14,
                    border: "1px dashed rgba(15, 23, 42, 0.20)",
                    color: ui.muted,
                  }}
                >
                  No items selected yet.
                </div>
              );
            }

            return (
              <ul style={{ marginTop: 12, paddingLeft: 0, listStyle: "none" }}>
                {selected.map(({ a, qty }) => {
                  const isSqFt = a.id === SQFT_ID;

                  return (
                    <li key={a.id} style={{ ...card.item, marginBottom: 12 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        {isSqFt ? (
                          <div style={{ flex: "1 1 280px" }}>
                            <div style={{ fontWeight: 950, letterSpacing: -0.15 }}>{a.name}</div>

                            <div
                              style={{
                                marginTop: 12,
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                gap: 12,
                                alignItems: "end",
                              }}
                            >
                              <div style={{ display: "grid", gap: 6 }}>
                                <label style={field.label}>Sq Ft</label>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  step={1}
                                  value={qty}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const value = raw === "" ? 0 : Number(raw);
                                    setQuantities({ ...quantities, [a.id]: value });
                                  }}
                                  style={field.input}
                                />
                              </div>

                              <div style={{ display: "grid", gap: 6 }}>
                                <label style={field.label}>$ / Sq Ft</label>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  min={0}
                                  step={0.25}
                                  value={sqFtRate}
                                  onChange={(e) => setSqFtRate(Number(e.target.value))}
                                  style={field.input}
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const next = { ...quantities };
                                  delete next[a.id];
                                  setQuantities(next);
                                }}
                                style={btn.danger}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ minWidth: 220 }}>
                              <div style={{ fontWeight: 950, letterSpacing: -0.15 }}>{a.name}</div>
                              <div style={{ fontSize: 12, color: ui.muted, marginTop: 4 }}>
                                Unit: {a.unit} • Material: ${a.materialCost.toFixed(2)} • Labor:{" "}
                                {a.laborHours} hrs
                              </div>
                              <div style={{ fontSize: 12, color: ui.muted, marginTop: 6 }}>
                                Ext Material: ${(qty * a.materialCost).toFixed(2)} • Ext Labor:{" "}
                                {(qty * a.laborHours).toFixed(2)} hrs
                              </div>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                flexWrap: "wrap",
                                justifyContent: "flex-end",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setQuantities({
                                    ...quantities,
                                    [a.id]: Math.max(0, (quantities[a.id] ?? 0) - 1),
                                  })
                                }
                                style={btn.icon}
                              >
                                –
                              </button>

                              <div
                                style={{
                                  minWidth: 40,
                                  textAlign: "center",
                                  fontWeight: 950,
                                  padding: "6px 10px",
                                  borderRadius: 12,
                                  border: "1px solid rgba(15, 23, 42, 0.10)",
                                  background: "rgba(255,255,255,0.75)",
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
                                style={btn.icon}
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
                                style={btn.danger}
                              >
                                Remove
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            );
          })()}

          {/* Totals */}
          <div
            style={{
              marginTop: 10,
              paddingTop: 12,
              borderTop: "1px solid rgba(15, 23, 42, 0.10)",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 950, letterSpacing: -0.1 }}>
                Totals
              </h2>
              <div style={{ fontSize: 12, color: ui.muted }}>Auto-calculated</div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {onlySqFtSelected ? (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(37,99,235,0.20)",
                    background:
                      "linear-gradient(180deg, rgba(37,99,235,0.10), rgba(37,99,235,0.04))",
                  }}
                >
                  <div style={{ fontSize: 12, color: ui.muted, fontWeight: 900, textTransform: "uppercase" }}>
                    Sq Ft Total
                  </div>
                  <div style={{ marginTop: 4, fontSize: 22, fontWeight: 950 }}>
                    ${materialTotal.toFixed(2)}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ color: ui.muted, fontWeight: 900 }}>Material</span>
                    <strong>${materialTotal.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ color: ui.muted, fontWeight: 900 }}>Labor Hours</span>
                    <strong>{laborHoursTotal.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ color: ui.muted, fontWeight: 900 }}>
                      Labor (@ ${laborRate}/hr)
                    </span>
                    <strong>${laborTotal.toFixed(2)}</strong>
                  </div>
                </>
              )}

              {!onlySqFtSelected && (
                <div
                  style={{
                    marginTop: 6,
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(15, 23, 42, 0.10)",
                    background: "rgba(255,255,255,0.70)",
                  }}
                >
                  <label style={field.label}>Labor Rate ($/hr)</label>
                  <div style={{ marginTop: 8, maxWidth: 240 }}>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={1}
                      value={laborRate}
                      onChange={(e) => setLaborRate(Number(e.target.value))}
                      style={field.input}
                    />
                  </div>
                </div>
              )}

              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(15, 23, 42, 0.10)",
                  background: "rgba(255,255,255,0.70)",
                }}
              >
                <label style={field.label}>Markup %</label>
                <div style={{ marginTop: 8, maxWidth: 240 }}>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={1}
                    value={markupPct}
                    onChange={(e) => setMarkupPct(Number(e.target.value))}
                    style={field.input}
                  />
                </div>
              </div>

              <div
                style={{
                  padding: 14,
                  borderRadius: 16,
                  border: "1px solid rgba(34, 197, 94, 0.22)",
                  background:
                    "linear-gradient(180deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))",
                }}
              >
                <div style={{ fontSize: 12, color: ui.muted, fontWeight: 900, textTransform: "uppercase" }}>
                  Price to Customer
                </div>
                <div style={{ marginTop: 4, fontSize: 26, fontWeight: 950 }}>
                  ${price.toFixed(2)}
                </div>
                <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: ui.muted, fontWeight: 900 }}>Gross Profit</span>
                  <strong>${grossProfit.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, color: ui.muted, fontSize: 12 }}>
            Next step: improve assemblies + add “What’s included” / notes per assembly.
          </div>
        </div>
      </div>
    </main>
  );
}