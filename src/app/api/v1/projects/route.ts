import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/require-admin";
import { apiSuccess, validationError, internalError } from "@/lib/api-response";
import { createProjectSchema } from "@/lib/validations/project";

const statusSchema = z.enum(["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).optional();

/** GET /api/v1/projects — Listar proyectos del usuario autenticado */
export async function GET(request: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = request.nextUrl;
    const statusParsed = statusSchema.safeParse(searchParams.get("status") ?? undefined);
    const status = statusParsed.success ? (statusParsed.data ?? null) : null;
    const limit = Math.max(1, Math.min(Number(searchParams.get("limit")) || 25, 100));
    const cursor = searchParams.get("cursor");

    const projects = await prisma.project.findMany({
      where: {
        userId: userId!,
        deletedAt: null,
        ...(status ? { status } : {}),
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const hasMore = projects.length > limit;
    const data = hasMore ? projects.slice(0, limit) : projects;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return apiSuccess({
      data,
      meta: { next_cursor: nextCursor, limit, has_more: hasMore },
    });
  } catch (err) {
    console.error("GET /api/v1/projects error:", err);
    return internalError();
  }
}

/** POST /api/v1/projects — Crear un proyecto */
export async function POST(request: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return validationError(firstIssue.message, {
        field: firstIssue.path.join("."),
        reason: firstIssue.code,
      });
    }

    const project = await prisma.project.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        userId: userId!,
      },
    });

    return apiSuccess({ data: project, status: 201 });
  } catch (err) {
    console.error("POST /api/v1/projects error:", err);
    return internalError();
  }
}
