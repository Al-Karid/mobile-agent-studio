import { create } from "zustand";
import { getProject, listProjects, type Project, type ProjectDetail } from "@/lib/api";

/**
 * Global project state (Zustand) — shared across the projects list, the chat
 * screen, the settings screen and the lifecycle actions. The projects list
 * prefetches full details so navigating to a project renders with real state
 * on the first frame (no load-time flip → fluid header/UI).
 */
interface ProjectState {
  projects: Project[];
  details: Record<string, ProjectDetail>;
  setProjects: (projects: Project[]) => void;
  setProjectDetail: (detail: ProjectDetail) => void;
  /** Refresh the list; prefetch details for projects we don't have yet. */
  refreshProjects: () => Promise<void>;
  /** Fetch one project's full detail and cache it. */
  refreshProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  details: {},

  setProjects: (projects) => set({ projects }),

  setProjectDetail: (detail) =>
    set((s) => ({ details: { ...s.details, [detail.id]: detail } })),

  refreshProjects: async () => {
    const projects = await listProjects();
    set({ projects });
    // Refresh every project's detail so the list reflects live state
    // (a generation finishing is visible without navigating to the screen).
    await Promise.all(
      projects.map((p) => get().refreshProject(p.id).catch(() => {}))
    );
  },

  refreshProject: async (id) => {
    const detail = await getProject(id);
    set((s) => ({ details: { ...s.details, [id]: detail } }));
  },
}));
