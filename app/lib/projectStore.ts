import type { EstimateType } from "./estimateTypes";

export type Project = {
  id: string;
  customerName: string;
  address: string;
  jobType: EstimateType;
  notes: string;
  createdAt: string;
};

// Keep data in-memory during development (persists while the dev server stays running)
const g = globalThis as unknown as { __projects?: Project[] };

export function getProjects(): Project[] {
  if (!g.__projects) g.__projects = [];
  return g.__projects;
}

export function addProject(project: Omit<Project, "id" | "createdAt">): Project {
  const projects = getProjects();
  const newProject: Project = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...project,
  };
  projects.unshift(newProject);
  return newProject;
}