/**
 * Tests de integración para /api/v1/projects
 *
 * Mockean prisma y requireAuth para probar la lógica de los handlers
 * sin necesitar una base de datos real.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- Mocks ---

vi.mock("@/lib/require-admin", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Importar DESPUÉS de los mocks
import { GET as getProjects, POST as postProject } from "@/app/api/v1/projects/route";
import {
  GET as getProject,
  PUT as putProject,
  DELETE as deleteProject,
} from "@/app/api/v1/projects/[id]/route";
import { requireAuth } from "@/lib/require-admin";
import { prisma } from "@/lib/db";

// --- Helpers ---

const mockAuth = requireAuth as ReturnType<typeof vi.fn>;
const mockPrisma = prisma.project as {
  findMany: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

function makeRequest(method: string, body?: unknown, searchParams?: Record<string, string>) {
  const url = new URL("http://localhost/api/v1/projects");
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new NextRequest(url, {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  });
}

function makeRouteContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const sampleProject = {
  id: "proj_1",
  name: "Proyecto test",
  description: "Descripción test",
  status: "ACTIVE",
  userId: "user_1",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  deletedAt: null,
};

// --- Tests ---

describe("GET /api/v1/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 cuando no hay sesión", async () => {
    mockAuth.mockResolvedValue({
      error: new Response(JSON.stringify({ success: false, error: { code: "UNAUTHORIZED" } }), { status: 401 }),
      userId: null,
    });

    const res = await getProjects(makeRequest("GET"));
    expect(res.status).toBe(401);
  });

  it("retorna lista de proyectos paginada", async () => {
    mockAuth.mockResolvedValue({ error: null, userId: "user_1" });
    mockPrisma.findMany.mockResolvedValue([sampleProject]);

    const res = await getProjects(makeRequest("GET"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.meta.has_more).toBe(false);
  });

  it("detecta hasMore correctamente con limit+1 proyectos", async () => {
    mockAuth.mockResolvedValue({ error: null, userId: "user_1" });
    // limit=2, devolver 3 (2+1) para indicar que hay más
    const projects = [
      { ...sampleProject, id: "p1" },
      { ...sampleProject, id: "p2" },
      { ...sampleProject, id: "p3" },
    ];
    mockPrisma.findMany.mockResolvedValue(projects);

    const res = await getProjects(makeRequest("GET", undefined, { limit: "2" }));
    const body = await res.json();

    expect(body.meta.has_more).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.meta.next_cursor).toBe("p2");
  });

  it("filtra por status cuando se pasa como query param", async () => {
    mockAuth.mockResolvedValue({ error: null, userId: "user_1" });
    mockPrisma.findMany.mockResolvedValue([]);

    await getProjects(makeRequest("GET", undefined, { status: "PAUSED" }));

    expect(mockPrisma.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "PAUSED" }),
      })
    );
  });
});

describe("POST /api/v1/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 cuando no hay sesión", async () => {
    mockAuth.mockResolvedValue({
      error: new Response(JSON.stringify({ success: false }), { status: 401 }),
      userId: null,
    });

    const res = await postProject(makeRequest("POST", { name: "Test" }));
    expect(res.status).toBe(401);
  });

  it("crea un proyecto con datos válidos y retorna 201", async () => {
    mockAuth.mockResolvedValue({ error: null, userId: "user_1" });
    mockPrisma.create.mockResolvedValue(sampleProject);

    const res = await postProject(makeRequest("POST", { name: "Nuevo proyecto" }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(mockPrisma.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Nuevo proyecto", userId: "user_1" }),
      })
    );
  });

  it("retorna 400 con nombre vacío", async () => {
    mockAuth.mockResolvedValue({ error: null, userId: "user_1" });

    const res = await postProject(makeRequest("POST", { name: "" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(mockPrisma.create).not.toHaveBeenCalled();
  });

  it("retorna 400 sin nombre", async () => {
    mockAuth.mockResolvedValue({ error: null, userId: "user_1" });

    const res = await postProject(makeRequest("POST", {}));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/v1/projects/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 cuando no hay sesión", async () => {
    mockAuth.mockResolvedValue({
      error: new Response(JSON.stringify({ success: false }), { status: 401 }),
      userId: null,
    });

    const req = new NextRequest("http://localhost/api/v1/projects/proj_1");
    const res = await getProject(req, makeRouteContext("proj_1"));
    expect(res.status).toBe(401);
  });

  it("retorna el proyecto cuando existe y pertenece al usuario", async () => {
    mockAuth.mockResolvedValue({ error: null, userId: "user_1" });
    mockPrisma.findFirst.mockResolvedValue(sampleProject);

    const req = new NextRequest("http://localhost/api/v1/projects/proj_1");
    const res = await getProject(req, makeRouteContext("proj_1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe("proj_1");
  });

  it("retorna 404 cuando el proyecto no existe", async () => {
    mockAuth.mockResolvedValue({ error: null, userId: "user_1" });
    mockPrisma.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/v1/projects/no_existe");
    const res = await getProject(req, makeRouteContext("no_existe"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("retorna 404 cuando el proyecto pertenece a otro usuario (ownership check)", async () => {
    mockAuth.mockResolvedValue({ error: null, userId: "user_2" });
    // findFirst devuelve null porque el where incluye userId: user_2 y no matchea
    mockPrisma.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/v1/projects/proj_1");
    const res = await getProject(req, makeRouteContext("proj_1"));

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/v1/projects/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 cuando no hay sesión", async () => {
    mockAuth.mockResolvedValue({
      error: new Response(JSON.stringify({ success: false }), { status: 401 }),
      userId: null,
    });

    const req = new NextRequest("http://localhost/api/v1/projects/proj_1", {
      method: "PUT",
      body: JSON.stringify({ name: "Nuevo nombre" }),
      headers: { "content-type": "application/json" },
    });
    const res = await putProject(req, makeRouteContext("proj_1"));
    expect(res.status).toBe(401);
  });

  it("actualiza un proyecto con datos válidos", async () => {
    mockAuth.mockResolvedValue({ error: null, userId: "user_1" });
    mockPrisma.findFirst.mockResolvedValue(sampleProject);
    mockPrisma.update.mockResolvedValue({ ...sampleProject, name: "Nombre actualizado" });

    const req = new NextRequest("http://localhost/api/v1/projects/proj_1", {
      method: "PUT",
      body: JSON.stringify({ name: "Nombre actualizado" }),
      headers: { "content-type": "application/json" },
    });
    const res = await putProject(req, makeRouteContext("proj_1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("Nombre actualizado");
  });

  it("retorna 400 con status inválido", async () => {
    mockAuth.mockResolvedValue({ error: null, userId: "user_1" });
    mockPrisma.findFirst.mockResolvedValue(sampleProject);

    const req = new NextRequest("http://localhost/api/v1/projects/proj_1", {
      method: "PUT",
      body: JSON.stringify({ status: "INVALIDO" }),
      headers: { "content-type": "application/json" },
    });
    const res = await putProject(req, makeRouteContext("proj_1"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("retorna 404 cuando el proyecto no existe", async () => {
    mockAuth.mockResolvedValue({ error: null, userId: "user_1" });
    mockPrisma.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/v1/projects/no_existe", {
      method: "PUT",
      body: JSON.stringify({ name: "Test" }),
      headers: { "content-type": "application/json" },
    });
    const res = await putProject(req, makeRouteContext("no_existe"));

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/projects/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 cuando no hay sesión", async () => {
    mockAuth.mockResolvedValue({
      error: new Response(JSON.stringify({ success: false }), { status: 401 }),
      userId: null,
    });

    const req = new NextRequest("http://localhost/api/v1/projects/proj_1", { method: "DELETE" });
    const res = await deleteProject(req, makeRouteContext("proj_1"));
    expect(res.status).toBe(401);
  });

  it("hace soft delete del proyecto y retorna id + deleted:true", async () => {
    mockAuth.mockResolvedValue({ error: null, userId: "user_1" });
    mockPrisma.findFirst.mockResolvedValue(sampleProject);
    mockPrisma.update.mockResolvedValue({ ...sampleProject, deletedAt: new Date() });

    const req = new NextRequest("http://localhost/api/v1/projects/proj_1", { method: "DELETE" });
    const res = await deleteProject(req, makeRouteContext("proj_1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.deleted).toBe(true);
    expect(body.data.id).toBe("proj_1");
  });

  it("usa deletedAt en lugar de borrado físico", async () => {
    mockAuth.mockResolvedValue({ error: null, userId: "user_1" });
    mockPrisma.findFirst.mockResolvedValue(sampleProject);
    mockPrisma.update.mockResolvedValue({ ...sampleProject, deletedAt: new Date() });

    const req = new NextRequest("http://localhost/api/v1/projects/proj_1", { method: "DELETE" });
    await deleteProject(req, makeRouteContext("proj_1"));

    expect(mockPrisma.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });

  it("retorna 404 cuando el proyecto no existe", async () => {
    mockAuth.mockResolvedValue({ error: null, userId: "user_1" });
    mockPrisma.findFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/v1/projects/no_existe", { method: "DELETE" });
    const res = await deleteProject(req, makeRouteContext("no_existe"));

    expect(res.status).toBe(404);
  });
});
