"use client";
import { getProjects } from "../../../../lib/projectStore";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ASSEMBLIES } from "@/app/lib/assemblies";
import { ESTIMATE_TYPES, ALLOWED_ASSEMBLY_IDS, type EstimateType } from "../../../../lib/estimateTypes";
export default function NewEstimatePage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id;
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [markupPct, setMarkupPct] = useState(30);
const project = getProjects().find((p) => p.id === projectId);
const [estimateType, setEstimateType] = useState<EstimateType>(project?.jobType ?? "Residential");

  const allowedIds = new Set(ALLOWED_ASSEMBLY_IDS[estimateType]);
const visibleAssemblies = ASSEMBLIES.filter((a) => allowedIds.has(a.id));
  const materialTotal = ASSEMBLIES.reduce((sum, a) => {
  const qty = quantities[a.id] ?? 0;
  return sum + qty * a.materialCost;
}, 0);

const laborHoursTotal = ASSEMBLIES.reduce((sum, a) => {
  const qty = quantities[a.id] ?? 0;
  return sum + qty * a.laborHours;
}, 0);

const laborRate = 95; // change later (settings)
const laborTotal = laborHoursTotal * laborRate;

const estimateTotal = materialTotal + laborTotal;
const price = estimateTotal * (1 + markupPct / 100);
const grossProfit = price - estimateTotal;
  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ marginBottom: 16 }}>
        <Link href={`/projects/${projectId}`}>← Back to Project</Link>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800 }}>New Estimate</h1>
      <p style={{ marginTop: 8 }}>
        Project ID: <code>{projectId}</code>
      </p>
<div style={{ marginTop: 16 }}>
  <label style={{ display: "block", fontWeight: 800, marginBottom: 6 }}>
    Material Subsets
  </label>
  <select
    value={estimateType}
    onChange={(e) => setEstimateType(e.target.value as EstimateType)}
    style={{ padding: 10, borderRadius: 10, minWidth: 240 }}
  >
    {ESTIMATE_TYPES.map((t) => (
      <option key={t.id} value={t.id}>
        {t.label}
      </option>
    ))}
  </select>
</div>

<h2 style={{ marginTop: 24, fontSize: 18, fontWeight: 800 }}>Assemblies</h2>
<ul style={{ marginTop: 10, paddingLeft: 18 }}>
  {visibleAssemblies.map((a) => {
    const qty = quantities[a.id] ?? 0;

    return (
      <li key={a.id} style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700 }}>{a.name}</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Unit: {a.unit} • Material: ${a.materialCost.toFixed(2)} • Labor: {a.laborHours} hrs
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

{/* Quick subset jump + counts */}
<div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 8 }}>
  {ESTIMATE_TYPES.map((t) => {
    const ids = ALLOWED_ASSEMBLY_IDS[t.id];
    const count = ids.reduce((acc, id) => acc + ((quantities[id] ?? 0) > 0 ? 1 : 0), 0);

    return (
      <button
        key={t.id}
        type="button"
        onClick={() => setEstimateType(t.id)}
        style={{
          padding: "6px 10px",
          borderRadius: 999,
          border: "1px solid #111",
          fontWeight: 700,
          cursor: "pointer",
          opacity: count > 0 || t.id === estimateType ? 1 : 0.6,
        }}
      >
        {t.label} ({count})
      </button>
    );
  })}
</div>
{/* Selected Items (across all subsets) */}
<h2 style={{ marginTop: 28, fontSize: 18, fontWeight: 800 }}>Selected Items</h2>

{(() => {
  const selected = ASSEMBLIES
    .map((a) => ({ a, qty: quantities[a.id] ?? 0 }))
    .filter((x) => x.qty > 0);

  if (selected.length === 0) {
    return <p style={{ marginTop: 8, opacity: 0.8 }}>No items selected yet.</p>;
  }

  return (
    <ul style={{ marginTop: 10, paddingLeft: 18 }}>
      {selected.map(({ a, qty }) => {
        const extMat = qty * a.materialCost;
        const extHrs = qty * a.laborHours;
        return (
          <li key={a.id} style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 800 }}>
              {a.name} — <span style={{ fontWeight: 700 }}>{qty}</span> {a.unit}
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Material: ${extMat.toFixed(2)} • Labor: {extHrs.toFixed(2)} hrs
            </div>
          </li>
        );
      })}
    </ul>
  );
})()}
<h2 style={{ marginTop: 28, fontSize: 18, fontWeight: 800 }}>Totals</h2>

<div style={{ marginTop: 10, display: "grid", gap: 6 }}>
  <div>Material: <strong>${materialTotal.toFixed(2)}</strong></div>
  <div>Labor Hours: <strong>{laborHoursTotal.toFixed(2)}</strong></div>
  <div>Labor (@ ${laborRate}/hr): <strong>${laborTotal.toFixed(2)}</strong></div>
  <div style={{ marginTop: 6, fontSize: 18 }}>
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
    Estimate Total: <div style={{ marginTop: 6, fontSize: 18 }}>
  Price to Customer: <strong>${price.toFixed(2)}</strong>
</div>
<div>
  Gross Profit: <strong>${grossProfit.toFixed(2)}</strong>
</div>
  </div>
</div>

      <p style={{ marginTop: 16 }}>
        Next step: add line items (assemblies), quantities, and totals.
      </p>
    </main>
  );
}