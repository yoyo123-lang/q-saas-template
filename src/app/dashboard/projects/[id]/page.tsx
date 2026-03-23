"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/hooks/use-projects";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDate } from "@/lib/utils";
import { updateProjectSchema } from "@/lib/validations/project";
import { ArrowLeft, Pencil, Trash2, X, Check } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Activo" },
  { value: "PAUSED", label: "Pausado" },
  { value: "COMPLETED", label: "Completado" },
  { value: "ARCHIVED", label: "Archivado" },
] as const;

interface EditFormErrors {
  name?: string;
  description?: string;
  general?: string;
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { project, isLoading, error, refetch } = useProject(id);

  const [showDelete, setShowDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Estado del formulario de edición
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editErrors, setEditErrors] = useState<EditFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  function startEditing() {
    if (!project) return;
    setEditName(project.name);
    setEditDescription(project.description ?? "");
    setEditStatus(project.status);
    setEditErrors({});
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setEditErrors({});
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setEditErrors({});

    const parsed = updateProjectSchema.safeParse({
      name: editName,
      description: editDescription || null,
      status: editStatus,
    });

    if (!parsed.success) {
      const fieldErrors: EditFormErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof EditFormErrors;
        if (field) fieldErrors[field] = issue.message;
      }
      setEditErrors(fieldErrors);
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/v1/projects/${id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();

      if (!json.success) {
        setEditErrors({ general: json.error?.message ?? "Error al guardar" });
        return;
      }

      setIsEditing(false);
      refetch();
    } catch {
      setEditErrors({ general: "Error de conexión. Intentá de nuevo." });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/v1/projects/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) {
        console.error("Error al eliminar proyecto:", json.error?.message);
        return;
      }
      router.push("/dashboard/projects");
    } catch {
      console.error("Error de conexión al eliminar proyecto");
    }
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
        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              onClick={startEditing}
              className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </button>
          )}
          <button
            onClick={() => setShowDelete(true)}
            className="flex items-center gap-2 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </button>
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <form onSubmit={handleSave} className="space-y-5">
            {editErrors.general && (
              <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                {editErrors.general}
              </div>
            )}

            {/* Nombre */}
            <div>
              <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
              {editErrors.name && (
                <p className="mt-1 text-xs text-red-600">{editErrors.name}</p>
              )}
            </div>

            {/* Descripción */}
            <div>
              <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">
                Descripción
              </label>
              <textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                maxLength={1000}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
              {editErrors.description && (
                <p className="mt-1 text-xs text-red-600">{editErrors.description}</p>
              )}
            </div>

            {/* Estado */}
            <div>
              <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700">
                Estado
              </label>
              <select
                id="edit-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelEditing}
                className="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {isSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-medium text-gray-500">Descripción</h2>
          <p className="mt-2 text-gray-700">
            {project.description ?? "Sin descripción."}
          </p>
        </div>
      )}

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
