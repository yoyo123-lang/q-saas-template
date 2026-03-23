import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-admin";
import {
  apiSuccess,
  validationError,
  notFoundError,
  internalError,
} from "@/lib/api-response";
import { updateProjectSchema } from "@/lib/validations/project";

type RouteContext = { params: Promise<{ id: string }> };

/** Busca un proyecto por ID verificando ownership y soft delete. */
async function findOwnedProject(id: string, userId: string) {
  return prisma.project.findFirst({
    where: { id, userId, deletedAt: null },
  });
}

/** GET /api/v1/projects/:id — Detalle de un proyecto */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await context.params;
    const project = await findOwnedProject(id, userId!);

    if (!project) return notFoundError("Proyecto no encontrado");

    return apiSuccess({ data: project });
  } catch (err) {
    console.error("GET /api/v1/projects/:id error:", err);
    return internalError();
  }
}

/** PUT /api/v1/projects/:id — Actualizar un proyecto */
export async function PUT(request: NextRequest, context: RouteContext) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await context.params;
    const existing = await findOwnedProject(id, userId!);
    if (!existing) return notFoundError("Proyecto no encontrado");

    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return validationError(firstIssue.message, {
        field: firstIssue.path.join("."),
        reason: firstIssue.code,
      });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: parsed.data,
    });

    return apiSuccess({ data: updated });
  } catch (err) {
    console.error("PUT /api/v1/projects/:id error:", err);
    return internalError();
  }
}

/** DELETE /api/v1/projects/:id — Borrado lógico de un proyecto */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const { id } = await context.params;
    const existing = await findOwnedProject(id, userId!);
    if (!existing) return notFoundError("Proyecto no encontrado");

    await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return apiSuccess({ data: { id, deleted: true } });
  } catch (err) {
    console.error("DELETE /api/v1/projects/:id error:", err);
    return internalError();
  }
}
