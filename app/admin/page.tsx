"use client";

import { useEffect, useState, useRef } from "react";
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
  green:        "#059669",
  greenLight:   "#ECFDF5",
  red:          "#DC2626",
  redLight:     "#FEF2F2",
  amber:        "#D97706",
  border:       "#E4E7ED",
  divider:      "#F1F3F7",
  cardShadow:   "0 1px 3px rgba(15,23,42,0.06)",
  raisedShadow: "0 4px 16px rgba(15,23,42,0.10)",
  blueShadow:   "0 4px 14px rgba(37,99,235,0.30)",
} as const;

const FONT = {
  head: "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif",
  body: "'Inter', 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
} as const;

type Row = {
  id: string; item_key: string; item_name: string;
  unit: string; unit_cost: number; category: string;
  source: string; updated_at: string;
};

const CATS = ["all","equipment","wire","conduit","devices","boxes","fittings","consumables"];

function relTime(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d < 1) return "today";
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AdminPage() {
  const [rows,     setRows]     = useState<Row[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [updating, setUpdating] = useState(false);
  const [msg,      setMsg]      = useState<{ type: "success"|"error"; text: string } | null>(null);
  const [filter,   setFilter]   = useState("all");
  const [search,   setSearch]   = useState("");
  const [editId,   setEditId]   = useState<string | null>(null);
  const [editVal,  setEditVal]  = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);
  useEffect(() => { if (editId && inputRef.current) inputRef.current.focus(); }, [editId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("pricebook").select("*").order("category").order("item_name");
    setRows(data ?? []);
    setLoading(false);
  }

  async function handleUpdate() {
    setUpdating(true); setMsg(null);
    try {
      const res  = await fetch("/api/pricebook/update", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: "error", text: data.error ?? "Update failed" }); return; }
      setMsg({ type: "success", text: `✓ Updated ${data.updated} prices` });
      await load();
    } catch { setMsg({ type: "error", text: "Network error" }); }
    finally   { setUpdating(false); }
  }

  async function saveEdit(id: string) {
    const cost = parseFloat(editVal);
    if (!isFinite(cost) || cost <= 0) { setEditId(null); return; }
    await supabase.from("pricebook").update({ unit_cost: cost, source: "manual", updated_at: new Date().toISOString() }).eq("id", id);
    setRows(r => r.map(row => row.id === id ? { ...row, unit_cost: cost, source: "manual" } : row));
    setEditId(null);
  }

  function startEdit(row: Row) { setEditId(row.id); setEditVal(String(row.unit_cost)); }

  const filtered = rows
    .filter(r => filter === "all" || r.category === filter)
    .filter(r => !search || r.item_name.toLowerCase().includes(search.toLowerCase()));

  const lastUpdate = rows.length > 0 ? rows.reduce((a, b) => a.updated_at > b.updated_at ? a : b).updated_at : null;
  const manualCount = rows.filter(r => r.source === "manual").length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${DS.pageBg}; }
        .p { min-height: 100vh; background: ${DS.pageBg}; font-family: ${FONT.body}; color: ${DS.text1}; }
        .tb { height: 56px; background: ${DS.shell}; border-bottom: 1px solid ${DS.shellBorder}; display: flex; align-items: center; padding: 0 20px; gap: 12px; }
        .logo { font-family: ${FONT.head}; font-weight: 800; font-size: 16px; color: #fff; text-decoration: none; display: flex; align-items: center; gap: 8px; }
        .lm { width: 28px; height: 28px; border-radius: 8px; background: #0B0F1A; border: 1px solid rgba(37,99,235,0.4); display: flex; align-items: center; justify-content: center; }
        .badge { padding: 2px 8px; border-radius: 20px; background: rgba(217,119,6,0.15); border: 1px solid rgba(217,119,6,0.3); font-size: 11px; font-weight: 600; color: ${DS.amber}; font-family: ${FONT.head}; }
        .c { max-width: 1100px; margin: 0 auto; padding: 28px 16px 80px; }
        .hdr { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
        .title { font-family: ${FONT.head}; font-weight: 800; font-size: 22px; color: ${DS.text1}; letter-spacing: -0.4px; margin-bottom: 3px; }
        .sub { font-size: 13px; color: ${DS.text3}; }
        .btn-upd { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; border: none; cursor: pointer; background: linear-gradient(135deg, ${DS.blue} 0%, ${DS.blueDark} 100%); color: #fff; font-family: ${FONT.head}; font-weight: 700; font-size: 14px; box-shadow: ${DS.blueShadow}; transition: opacity 0.15s; white-space: nowrap; }
        .btn-upd:disabled { opacity: 0.55; cursor: not-allowed; }
        .spin { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .msg { padding: 10px 16px; border-radius: 10px; font-size: 13px; margin-bottom: 16px; }
        .msg.s { background: ${DS.greenLight}; border: 1px solid #A7F3D0; color: ${DS.green}; }
        .msg.e { background: ${DS.redLight};   border: 1px solid #FCA5A5; color: ${DS.red};   }
        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        .stat { background: ${DS.card}; border: 1px solid ${DS.border}; border-radius: 12px; padding: 14px 16px; box-shadow: ${DS.cardShadow}; }
        .sl { font-size: 11px; font-weight: 600; color: ${DS.text3}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; font-family: ${FONT.head}; }
        .sv { font-family: ${FONT.head}; font-weight: 800; font-size: 22px; color: ${DS.text1}; }
        .toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
        .srch { flex: 1; min-width: 180px; padding: 8px 12px 8px 32px; border-radius: 8px; border: 1.5px solid ${DS.border}; font-family: ${FONT.body}; font-size: 13px; color: ${DS.text1}; background: ${DS.card} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' viewBox='0 0 24 24'%3E%3Ccircle cx='11' cy='11' r='8' stroke='%2394A3B8' stroke-width='2'/%3E%3Cpath d='M21 21l-4.35-4.35' stroke='%2394A3B8' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat 10px center; outline: none; }
        .srch:focus { border-color: ${DS.blue}; }
        .fil { padding: 5px 12px; border-radius: 20px; border: 1px solid ${DS.border}; background: ${DS.card}; font-family: ${FONT.head}; font-weight: 600; font-size: 12px; color: ${DS.text2}; cursor: pointer; white-space: nowrap; }
        .fil.a { background: ${DS.blue}; color: #fff; border-color: ${DS.blue}; }
        .tw { background: ${DS.card}; border: 1px solid ${DS.border}; border-radius: 12px; box-shadow: ${DS.cardShadow}; overflow: hidden; }
        table { width: 100%; border-collapse: collapse; }
        th { padding: 9px 14px; font-family: ${FONT.head}; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; color: ${DS.text3}; background: ${DS.divider}; text-align: left; border-bottom: 1px solid ${DS.border}; }
        td { padding: 9px 14px; font-size: 13px; border-bottom: 1px solid ${DS.divider}; vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: #fafbfc; }
        .bc { display: inline-flex; padding: 2px 7px; border-radius: 20px; font-size: 10.5px; font-weight: 600; font-family: ${FONT.head}; background: ${DS.blueLight}; color: ${DS.blue}; border: 1px solid ${DS.blueMid}; }
        .mc { display: inline-flex; padding: 2px 7px; border-radius: 20px; font-size: 10.5px; font-weight: 600; font-family: ${FONT.head}; background: ${DS.greenLight}; color: ${DS.green}; border: 1px solid #A7F3D0; }
        .cost { font-family: ${FONT.mono}; font-weight: 600; color: ${DS.green}; font-size: 13px; }
        .src { font-size: 11px; color: ${DS.text3}; font-family: ${FONT.mono}; }
        .eb { padding: 4px 10px; border-radius: 6px; border: 1px solid ${DS.border}; background: transparent; color: ${DS.text2}; font-size: 11px; cursor: pointer; font-family: ${FONT.body}; }
        .eb:hover { border-color: ${DS.blue}; color: ${DS.blue}; }
        .ei { width: 80px; padding: 4px 8px; border-radius: 6px; border: 1.5px solid ${DS.blue}; font-family: ${FONT.mono}; font-size: 13px; color: ${DS.text1}; outline: none; background: ${DS.card}; }
        .sb { padding: 4px 10px; border-radius: 6px; border: none; background: ${DS.blue}; color: #fff; font-size: 11px; cursor: pointer; font-family: ${FONT.head}; font-weight: 600; margin-left: 4px; }
        .cb { padding: 4px 8px; border-radius: 6px; border: 1px solid ${DS.border}; background: transparent; color: ${DS.text3}; font-size: 11px; cursor: pointer; margin-left: 4px; }
        .empty { text-align: center; padding: 48px; color: ${DS.text3}; font-size: 13px; }
        @media (max-width: 700px) { .stats { grid-template-columns: 1fr 1fr; } .hm, .hm2 { display: none; } }
      `}</style>

      <div className="p">
        <nav className="tb">
          <a href="/dashboard" className="logo">
            <div className="lm">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <line x1="5" y1="17" x2="5" y2="9" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round"/>
                <line x1="15" y1="17" x2="15" y2="9" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round"/>
                <path d="M5 9 Q10 2 15 9" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            SparcBid
          </a>
          <span className="badge">Admin</span>
          <a href="/dashboard" style={{ marginLeft: "auto", color: "rgba(255,255,255,0.5)", fontSize: 13, textDecoration: "none" }}>← Dashboard</a>
        </nav>

        <div className="c">
          <div className="hdr">
            <div>
              <div className="title">Pricebook</div>
              <div className="sub">
                {lastUpdate ? `Last updated ${relTime(lastUpdate)} · ${manualCount} manual overrides` : "No prices yet — click Refresh Prices to populate"}
              </div>
            </div>
            <button className="btn-upd" onClick={handleUpdate} disabled={updating}>
              {updating ? <><div className="spin"/>Updating…</> : "⚡ Refresh Prices"}
            </button>
          </div>

          {msg && <div className={`msg ${msg.type === "success" ? "s" : "e"}`}>{msg.text}</div>}

          <div className="stats">
            <div className="stat"><div className="sl">Total Items</div><div className="sv">{rows.length}</div></div>
            <div className="stat"><div className="sl">Last Updated</div><div className="sv" style={{ fontSize: 15, paddingTop: 3 }}>{lastUpdate ? relTime(lastUpdate) : "—"}</div></div>
            <div className="stat"><div className="sl">Manual Edits</div><div className="sv">{manualCount}</div></div>
            <div className="stat"><div className="sl">Showing</div><div className="sv">{filtered.length}</div></div>
          </div>

          <div className="toolbar">
            <input className="srch" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} />
            {CATS.map(cat => (
              <button key={cat} className={`fil${filter === cat ? " a" : ""}`} onClick={() => setFilter(cat)}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          <div className="tw">
            {loading ? (
              <div className="empty">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="empty">{rows.length === 0 ? "No prices yet — click Refresh Prices." : "No items match your filter."}</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="hm">Category</th>
                    <th>Unit Cost</th>
                    <th className="hm2">Source</th>
                    <th className="hm2">Updated</th>
                    <th style={{ width: 120 }}>Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(row => (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 500 }}>{row.item_name}</td>
                      <td className="hm"><span className="bc">{row.category}</span></td>
                      <td>
                        {editId === row.id ? (
                          <>
                            <input ref={inputRef} className="ei" value={editVal}
                              onChange={e => setEditVal(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") saveEdit(row.id); if (e.key === "Escape") setEditId(null); }} />
                            <button className="sb" onClick={() => saveEdit(row.id)}>✓</button>
                            <button className="cb" onClick={() => setEditId(null)}>✕</button>
                          </>
                        ) : (
                          <span className="cost">${row.unit_cost.toFixed(2)}/{row.unit}</span>
                        )}
                      </td>
                      <td className="hm2">
                        <span className={row.source === "manual" ? "mc" : "src"}>
                          {row.source === "manual" ? "✎ manual" : row.source}
                        </span>
                      </td>
                      <td className="hm2"><span className="src">{relTime(row.updated_at)}</span></td>
                      <td>
                        {editId !== row.id && (
                          <button className="eb" onClick={() => startEdit(row)}>Edit price</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}