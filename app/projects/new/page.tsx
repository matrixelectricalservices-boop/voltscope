"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addProject } from "@/app/lib/projectStore";
import { ESTIMATE_TYPES } from "@/app/lib/estimateTypes";

export default function NewProjectPage() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [jobType, setJobType] = useState("Service");
  const [notes, setNotes] = useState("");

 function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  addProject({
    customerName,
    address,
    jobType,
    notes,
  });

  router.push("/projects");
}
  return (
    <main style={{ padding: 24, maxWidth: 700 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>New Project</h1>
      <div style={{ marginTop: 12 }}>
  <Link href="/dashboard">← Back to Dashboard</Link>
</div>
      <p style={{ marginTop: 8 }}>
        This is local-only for now. Next we’ll save to the database.
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: 20, display: "grid", gap: 12 }}>
        <label>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Customer name</div>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="John Smith"
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
            required
          />
        </label>

        <label>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Address</div>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="4308 Watson Ave"
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
            required
          />
        </label>

        <label>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Job type</div>
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          >
            {ESTIMATE_TYPES.map((t) => (
  <option key={t.id} value={t.id}>
    {t.label}
  </option>
))}
          </select>
        </label>

        <label>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Notes</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any job notes..."
            rows={4}
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
        </label>

        <button
          type="submit"
          style={{
            marginTop: 6,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #111",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Create Project
        </button>
      </form>
    </main>
  );
}