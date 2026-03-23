import type { ProjectStatus } from "@prisma/client";

export interface ProjectSummary {
  id: string;
  name: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends ProjectSummary {
  description: string | null;
  userId: string;
}
