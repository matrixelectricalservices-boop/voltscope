import Link from "next/link";

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 32, fontWeight: 800 }}>Electrical Estimator MVP</h1>
      <p style={{ marginTop: 8 }}>
        If you can see this, edits are hot-reloading correctly.
      </p>

      <div style={{ marginTop: 16 }}>
        <Link href="/dashboard">Go to Dashboard</Link>
      </div>
    </main>
  );
}