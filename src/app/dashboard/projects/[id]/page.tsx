"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/hooks/use-projects";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useState } from "react";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { project, isLoading, error, refetch } = useProject(id);
  const [showDelete, setShowDelete] = useState(false);

  async function handleDelete() {
    await fetch(`/api/v1/projects/${id}`, { method: "DELETE" });
    router.push("/dashboard/projects");
  }

  if (isLoading) return <LoadingState message="Cargando proyecto..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!project) return <ErrorState message="Proyecto no encontrado" />;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard/projects")}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <div className="mt-1 flex items-center gap-3">
              <StatusBadge status={project.status} />
              <span className="text-sm text-gray-500">
                Creado el {formatDate(project.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowDelete(true)}
          className="flex items-center gap-2 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          Eliminar
        </button>
      </div>

      {/* Content */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-medium text-gray-500">Descripción</h2>
        <p className="mt-2 text-gray-700">
          {project.description ?? "Sin descripción."}
        </p>
      </div>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Eliminar proyecto"
        description={`¿Estás seguro de que querés eliminar "${project.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  );
}
