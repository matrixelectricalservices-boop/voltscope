import Link from "next/link";

export default function DashboardPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Dashboard</h1>
      <p style={{ marginTop: 8 }}>
        Next we build Projects → Estimates → Line Items.
      </p>

      <div style={{ marginTop: 20 }}>
        <Link href="/projects">Go to Projects</Link>
      </div>
    </main>
  );
}