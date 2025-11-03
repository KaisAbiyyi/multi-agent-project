'use client';

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  forwardRef,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Folder,
  FolderPlus,
  Loader2,
  MoreVertical,
  Trash2,
  Edit2,
} from 'lucide-react';

import type { Conversation, Project } from '@/types';
import { db } from '@/lib/db';
import { createProject, deleteProject, renameProject } from '@/services/projects/project-service';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const MAX_PROJECTS_IN_SIDEBAR = 5;
const MAX_PROJECT_CONVERSATIONS = 5;
const CONVERSATION_DRAG_TYPE = 'application/x-conversation-id';

type ProjectSummary = {
  project: Project;
  conversations: Conversation[];
  lastActivity: number;
};

export interface ProjectsSidebarHandle {
  openCreateProjectDialog: () => void;
}

function computeLastActivity(project: Project, conversations: Conversation[]): number {
  if (conversations.length === 0) {
    return new Date(project.updatedAt ?? project.createdAt).getTime();
  }
  return Math.max(
    ...conversations.map((conv) => new Date(conv.updatedAt).getTime()),
    new Date(project.updatedAt ?? project.createdAt).getTime(),
  );
}

export const ProjectsSidebar = forwardRef<ProjectsSidebarHandle, Record<string, never>>(
  function ProjectsSidebarComponent(_props, ref) {
    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();

    const [projects, setProjects] = useState<Project[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [activeProjectForEdit, setActiveProjectForEdit] = useState<Project | null>(null);
    const [projectNameInput, setProjectNameInput] = useState('');
    const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);

    const loadProjects = useCallback(async () => {
      try {
        const list = await db.projects.orderBy('updatedAt').reverse().toArray();
        setProjects(list);
      } catch (error) {
        console.error('[ProjectsSidebar] Error loading projects:', error);
      } finally {
        setIsLoading(false);
      }
    }, []);

    const loadConversations = useCallback(async () => {
      try {
        const items = await db.conversations.orderBy('updatedAt').reverse().limit(200).toArray();
        setConversations(items);
      } catch (error) {
        console.error('[ProjectsSidebar] Error loading conversations:', error);
      }
    }, []);

    useEffect(() => {
      loadProjects();
      const interval = setInterval(loadProjects, 5000);
      return () => clearInterval(interval);
    }, [loadProjects]);

    useEffect(() => {
      loadConversations();
      const interval = setInterval(loadConversations, 2500);
      return () => clearInterval(interval);
    }, [loadConversations]);

    useImperativeHandle(
      ref,
      () => ({
        openCreateProjectDialog: () => {
          setProjectNameInput('');
          setCreateDialogOpen(true);
        },
      }),
      [],
    );

    const projectSummaries: ProjectSummary[] = useMemo(() => {
      return projects
        .map((project) => {
          const projectConversations = conversations
            .filter((conv) => conv.projectId === project.id)
            .sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
            );
          return {
            project,
            conversations: projectConversations,
            lastActivity: computeLastActivity(project, projectConversations),
          };
        })
        .sort((a, b) => b.lastActivity - a.lastActivity);
    }, [projects, conversations]);

    const displayedProjects = projectSummaries.slice(0, MAX_PROJECTS_IN_SIDEBAR);
    const hasMoreProjects = projectSummaries.length > MAX_PROJECTS_IN_SIDEBAR;

    const handleCreateProject = useCallback(async () => {
      if (!projectNameInput.trim()) return;

      try {
        const project = await createProject(projectNameInput);
        toast({
          title: 'Project created',
          description: `Project “${project.name}” created successfully`,
        });
        setCreateDialogOpen(false);
        setProjectNameInput('');
        await loadProjects();
      } catch (error) {
        console.error('[ProjectsSidebar] Error creating project:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to create project',
          variant: 'destructive',
        });
      }
    }, [projectNameInput, toast, loadProjects]);

    const handleRenameProject = useCallback(async () => {
      if (!activeProjectForEdit || !projectNameInput.trim()) return;

      try {
        await renameProject(activeProjectForEdit.id, projectNameInput);
        toast({
          title: 'Project renamed',
          description: 'Project name updated successfully',
        });
        setRenameDialogOpen(false);
        setActiveProjectForEdit(null);
        setProjectNameInput('');
        await loadProjects();
      } catch (error) {
        console.error('[ProjectsSidebar] Error renaming project:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to rename project',
          variant: 'destructive',
        });
      }
    }, [activeProjectForEdit, projectNameInput, toast, loadProjects]);

    const handleDeleteProject = useCallback(async () => {
      if (!activeProjectForEdit) return;

      try {
        await deleteProject(activeProjectForEdit.id);
        toast({
          title: 'Project deleted',
          description: 'Project removed and conversations unassigned',
        });
        setDeleteConfirmOpen(false);
        setActiveProjectForEdit(null);
        await Promise.all([loadProjects(), loadConversations()]);
      } catch (error) {
        console.error('[ProjectsSidebar] Error deleting project:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to delete project',
          variant: 'destructive',
        });
      }
    }, [activeProjectForEdit, toast, loadProjects, loadConversations]);

    const handleProjectDrop = useCallback(
      async (event: React.DragEvent, targetProjectId: string) => {
        event.preventDefault();
        const conversationId = event.dataTransfer.getData(CONVERSATION_DRAG_TYPE);
        setDragOverProjectId(null);

        if (!conversationId) return;

        try {
          const now = new Date().toISOString();
          await db.conversations.update(conversationId, {
            projectId: targetProjectId,
            updatedAt: now,
          });
          await loadConversations();
          toast({
            title: 'Conversation moved',
            description: 'Conversation assigned to project',
          });
        } catch (error) {
          console.error('[ProjectsSidebar] Error moving conversation to project:', error);
          toast({
            title: 'Error',
            description: 'Failed to move conversation into this project',
            variant: 'destructive',
          });
        }
      },
      [loadConversations, toast],
    );

    if (isLoading) {
      return (
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      );
    }

    return (
      <>
        <SidebarMenu className="mb-2">
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setCreateDialogOpen(true)}>
              <FolderPlus className="h-4 w-4" />
              <span>New Project</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {displayedProjects.length === 0 ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton disabled>
                <Folder className="h-4 w-4" />
                <span className="text-muted-foreground">No projects yet</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <SidebarMenu className="space-y-1">
            {displayedProjects.map(({ project, conversations: projectConversations }) => {
              const isActive = pathname === `/projects/${project.id}`;
              const conversationsToShow = projectConversations.slice(
                0,
                MAX_PROJECT_CONVERSATIONS,
              );

              return (
                <SidebarMenuItem
                  key={project.id}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (event.dataTransfer.types.includes(CONVERSATION_DRAG_TYPE)) {
                      setDragOverProjectId(project.id);
                      event.dataTransfer.dropEffect = 'move';
                    }
                  }}
                  onDragLeave={(event) => {
                    const related = event.relatedTarget as Node | null;
                    if (!event.currentTarget.contains(related)) {
                      setDragOverProjectId((current) =>
                        current === project.id ? null : current,
                      );
                    }
                  }}
                  onDrop={(event) => handleProjectDrop(event, project.id)}
                >
                  <div
                    className={cn(
                      'group flex w-full items-center gap-1 rounded-md transition-colors',
                      dragOverProjectId === project.id && 'bg-primary/5',
                    )}
                  >
                    <SidebarMenuButton
                      onClick={() => router.push(`/projects/${project.id}`)}
                      isActive={isActive}
                      className="flex-1"
                    >
                      <span className="flex-1 truncate">{project.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {projectConversations.length}
                      </span>
                    </SidebarMenuButton>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100'
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MoreVertical className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            setActiveProjectForEdit(project);
                            setProjectNameInput(project.name);
                            setRenameDialogOpen(true);
                          }}
                        >
                          <Edit2 className='mr-2 h-4 w-4' />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            setActiveProjectForEdit(project);
                            setDeleteConfirmOpen(true);
                          }}
                          className='text-destructive focus:text-destructive'
                        >
                          <Trash2 className='mr-2 h-4 w-4' />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {isActive && conversationsToShow.length > 0 && (
                    <SidebarMenuSub>
                      {conversationsToShow.map((conv) => {
                        const isActiveConversation = pathname === `/chat/${conv.id}`;
                        return (
                          <SidebarMenuSubItem key={conv.id}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isActiveConversation}
                              size="sm"
                            >
                              <button
                                type="button"
                                onClick={() => router.push(`/chat/${conv.id}`)}
                                className="flex items-center gap-2"
                              >
                                <span className="truncate text-xs">{conv.title}</span>
                              </button>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        )}

        {hasMoreProjects && (
          <SidebarMenu className="mt-2">
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => router.push('/projects')}>
                <span>More Projects</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Project</DialogTitle>
              <DialogDescription>Create a folder to organize your chats</DialogDescription>
            </DialogHeader>
            <Input
              value={projectNameInput}
              onChange={(event) => setProjectNameInput(event.target.value)}
              placeholder="Project name"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleCreateProject();
                }
              }}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateProject} disabled={!projectNameInput.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Project</DialogTitle>
              <DialogDescription>Update the project name</DialogDescription>
            </DialogHeader>
            <Input
              value={projectNameInput}
              onChange={(event) => setProjectNameInput(event.target.value)}
              placeholder="Project name"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleRenameProject();
                }
              }}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRenameProject} disabled={!projectNameInput.trim()}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete “{activeProjectForEdit?.name}” and unassign all linked chats. This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProject}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  },
);
