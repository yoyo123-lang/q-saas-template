"use client";

import { useRouter } from "next/navigation";
import { useProjects } from "@/hooks/use-projects";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDate } from "@/lib/utils";
import { FolderKanban, Plus } from "lucide-react";
import { useState } from "react";
import type { ProjectSummary } from "@/types/project";

const columns: Column<ProjectSummary>[] = [
  { key: "name", label: "Nombre", sortable: true },
  {
    key: "status",
    label: "Estado",
    render: (item) => <StatusBadge status={item.status} />,
  },
  {
    key: "createdAt",
    label: "Creado",
    sortable: true,
    render: (item) => formatDate(item.createdAt),
  },
];

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, isLoading, error, refetch } = useProjects();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleDelete() {
    if (!deleteId) return;
    await fetch(`/api/v1/projects/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    refetch();
  }

  if (isLoading) return <LoadingState message="Cargando proyectos..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
        <button
          onClick={() => router.push("/dashboard/projects/new")}
          className="flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          Nuevo proyecto
        </button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No hay proyectos"
          description="Creá tu primer proyecto para comenzar."
        />
      ) : (
        <DataTable
          data={projects}
          columns={columns}
          keyExtractor={(p) => p.id}
          onRowClick={(p) => router.push(`/dashboard/projects/${p.id}`)}
        />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar proyecto"
        description="¿Estás seguro? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  );
}
