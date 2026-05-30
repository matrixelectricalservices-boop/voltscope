"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabase";

const DS = {
  shell:        "#0B0F1A",
  shellBorder:  "rgba(255,255,255,0.07)",
  pageBg:       "#F4F6F9",
  card:         "#FFFFFF",
  text1:        "#0F172A",
  text2:        "#475569",
  text3:        "#94A3B8",
  blue:         "#2563EB",
  blueDark:     "#1D4ED8",
  blueLight:    "#EFF6FF",
  blueMid:      "#DBEAFE",
  amber:        "#D97706",
  amberLight:   "#FFFBEB",
  green:        "#059669",
  greenLight:   "#ECFDF5",
  red:          "#DC2626",
  redLight:     "#FEF2F2",
  border:       "#E4E7ED",
  divider:      "#F1F3F7",
  cardShadow:   "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
  raisedShadow: "0 4px 16px rgba(15,23,42,0.10), 0 2px 6px rgba(15,23,42,0.06)",
  blueShadow:   "0 4px 14px rgba(37,99,235,0.30)",
} as const;

const FONT = {
  head: "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif",
  body: "'Inter', 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
} as const;

const R = { sm: 8, md: 10, lg: 12, xl: 16 } as const;

type EstimateRow = {
  id:            string;
  description:   string;
  finalTotal:    number;
  scopeType:     string;
  sqft:          number | null;
  savedAt:       string;
  customerId:    string;
  customerName:  string;
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function relativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  <  7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<EstimateRow[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("estimates")
        .select("id, description, final_total, scope_type, sqft, saved_at, customer_id, customers(customer_name)")
        .order("saved_at", { ascending: false });

      if (error) { console.error(error); setLoading(false); return; }

      setEstimates((data ?? []).map((e: any) => ({
        id:           e.id,
        description:  e.description,
        finalTotal:   e.final_total,
        scopeType:    e.scope_type,
        sqft:         e.sqft,
        savedAt:      e.saved_at,
        customerId:   e.customer_id,
        customerName: e.customers?.customer_name ?? "Unknown",
      })));
      setLoading(false);
    }
    load();
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${DS.pageBg}; }
        .vs-page { min-height: 100vh; background: ${DS.pageBg}; font-family: ${FONT.body}; color: ${DS.text1}; }
        .vs-topbar { position: sticky; top: 0; z-index: 100; height: 56px; background: ${DS.shell}; border-bottom: 1px solid ${DS.shellBorder}; display: flex; align-items: center; padding: 0 16px; gap: 0; overflow: hidden; }
        .vs-logo { font-family: ${FONT.head}; font-weight: 800; font-size: 16px; color: #fff; letter-spacing: -0.3px; display: flex; align-items: center; gap: 8px; text-decoration: none; flex-shrink: 0; }
        .vs-logo-name { color: #fff; }
        .vs-logo-name span { color: #2563EB; }
        .vs-logo-mark { width: 30px; height: 30px; border-radius: ${R.md}px; background: #0B0F1A; border: 1px solid rgba(37,99,235,0.4); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .vs-topbar-divider { width: 1px; height: 20px; background: ${DS.shellBorder}; margin: 0 12px; flex-shrink: 0; }
        .vs-topbar-nav { display: flex; align-items: center; gap: 2px; flex: 1; min-width: 0; }
        .vs-nav-link { font-family: ${FONT.body}; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.50); text-decoration: none; padding: 5px 8px; border-radius: ${R.sm}px; transition: background 0.15s, color 0.15s; white-space: nowrap; }
        .vs-nav-link:hover  { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.85); }
        .vs-nav-link.active { color: rgba(255,255,255,0.90); background: rgba(255,255,255,0.08); }
        .vs-content { max-width: 860px; margin: 0 auto; padding: 24px 16px 60px; }
        .vs-page-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .vs-page-title { font-family: ${FONT.head}; font-weight: 800; font-size: 22px; color: ${DS.text1}; letter-spacing: -0.4px; margin-bottom: 2px; }
        .vs-page-sub { font-size: 13px; color: ${DS.text3}; }
        .vs-list { display: flex; flex-direction: column; gap: 10px; }
        .vs-card { background: ${DS.card}; border: 1px solid ${DS.border}; border-radius: ${R.xl}px; box-shadow: ${DS.cardShadow}; overflow: hidden; transition: box-shadow 0.15s, border-color 0.15s; text-decoration: none; display: block; }
        .vs-card:hover { box-shadow: ${DS.raisedShadow}; border-color: ${DS.blueMid}; }
        .vs-card-row { display: flex; align-items: center; padding: 14px 16px; gap: 12px; }
        .vs-card-icon { width: 40px; height: 40px; border-radius: ${R.md}px; flex-shrink: 0; background: ${DS.greenLight}; border: 1px solid #A7F3D0; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .vs-card-info { flex: 1; min-width: 0; }
        .vs-card-desc { font-family: ${FONT.head}; font-weight: 600; font-size: 14px; color: ${DS.text1}; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .vs-card-customer { font-size: 12px; color: ${DS.text2}; margin-bottom: 5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .vs-card-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .vs-total { font-family: ${FONT.mono}; font-size: 13px; font-weight: 600; color: ${DS.green}; }
        .vs-time { font-size: 11px; color: ${DS.text3}; font-family: ${FONT.mono}; }
        .vs-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-family: ${FONT.head}; font-weight: 600; font-size: 10.5px; white-space: nowrap; }
        .vs-badge-gray  { background: ${DS.divider}; color: ${DS.text3}; border: 1px solid ${DS.border}; }
        .vs-badge-blue  { background: ${DS.blueLight}; color: ${DS.blue}; border: 1px solid ${DS.blueMid}; }
        .vs-card-arrow { font-size: 16px; color: ${DS.text3}; flex-shrink: 0; }
        .vs-empty { text-align: center; padding: 56px 20px; background: ${DS.card}; border: 1px dashed ${DS.border}; border-radius: ${R.xl}px; }
        .vs-empty-icon { font-size: 36px; margin-bottom: 12px; }
        .vs-empty-title { font-family: ${FONT.head}; font-weight: 700; font-size: 15px; color: ${DS.text1}; margin-bottom: 6px; }
        .vs-empty-sub { font-size: 13px; color: ${DS.text3}; }
        @media (max-width: 600px) { .vs-card-row { padding: 12px 14px; } }
      `}</style>

      <div className="vs-page">
        <nav className="vs-topbar">
          <a href="/" className="vs-logo">
            <div className="vs-logo-mark">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <line x1="5" y1="17" x2="5" y2="9" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="15" y1="17" x2="15" y2="9" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M5 9 Q10 2 15 9" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="8" cy="6" r="1.2" fill="#93c5fd"/>
                <circle cx="12" cy="6" r="1.2" fill="#93c5fd"/>
              </svg>
            </div>
            <span className="vs-logo-name">Sparc<span>Bid</span></span>
          </a>
          <div className="vs-topbar-divider" />
          <div className="vs-topbar-nav">
            <a href="/dashboard" className="vs-nav-link">Dashboard</a>
            <a href="/projects"  className="vs-nav-link">Customers</a>
            <a href="/estimates" className="vs-nav-link active">Estimates</a>
          </div>
        </nav>

        <div className="vs-content">
          <div className="vs-page-header">
            <div>
              <div className="vs-page-title">Estimates</div>
              <div className="vs-page-sub">
                {loading ? "Loading…" : `${estimates.length} estimate${estimates.length !== 1 ? "s" : ""} · most recent first`}
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: DS.text3, fontSize: 13 }}>Loading…</div>
          ) : estimates.length === 0 ? (
            <div className="vs-empty">
              <div className="vs-empty-icon">📋</div>
              <div className="vs-empty-title">No estimates yet</div>
              <div className="vs-empty-sub">Generate your first estimate from a customer page.</div>
            </div>
          ) : (
            <div className="vs-list">
              {estimates.map((e) => (
                <Link key={e.id} href={`/projects/${e.customerId}/estimates/new?load=${e.id}`} className="vs-card">
                  <div className="vs-card-row">
                    <div className="vs-card-icon">📄</div>
                    <div className="vs-card-info">
                      <div className="vs-card-desc">{e.description || "Electrical estimate"}</div>
                      <div className="vs-card-customer">📋 {e.customerName}</div>
                      <div className="vs-card-meta">
                        <span className="vs-total">${fmt(e.finalTotal)}</span>
                        <span className="vs-badge vs-badge-gray">{e.scopeType === "assembly" ? "Assembly" : "Line Item"}</span>
                        {e.sqft && <span className="vs-badge vs-badge-blue">{e.sqft.toLocaleString()} sq ft</span>}
                        <span className="vs-time">{relativeTime(e.savedAt)}</span>
                      </div>
                    </div>
                    <div className="vs-card-arrow">→</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}