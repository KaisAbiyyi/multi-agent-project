'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { Conversation, Project } from '@/types';
import { db } from '@/lib/db';
import { createProject } from '@/services/projects/project-service';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type ProjectWithStats = {
  project: Project;
  conversationCount: number;
  lastActivity: number;
};

export function ProjectsIndex() {
  const router = useRouter();
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [newProjectName, setNewProjectName] = useState('');

  const loadProjects = useCallback(async () => {
    try {
      const list = await db.projects.orderBy('updatedAt').reverse().toArray();
      setProjects(list);
    } catch (error) {
      console.error('[ProjectsIndex] Error loading projects:', error);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const items = await db.conversations.orderBy('updatedAt').reverse().toArray();
      setConversations(items);
    } catch (error) {
      console.error('[ProjectsIndex] Error loading conversations:', error);
    }
  }, []);

  useEffect(() => {
    loadProjects();
    loadConversations();
  }, [loadProjects, loadConversations]);

  const projectSummaries: ProjectWithStats[] = useMemo(() => {
    return projects
      .map((project) => {
        const projectConversations = conversations.filter(
          (conv) => conv.projectId === project.id,
        );
        const lastUpdated = projectConversations.length
          ? Math.max(
              ...projectConversations.map((conv) => new Date(conv.updatedAt).getTime()),
            )
          : new Date(project.updatedAt ?? project.createdAt).getTime();

        return {
          project,
          conversationCount: projectConversations.length,
          lastActivity: lastUpdated,
        };
      })
      .sort((a, b) => b.lastActivity - a.lastActivity);
  }, [projects, conversations]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      return;
    }

    try {
      const project = await createProject(newProjectName);
      toast({
        title: 'Project created',
        description: `Project “${project.name}” created successfully`,
      });
      setNewProjectName('');
      await loadProjects();
    } catch (error) {
      console.error('[ProjectsIndex] Error creating project:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create project',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-muted-foreground">
          Organize your chats into folders. Select a project to review its conversations or start a
          new one.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Project</CardTitle>
          <CardDescription>Keep related conversations together.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Project name"
            value={newProjectName}
            onChange={(event) => setNewProjectName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleCreateProject();
              }
            }}
          />
          <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
            Create
          </Button>
        </CardContent>
      </Card>

      {projectSummaries.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            You don&apos;t have any projects yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projectSummaries.map(({ project, conversationCount, lastActivity }) => (
            <Card
              key={project.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(`/projects/${project.id}`)}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="truncate">{project.name}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {conversationCount} chats
                  </span>
                </CardTitle>
                <CardDescription>
                  Last activity{' '}
                  {new Date(lastActivity).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
