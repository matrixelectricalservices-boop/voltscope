// app/lib/estimateStore.ts
import { supabase } from "./supabase";

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

export type SavedEstimate = {
  id:            string;
  projectId:     string;
  savedAt:       string;
  description:   string;
  finalTotal:    number;
  laborHours:    number;
  laborTotal:    number;
  materialTotal: number;
  scopeType:     "line_item" | "assembly";
  sqft?:         number;
  snapshot:      EstimateSnapshot;
};

function toEstimate(row: any): SavedEstimate {
  return {
    id:            row.id,
    projectId:     row.customer_id,
    savedAt:       row.saved_at,
    description:   row.description ?? "",
    finalTotal:    row.final_total ?? 0,
    laborHours:    row.labor_hours ?? 0,
    laborTotal:    row.labor_total ?? 0,
    materialTotal: row.material_total ?? 0,
    scopeType:     row.scope_type ?? "line_item",
    sqft:          row.sqft ?? undefined,
    snapshot:      row.snapshot ?? {},
  };
}

export async function getEstimatesForProject(projectId: string): Promise<SavedEstimate[]> {
  const { data, error } = await supabase
    .from("estimates")
    .select("*")
    .eq("customer_id", projectId)
    .order("saved_at", { ascending: false });
  if (error) { console.error("[estimateStore] getEstimatesForProject:", error); return []; }
  return (data ?? []).map(toEstimate);
}

export async function getEstimate(id: string): Promise<SavedEstimate | null> {
  const { data, error } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", id)
    .single();
  if (error) { console.error("[estimateStore] getEstimate:", error); return null; }
  return data ? toEstimate(data) : null;
}

export async function saveEstimate(
  projectId: string,
  description: string,
  snapshot: EstimateSnapshot,
): Promise<SavedEstimate | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const mat        = snapshot.materials.reduce((s: number, m: any) => s + (m.lineTotal ?? 0), 0);
  const lab        = snapshot.laborHours * snapshot.laborRate;
  const sub        = mat + lab + (snapshot.permitFee ?? 0);
  const finalTotal = Math.round((sub + sub * ((snapshot.markupPct ?? 0) / 100)) * 100) / 100;

  const { data, error } = await supabase
    .from("estimates")
    .insert({
      user_id:        user.id,
      customer_id:    projectId,
      description:    description.slice(0, 120),
      final_total:    finalTotal,
      labor_hours:    snapshot.laborHours,
      labor_total:    lab,
      material_total: mat,
      scope_type:     snapshot.scopeType,
      sqft:           snapshot.sqft ?? null,
      snapshot,
    })
    .select()
    .single();

  if (error) { console.error("[estimateStore] saveEstimate:", error); return null; }
  return data ? toEstimate(data) : null;
}

export async function updateEstimate(
  id: string,
  description: string,
  snapshot: EstimateSnapshot,
): Promise<SavedEstimate | null> {
  const mat        = snapshot.materials.reduce((s: number, m: any) => s + (m.lineTotal ?? 0), 0);
  const lab        = snapshot.laborHours * snapshot.laborRate;
  const sub        = mat + lab + (snapshot.permitFee ?? 0);
  const finalTotal = Math.round((sub + sub * ((snapshot.markupPct ?? 0) / 100)) * 100) / 100;

  const { data, error } = await supabase
    .from("estimates")
    .update({
      description:    description.slice(0, 120),
      final_total:    finalTotal,
      labor_hours:    snapshot.laborHours,
      labor_total:    lab,
      material_total: mat,
      scope_type:     snapshot.scopeType,
      sqft:           snapshot.sqft ?? null,
      snapshot,
      saved_at:       new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) { console.error("[estimateStore] updateEstimate:", error); return null; }
  return data ? toEstimate(data) : null;
}

export async function deleteEstimate(id: string): Promise<void> {
  const { error } = await supabase.from("estimates").delete().eq("id", id);
  if (error) console.error("[estimateStore] deleteEstimate:", error);
}