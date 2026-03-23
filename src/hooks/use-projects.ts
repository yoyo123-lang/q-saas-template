"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProjectSummary, ProjectDetail } from "@/types/project";

interface UseProjectsOptions {
  status?: string;
}

interface UseProjectsReturn {
  projects: ProjectSummary[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Hook para listar proyectos del usuario autenticado. */
export function useProjects(options: UseProjectsOptions = {}): UseProjectsReturn {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (options.status) params.set("status", options.status);

      const res = await fetch(`/api/v1/projects?${params}`);
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message ?? "Error al cargar proyectos");
        return;
      }

      setProjects(json.data);
    } catch {
      setError("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  }, [options.status]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, isLoading, error, refetch: fetchProjects };
}

interface UseProjectReturn {
  project: ProjectDetail | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Hook para obtener el detalle de un proyecto. */
export function useProject(id: string): UseProjectReturn {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/projects/${id}`);
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message ?? "Error al cargar proyecto");
        return;
      }

      setProject(json.data);
    } catch {
      setError("Error de conexión");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  return { project, isLoading, error, refetch: fetchProject };
}
