"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderKanban, Plus, CheckCircle, Pause, Archive } from "lucide-react";
import type { ProjectSummary } from "@/types/project";

interface Stats {
  total: number;
  active: number;
  paused: number;
  completed: number;
  archived: number;
}

function computeStats(projects: ProjectSummary[]): Stats {
  return {
    total: projects.length,
    active: projects.filter((p) => p.status === "ACTIVE").length,
    paused: projects.filter((p) => p.status === "PAUSED").length,
    completed: projects.filter((p) => p.status === "COMPLETED").length,
    archived: projects.filter((p) => p.status === "ARCHIVED").length,
  };
}

const STAT_CARDS = [
  { key: "total" as const, label: "Total", icon: FolderKanban, color: "text-gray-600", bg: "bg-gray-50" },
  { key: "active" as const, label: "Activos", icon: FolderKanban, color: "text-green-600", bg: "bg-green-50" },
  { key: "paused" as const, label: "Pausados", icon: Pause, color: "text-yellow-600", bg: "bg-yellow-50" },
  { key: "completed" as const, label: "Completados", icon: CheckCircle, color: "text-[var(--color-q-accent)]", bg: "bg-[var(--color-q-accent-light)]/10" },
  { key: "archived" as const, label: "Archivados", icon: Archive, color: "text-gray-400", bg: "bg-gray-50" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/projects?limit=100")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setStats(computeStats(json.data));
      })
      .catch(() => {
        // Si falla, mostrar ceros
        setStats({ total: 0, active: 0, paused: 0, completed: 0, archived: 0 });
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Resumen de tus proyectos</p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          Nuevo proyecto
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
          <div
            key={key}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className={`inline-flex rounded-md p-2 ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">
              {isLoading ? (
                <span className="inline-block h-7 w-8 animate-pulse rounded bg-gray-200" />
              ) : (
                stats?.[key] ?? 0
              )}
            </p>
            <p className="mt-0.5 text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick link */}
      <div className="mt-6">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-2 text-sm text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline"
        >
          <FolderKanban className="h-4 w-4" />
          Ver todos los proyectos
        </Link>
      </div>
    </div>
  );
}
