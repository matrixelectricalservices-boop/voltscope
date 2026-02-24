"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProjects, type Project } from "@/app/lib/projectStore";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    setProjects(getProjects());
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Projects</h1>

      <div style={{ marginTop: 12 }}>
        <Link href="/dashboard">← Back to Dashboard</Link>
      </div>

      <div style={{ marginTop: 20 }}>
        <Link href="/projects/new">+ New Project</Link>
      </div>

      <h2 style={{ marginTop: 24, fontSize: 18, fontWeight: 700 }}>
        Saved Projects
      </h2>

      {projects.length === 0 ? (
        <p style={{ marginTop: 10 }}>No projects yet.</p>
      ) : (
        <ul style={{ marginTop: 10, paddingLeft: 18 }}>
          {projects.map((p) => (
           <li key={p.id} style={{ marginBottom: 14 }}>
  <Link
    href={`/projects/${p.id}`}
    style={{ textDecoration: "none", color: "inherit" }}
  >
    <div style={{ fontWeight: 700 }}>{p.customerName}</div>
    <div>{p.address}</div>
    <div style={{ fontSize: 12, opacity: 0.8 }}>
      {p.jobType} • {new Date(p.createdAt).toLocaleString()}
    </div>
    {p.notes ? <div style={{ marginTop: 4 }}>{p.notes}</div> : null}
  </Link>
</li>
          ))}
        </ul>
      )}
    </main>
  );
}