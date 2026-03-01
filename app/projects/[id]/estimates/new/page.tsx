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
    return QUICK_BID_IDS
      .map((id) => ASSEMBLIES.find((a) => a.id === id))
      .filter((a): a is (typeof ASSEMBLIES)[number] => Boolean(a));
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
    <main style={{ padding: 24, maxWidth: 1100 }}>
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <Link href={`/projects/${projectId}`}>← Back to Project</Link>

        <button
          type="button"
          onClick={saveDraft}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #111",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Save
        </button>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800 }}>New Estimate</h1>

      <div
        style={{
          marginTop: 12,
          padding: 14,
          border: "1px solid #ddd",
          borderRadius: 12,
          background: "#f9f9f9",
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 800 }}>
          {project?.customerName ?? "Unnamed Project"}
        </div>

        <div style={{ marginTop: 4, fontSize: 14, opacity: 0.85 }}>
          Type: <strong>{project?.jobType ?? "Unknown"}</strong>
        </div>
      </div>

      {/* Item Types */}
      <div style={{ marginTop: 16 }}>
        <label style={{ display: "block", fontWeight: 800, marginBottom: 6 }}>
          Item Types
        </label>

        <select
          value={itemType}
          onChange={(e) => setItemType(e.target.value as ItemType)}
          style={{ padding: 10, borderRadius: 10, minWidth: 240 }}
        >
          {ITEM_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
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
        <div>
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 800 }}>
            Assemblies
          </h2>

          <ul style={{ marginTop: 10, paddingLeft: 18 }}>
            {visibleAssemblies.map((a) => {
              const isSqFt = a.id === SQFT_ID;
              const materialDisplay = isSqFt ? sqFtRate : a.materialCost;

              return (
                <li key={a.id} style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 700 }}>{a.name}</div>

                  {/* Hide the noisy detail line for the sq-ft assembly */}
                  {!isSqFt && (
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      Unit: {a.unit} • Material: ${materialDisplay.toFixed(2)} •
                      Labor: {a.laborHours} hrs
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setQuantities({
                          ...quantities,
                          [a.id]: (quantities[a.id] ?? 0) + 1,
                        })
                      }
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid #111",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      Add
                    </button>

                    {isSqFt && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{ fontSize: 12, fontWeight: 800, opacity: 0.85 }}
                        >
                          $ / Sq Ft
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step={0.25}
                          min={0}
                          value={sqFtRate}
                          onChange={(e) => setSqFtRate(Number(e.target.value))}
                          style={{
                            width: 90,
                            padding: 6,
                            borderRadius: 8,
                            textAlign: "center",
                            fontWeight: 900,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* RIGHT: Selected + Totals */}
        <div>
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 800 }}>
            Selected Items
          </h2>

          {(() => {
            const selected = ASSEMBLIES.map((a) => ({
              a,
              qty: quantities[a.id] ?? 0,
            })).filter((x) => x.qty > 0);

            if (selected.length === 0) {
              return (
                <p style={{ marginTop: 8, opacity: 0.8 }}>
                  No items selected yet.
                </p>
              );
            }

            return (
              <ul style={{ marginTop: 10, paddingLeft: 0, listStyle: "none" }}>
                {selected.map(({ a, qty }) => {
                  const isSqFt = a.id === SQFT_ID;

                  return (
                    <li
                      key={a.id}
                      style={{
                        marginBottom: 12,
                        padding: 10,
                        border: "1px solid #ddd",
                        borderRadius: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        {/* SQ FT ITEM: ONLY inputs + remove (responsive grid) */}
                        {isSqFt ? (
                          <div style={{ minWidth: 260, flex: "1 1 260px" }}>
                            <div style={{ fontWeight: 800 }}>{a.name}</div>

                            <div
                              style={{
                                marginTop: 10,
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(220px, 1fr))",
                                gap: 12,
                                alignItems: "end",
                              }}
                            >
                              <div style={{ display: "grid", gap: 6 }}>
                                <label
                                  style={{
                                    fontWeight: 800,
                                    fontSize: 12,
                                    opacity: 0.85,
                                  }}
                                >
                                  Sq Ft
                                </label>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  step={1}
                                  value={qty}
                                  onChange={(e) =>
                                    setQuantities({
                                      ...quantities,
                                      [a.id]: Number(e.target.value),
                                    })
                                  }
                                  style={{
                                    width: "100%",
                                    maxWidth: 240,
                                    padding: 8,
                                    borderRadius: 10,
                                    textAlign: "center",
                                    fontWeight: 900,
                                  }}
                                />
                              </div>

                              <div style={{ display: "grid", gap: 6 }}>
                                <label
                                  style={{
                                    fontWeight: 800,
                                    fontSize: 12,
                                    opacity: 0.85,
                                  }}
                                >
                                  $ / Sq Ft
                                </label>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  min={0}
                                  step={0.25}
                                  value={sqFtRate}
                                  onChange={(e) => setSqFtRate(Number(e.target.value))}
                                  style={{
                                    width: "100%",
                                    maxWidth: 240,
                                    padding: 8,
                                    borderRadius: 10,
                                    textAlign: "center",
                                    fontWeight: 900,
                                  }}
                                />
                              </div>

                              <div style={{ display: "flex", alignItems: "end" }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = { ...quantities };
                                    delete next[a.id];
                                    setQuantities(next);
                                  }}
                                  style={{
                                    width: "100%",
                                    maxWidth: 240,
                                    padding: "8px 10px",
                                    borderRadius: 10,
                                    border: "1px solid #b91c1c",
                                    color: "#b91c1c",
                                    fontWeight: 900,
                                    cursor: "pointer",
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* NORMAL ITEMS */
                          <>
                            <div style={{ minWidth: 220 }}>
                              <div style={{ fontWeight: 800 }}>{a.name}</div>

                              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                                Unit: {a.unit} • Material: ${a.materialCost.toFixed(2)} •
                                Labor: {a.laborHours} hrs
                              </div>

                              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                                Ext Material: ${(qty * a.materialCost).toFixed(2)} • Ext
                                Labor: {(qty * a.laborHours).toFixed(2)} hrs
                              </div>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
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
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 10,
                                  border: "1px solid #111",
                                  fontWeight: 900,
                                  cursor: "pointer",
                                }}
                              >
                                –
                              </button>

                              <div
                                style={{
                                  minWidth: 32,
                                  textAlign: "center",
                                  fontWeight: 900,
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
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 10,
                                  border: "1px solid #111",
                                  fontWeight: 900,
                                  cursor: "pointer",
                                }}
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
                                style={{
                                  marginLeft: 6,
                                  padding: "8px 10px",
                                  borderRadius: 10,
                                  border: "1px solid #b91c1c",
                                  color: "#b91c1c",
                                  fontWeight: 900,
                                  cursor: "pointer",
                                }}
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

          <h2 style={{ marginTop: 18, fontSize: 18, fontWeight: 800 }}>
            Totals
          </h2>

          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            {onlySqFtSelected ? (
              <div style={{ fontSize: 16 }}>
                Sq Ft Total: <strong>${materialTotal.toFixed(2)}</strong>
              </div>
            ) : (
              <>
                <div>
                  Material: <strong>${materialTotal.toFixed(2)}</strong>
                </div>
                <div>
                  Labor Hours: <strong>{laborHoursTotal.toFixed(2)}</strong>
                </div>
                <div>
                  Labor (@ ${laborRate}/hr):{" "}
                  <strong>${laborTotal.toFixed(2)}</strong>
                </div>
              </>
            )}

            {!onlySqFtSelected && (
              <div style={{ marginTop: 10 }}>
                <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>
                  Labor Rate ($/hr)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={1}
                  value={laborRate}
                  onChange={(e) => setLaborRate(Number(e.target.value))}
                  style={{ width: 140, padding: 6, borderRadius: 8 }}
                />
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>
                Markup %
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={1}
                value={markupPct}
                onChange={(e) => setMarkupPct(Number(e.target.value))}
                style={{ width: 140, padding: 6, borderRadius: 8 }}
              />
            </div>

            <div style={{ marginTop: 6, fontSize: 18 }}>
              Price to Customer: <strong>${price.toFixed(2)}</strong>
            </div>
            <div>
              Gross Profit: <strong>${grossProfit.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>

      <p style={{ marginTop: 16, opacity: 0.8 }}>
        Next step: improve assemblies + add “What’s included” / notes per assembly.
      </p>
    </main>
  );
}