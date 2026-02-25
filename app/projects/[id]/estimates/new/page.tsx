"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function NewEstimatePage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id;

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ marginBottom: 16 }}>
        <Link href={`/projects/${projectId}`}>← Back to Project</Link>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800 }}>New Estimate</h1>
      <p style={{ marginTop: 8 }}>
        Project ID: <code>{projectId}</code>
      </p>

      <p style={{ marginTop: 16 }}>
        Next step: add line items (assemblies), quantities, and totals.
      </p>
    </main>
  );
}