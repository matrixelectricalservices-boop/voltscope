"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getProjects } from "../../../../lib/projectStore";
import { ASSEMBLIES, MATERIAL_SUBSETS, type MaterialSubset } from "../../../../lib/assemblies";

export default function NewEstimatePage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id;

  const project = getProjects().find((p) => p.id === projectId);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [markupPct, setMarkupPct] = useState(30);
  const [laborRate, setLaborRate] = useState(150);

  // Material subset filter
  const [materialSubset, setMaterialSubset] = useState<MaterialSubset>("Panels");

  const draftKey = `voltscope:draft-estimate:${projectId ?? "unknown"}`;

  useEffect(() => {
    if (!projectId) return;

    const raw = localStorage.getItem(draftKey);
    if (!raw) return;

    try {
      const saved = JSON.parse(raw) as {
        quantities?: Record<string, number>;
        markupPct?: number;
        materialSubset?: MaterialSubset;
        laborRate?: number;
      };

      if (saved.quantities) setQuantities(saved.quantities);
      if (typeof saved.markupPct === "number") setMarkupPct(saved.markupPct);
      if (saved.materialSubset) setMaterialSubset(saved.materialSubset);
      if (typeof saved.laborRate === "number") setLaborRate(saved.laborRate);
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
      materialSubset,
      laborRate,
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(draftKey, JSON.stringify(payload));
  }

  const visibleAssemblies = useMemo(() => {
    return ASSEMBLIES.filter((a) => a.subset === materialSubset);
  }, [materialSubset]);

  // Totals across ALL selected items (not filtered by subset)
  const materialTotal = ASSEMBLIES.reduce((sum, a) => {
    const qty = quantities[a.id] ?? 0;
    return sum + qty * a.materialCost;
  }, 0);

  const laborHoursTotal = ASSEMBLIES.reduce((sum, a) => {
    const qty = quantities[a.id] ?? 0;
    return sum + qty * a.laborHours;
  }, 0);

  const laborTotal = laborHoursTotal * laborRate;
  const estimateTotal = materialTotal + laborTotal;
  const price = estimateTotal * (1 + markupPct / 100);
  const grossProfit = price - estimateTotal;

  return (
    <main style={{ padding: 24, maxWidth: 1100 }}>
      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
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

      {/* Material Subsets (with counts) */}
      <div style={{ marginTop: 16 }}>
        <label style={{ display: "block", fontWeight: 800, marginBottom: 6 }}>
          Material Subsets
        </label>

        <select
          value={materialSubset}
          onChange={(e) => setMaterialSubset(e.target.value as MaterialSubset)}
          style={{ padding: 10, borderRadius: 10, minWidth: 240 }}
        >
          {MATERIAL_SUBSETS.map((s) => {
            const count = ASSEMBLIES.reduce((acc, a) => {
              if (a.subset !== s) return acc;
              return acc + ((quantities[a.id] ?? 0) > 0 ? 1 : 0);
            }, 0);

            return (
              <option key={s} value={s}>
                {s} ({count})
              </option>
            );
          })}
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
>        {/* LEFT: Library */}
        <div>
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 800 }}>Assemblies</h2>

          <ul style={{ marginTop: 10, paddingLeft: 18 }}>
            {visibleAssemblies.map((a) => {
              return (
                <li key={a.id} style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 700 }}>{a.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    Unit: {a.unit} • Material: ${a.materialCost.toFixed(2)} • Labor: {a.laborHours} hrs
                  </div>

                  <div style={{ marginTop: 8 }}>
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
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* RIGHT: Selected + Totals */}
        <div>
          <h2 style={{ marginTop: 0, fontSize: 18, fontWeight: 800 }}>Selected Items</h2>

          {(() => {
            const selected = ASSEMBLIES.map((a) => ({
              a,
              qty: quantities[a.id] ?? 0,
            })).filter((x) => x.qty > 0);

            if (selected.length === 0) {
              return <p style={{ marginTop: 8, opacity: 0.8 }}>No items selected yet.</p>;
            }

            return (
              <ul style={{ marginTop: 10, paddingLeft: 0, listStyle: "none" }}>
                {selected.map(({ a, qty }) => {
                  const extMat = qty * a.materialCost;
                  const extHrs = qty * a.laborHours;

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
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 800 }}>{a.name}</div>
                          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                            Unit: {a.unit} • Material: ${a.materialCost.toFixed(2)} • Labor: {a.laborHours} hrs
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                            Ext Material: ${extMat.toFixed(2)} • Ext Labor: {extHrs.toFixed(2)} hrs
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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

                          <div style={{ minWidth: 32, textAlign: "center", fontWeight: 900 }}>
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
                      </div>
                    </li>
                  );
                })}
              </ul>
            );
          })()}

          <h2 style={{ marginTop: 18, fontSize: 18, fontWeight: 800 }}>Totals</h2>

          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            <div>
              Material: <strong>${materialTotal.toFixed(2)}</strong>
            </div>
            <div>
              Labor Hours: <strong>{laborHoursTotal.toFixed(2)}</strong>
            </div>
            <div>
              Labor (@ ${laborRate}/hr): <strong>${laborTotal.toFixed(2)}</strong>
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>
                Labor Rate ($/hr)
              </label>
              <input
                type="number"
                min={0}
                value={laborRate}
                onChange={(e) => setLaborRate(Number(e.target.value))}
                style={{ width: 140, padding: 6, borderRadius: 8 }}
              />
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>
                Markup %
              </label>
              <input
                type="number"
                min={0}
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
        Next step: add “What’s included” / notes per assembly + difficulty multiplier.
      </p>
    </main>
  );
}