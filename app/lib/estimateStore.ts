// app/lib/estimateStore.ts
// Saves estimate summaries per project to localStorage.
// Each project can have multiple saved estimates.
// When you add a database later, only this file needs to change.

export type SavedEstimate = {
  id:          string;
  projectId:   string;
  savedAt:     string;  // ISO string
  description: string;  // job description (summary shown in list)
  finalTotal:  number;
  laborHours:  number;
  laborTotal:  number;
  materialTotal: number;
  scopeType:   "line_item" | "assembly";
  sqft?:       number;
  // Full snapshot for reloading
  snapshot:    EstimateSnapshot;
};

export type EstimateSnapshot = {
  summary:      string;
  assumptions:  string[];
  scopeType:    "line_item" | "assembly";
  materials:    any[];
  labor:        any[];
  laborHours:   number;
  sqft?:        number;
  ratePerSqft?: number;
  laborRate:    number;
  markupPct:    number;
  permitFee:    number;
};

const STORAGE_KEY = "voltscope:estimates";

function generateId(): string {
  return "est_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function loadAll(): SavedEstimate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(estimates: SavedEstimate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(estimates));
}

// ── Read ─────────────────────────────────────────────────────────────────────

export function getEstimatesForProject(projectId: string): SavedEstimate[] {
  return loadAll()
    .filter((e) => e.projectId === projectId)
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
}

export function getEstimate(id: string): SavedEstimate | null {
  return loadAll().find((e) => e.id === id) ?? null;
}

// ── Write ─────────────────────────────────────────────────────────────────────

export function saveEstimate(
  projectId: string,
  description: string,
  snapshot: EstimateSnapshot,
): SavedEstimate {
  const all = loadAll();
  const now = new Date().toISOString();

  const entry: SavedEstimate = {
    id:            generateId(),
    projectId,
    savedAt:       now,
    description:   description.slice(0, 120),
    finalTotal:    computeFinalTotal(snapshot),
    laborHours:    snapshot.laborHours,
    laborTotal:    snapshot.laborHours * snapshot.laborRate,
    materialTotal: snapshot.materials.reduce((s: number, m: any) => s + (m.lineTotal ?? 0), 0),
    scopeType:     snapshot.scopeType,
    sqft:          snapshot.sqft,
    snapshot,
  };

  all.unshift(entry); // newest first
  saveAll(all);
  return entry;
}

export function deleteEstimate(id: string): void {
  saveAll(loadAll().filter((e) => e.id !== id));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeFinalTotal(s: EstimateSnapshot): number {
  const mat    = s.materials.reduce((sum: number, m: any) => sum + (m.lineTotal ?? 0), 0);
  const lab    = s.laborHours * s.laborRate;
  const sub    = mat + lab + (s.permitFee ?? 0);
  const markup = sub * ((s.markupPct ?? 0) / 100);
  return Math.round((sub + markup) * 100) / 100;
}