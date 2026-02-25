"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { getProjects } from "@/app/lib/projectStore";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const project = getProjects().find((p) => p.id === id);

  if (!project) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Project not found</h1>
        <div style={{ marginTop: 16 }}>
          <Link href="/projects">← Back to Projects</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 800 }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/projects">← Back to Projects</Link>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800 }}>{project.customerName}</h1>
      <div style={{ marginTop: 8 }}>{project.address}</div>

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
        {project.jobType} • {new Date(project.createdAt).toLocaleString()}
      </div>

      {project.notes ? (
        <>
          <h2 style={{ marginTop: 24, fontSize: 18, fontWeight: 700 }}>Notes</h2>
          <p style={{ marginTop: 8 }}>{project.notes}</p>
        </>
      ) : null}

     <h2 style={{ marginTop: 28, fontSize: 18, fontWeight: 700 }}>Estimates</h2>

<div style={{ marginTop: 14 }}>
  <Link
    href={`/projects/${project.id}/estimates/new`}
    style={{
      display: "inline-block",
      padding: "10px 14px",
      borderRadius: 10,
      border: "1px solid #111",
      fontWeight: 700,
      textDecoration: "none",
      color: "inherit",
    }}
  >
    + Create Estimate
  </Link>
</div>

<p style={{ marginTop: 12, opacity: 0.8 }}>
  Next we’ll build the estimate builder (assemblies + quantities + totals).
</p>
    </main>
  );
}