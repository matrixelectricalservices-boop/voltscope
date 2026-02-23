import Link from "next/link";

export default function ProjectsPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Projects</h1>

      <div style={{ marginTop: 12 }}>
        <Link href="/dashboard">← Back to Dashboard</Link>
      </div>

      <p style={{ marginTop: 16 }}>
        This will list projects (customers + estimates).
      </p>

      <div style={{ marginTop: 20 }}>
        <Link href="/projects/new">+ New Project</Link>
      </div>
    </main>
  );
}