"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getProjects } from "../../../../lib/projectStore";
import {
  ESTIMATE_TYPES,
  ALLOWED_ASSEMBLY_IDS,
  type EstimateType,
} from "../../../../lib/estimateTypes";
import {
  ASSEMBLIES,
  MATERIAL_SUBSETS,
  type MaterialSubset,
} from "../../../../lib/assemblies";

export default function NewEstimatePage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id;

  const project = getProjects().find((p) => p.id === projectId);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [markupPct, setMarkupPct] = useState(30);

  // Existing job-type filter (your old “estimate type” system)
  const [estimateType, setEstimateType] = useState<EstimateType>(
    project?.jobType ?? "Residential"
  );

  // NEW: Material subset filter
  const [materialSubset, setMaterialSubset] =
    useState<MaterialSubset>("Panels");

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
    };

    if (saved.quantities) setQuantities(saved.quantities);
    if (typeof saved.markupPct === "number") setMarkupPct(saved.markupPct);
    if (saved.materialSubset) setMaterialSubset(saved.materialSubset);
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
    savedAt: new Date().toISOString(),
  };

  localStorage.setItem(draftKey, JSON.stringify(payload));
}

  const visibleAssemblies = useMemo(() => {
  return ASSEMBLIES.filter((a) => a.subset === materialSubset);
}, [materialSubset]);

  const materialTotal =ASSEMBLIES.reduce((sum, a) => {
    const qty = quantities[a.id] ?? 0;
    return sum + qty * a.materialCost;
  }, 0);

  const laborHoursTotal = ASSEMBLIES.reduce((sum, a) => {
    const qty = quantities[a.id] ?? 0;
    return sum + qty * a.laborHours;
  }, 0);

  const laborRate = 95;
  const laborTotal = laborHoursTotal * laborRate;

  const estimateTotal = materialTotal + laborTotal;
  const price = estimateTotal * (1 + markupPct / 100);
  const grossProfit = price - estimateTotal;

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
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

      {/* Old selector (job type / estimate type) */}
      

      {/* NEW selector (material subsets) */}
     {/* Material Subsets */}
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

      <h2 style={{ marginTop: 24, fontSize: 18, fontWeight: 800 }}>
        Assemblies
      </h2>

      <ul style={{ marginTop: 10, paddingLeft: 18 }}>
        {visibleAssemblies.map((a) => {
          const qty = quantities[a.id] ?? 0;

          return (
            <li key={a.id} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700 }}>{a.name}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Unit: {a.unit} • Material: ${a.materialCost.toFixed(2)} • Labor:{" "}
                {a.laborHours} hrs
              </div>

              <div style={{ marginTop: 6 }}>
                <input
                  type="number"
                  min={0}
                  value={qty}
                  onChange={(e) =>
                    setQuantities({
                      ...quantities,
                      [a.id]: Number(e.target.value),
                    })
                  }
                  style={{ width: 80, padding: 6 }}
                />
              </div>
            </li>
          );
        })}
      </ul>

    

      {/* Selected Items */}
      <h2 style={{ marginTop: 28, fontSize: 18, fontWeight: 800 }}>
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
          <ul style={{ marginTop: 10, paddingLeft: 18 }}>
            {selected.map(({ a, qty }) => {
              const extMat = qty * a.materialCost;
              const extHrs = qty * a.laborHours;
              return (
                <li key={a.id} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 800 }}>
                    {a.name} — <span style={{ fontWeight: 700 }}>{qty}</span>{" "}
                    {a.unit}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    Material: ${extMat.toFixed(2)} • Labor: {extHrs.toFixed(2)}{" "}
                    hrs
                  </div>
                </li>
              );
            })}
          </ul>
        );
      })()}

      <h2 style={{ marginTop: 28, fontSize: 18, fontWeight: 800 }}>Totals</h2>

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
            Markup %
          </label>
          <input
            type="number"
            min={0}
            value={markupPct}
            onChange={(e) => setMarkupPct(Number(e.target.value))}
            style={{ width: 120, padding: 6, borderRadius: 8 }}
          />
        </div>

        <div style={{ marginTop: 6, fontSize: 18 }}>
          Price to Customer: <strong>${price.toFixed(2)}</strong>
        </div>
        <div>
          Gross Profit: <strong>${grossProfit.toFixed(2)}</strong>
        </div>
      </div>

      <p style={{ marginTop: 16 }}>
        Next step: add line items (assemblies), quantities, and totals.
      </p>
    </main>
  );
}