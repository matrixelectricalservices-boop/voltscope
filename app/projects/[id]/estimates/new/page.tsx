"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ASSEMBLIES } from "@/app/lib/assemblies";
export default function NewEstimatePage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id;
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ marginBottom: 16 }}>
        <Link href={`/projects/${projectId}`}>← Back to Project</Link>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800 }}>New Estimate</h1>
      <p style={{ marginTop: 8 }}>
        Project ID: <code>{projectId}</code>
      </p>
<h2 style={{ marginTop: 24, fontSize: 18, fontWeight: 800 }}>Assemblies</h2>
<ul style={{ marginTop: 10, paddingLeft: 18 }}>
  {ASSEMBLIES.map((a) => {
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

      <p style={{ marginTop: 16 }}>
        Next step: add line items (assemblies), quantities, and totals.
      </p>
    </main>
  );
}