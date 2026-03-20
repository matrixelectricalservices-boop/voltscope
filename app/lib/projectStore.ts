// app/lib/projectStore.ts
import { supabase } from "./supabase";

export type Project = {
  id:           string;
  customerName: string;
  address:      string;
  jobType:      string;
  notes?:       string;
  createdAt:    string;
  updatedAt:    string;
};

function toProject(row: any): Project {
  return {
    id:           row.id,
    customerName: row.customer_name,
    address:      row.address,
    jobType:      row.job_type,
    notes:        row.notes ?? undefined,
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("[projectStore] getProjects:", error); return []; }
  return (data ?? []).map(toProject);
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();
  if (error) { console.error("[projectStore] getProject:", error); return null; }
  return data ? toProject(data) : null;
}

export async function saveProject(
  project: Omit<Project, "id" | "createdAt" | "updatedAt">
): Promise<Project | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("customers")
    .insert({
      user_id:       user.id,
      customer_name: project.customerName,
      address:       project.address,
      job_type:      project.jobType,
      notes:         project.notes ?? null,
    })
    .select()
    .single();
  if (error) { console.error("[projectStore] saveProject:", error); return null; }
  return data ? toProject(data) : null;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) console.error("[projectStore] deleteProject:", error);
}