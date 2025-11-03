import { db } from "@/lib/db";
import { sanitizeInput } from "@/lib/security";
import type { Project } from "@/types";

/**
 * Get all projects ordered by creation date
 */
export async function getAllProjects(): Promise<Project[]> {
  return db.projects.orderBy("createdAt").toArray();
}

/**
 * Create a new project with a sanitized name
 */
export async function createProject(name: string): Promise<Project> {
  const trimmed = name.trim();
  const sanitized = sanitizeInput(trimmed);

  if (!sanitized) {
    throw new Error("Project name cannot be empty");
  }

  const now = new Date().toISOString();
  const project: Project = {
    id: crypto.randomUUID(),
    name: sanitized,
    createdAt: now,
    updatedAt: now,
  };

  await db.projects.add(project);
  return project;
}

/**
 * Update project name
 */
export async function renameProject(projectId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  const sanitized = sanitizeInput(trimmed);

  if (!sanitized) {
    throw new Error("Project name cannot be empty");
  }

  await db.projects.update(projectId, {
    name: sanitized,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Delete a project and optionally keep conversations orphaned
 * All conversations previously assigned to this project will be unassigned.
 */
export async function deleteProject(projectId: string): Promise<void> {
  await db.transaction("rw", db.projects, db.conversations, async () => {
    await db.projects.delete(projectId);
    await db.conversations
      .where("projectId")
      .equals(projectId)
      .modify((conversation) => {
        conversation.projectId = undefined;
      });
  });
}
