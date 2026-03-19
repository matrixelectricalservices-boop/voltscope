// app/lib/projectStore.ts
// Projects are saved to localStorage under "voltscope:projects"
// When you add a database later, only this file needs to change.

export type Project = {
  id:           string;
  customerName: string;
  address:      string;
  jobType:      string;
  notes?:       string;
  createdAt:    string; // ISO string
  updatedAt:    string;
};

const STORAGE_KEY = "voltscope:projects";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Read ────────────────────────────────────────────────────────────────────

export function getProjects(): Project[] {
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

export function getProject(id: string): Project | null {
  return getProjects().find((p) => p.id === id) ?? null;
}

// ── Write ───────────────────────────────────────────────────────────────────

export function saveProject(project: Omit<Project, "id" | "createdAt" | "updatedAt">): Project {
  const projects = getProjects();
  const now = new Date().toISOString();
  const newProject: Project = {
    ...project,
    id:        generateId(),
    createdAt: now,
    updatedAt: now,
  };
  projects.unshift(newProject); // newest first
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  return newProject;
}

export function updateProject(id: string, updates: Partial<Omit<Project, "id" | "createdAt">>): Project | null {
  const projects = getProjects();
  const index    = projects.findIndex((p) => p.id === id);
  if (index === -1) return null;
  const updated = { ...projects[index], ...updates, updatedAt: new Date().toISOString() };
  projects[index] = updated;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  return updated;
}

export function deleteProject(id: string): void {
  const projects = getProjects().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}