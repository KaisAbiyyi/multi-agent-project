'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Loader2,
  Plus,
  Search,
  Settings,
  MoreVertical,
} from 'lucide-react';

import type { Conversation, Project, Message } from '@/types';
import { db } from '@/lib/db';
import { renameProject, deleteProject } from '@/services/projects/project-service';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { ChatHistory } from '@/components/features/chat/chat-history';
import {
  ProjectsSidebar,
  type ProjectsSidebarHandle,
} from '@/components/features/chat/projects-sidebar';
import { SearchConversations } from '@/components/features/chat/search-conversations';
import { ProjectChatComposer } from '@/components/features/projects/project-chat-composer';

type ConversationEntry = {
  conversation: Conversation;
  lastUserMessage?: Message;
};

interface ProjectDetailProps {
  projectId: string;
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [entries, setEntries] = useState<ConversationEntry[]>([]);
  const [projectNameInput, setProjectNameInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const projectsSidebarRef = useRef<ProjectsSidebarHandle>(null);

  const loadProject = useCallback(async () => {
    try {
      const result = await db.projects.get(projectId);
      setProject(result ?? null);
      if (result) {
        setProjectNameInput(result.name);
      }
    } catch (error) {
      console.error('[ProjectDetail] Error loading project:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const loadConversations = useCallback(async () => {
    try {
      const convs = await db.conversations.where('projectId').equals(projectId).toArray();
      const entriesWithMessages = await Promise.all(
        convs.map(async (conversation) => {
          const messages = await db.messages
            .where('conversationId')
            .equals(conversation.id)
            .toArray();

          let lastUserMessage: Message | undefined;
          for (let index = messages.length - 1; index >= 0; index -= 1) {
            const message = messages[index];
            if (message.role === 'user') {
              lastUserMessage = message;
              break;
            }
          }

          return {
            conversation,
            lastUserMessage,
          };
        }),
      );
      setEntries(entriesWithMessages);
    } catch (error) {
      console.error('[ProjectDetail] Error loading conversations:', error);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 2500);
    return () => clearInterval(interval);
  }, [loadConversations]);

  const orderedEntries = useMemo(() => {
    return [...entries].sort(
      (a, b) =>
        new Date(b.conversation.updatedAt).getTime() -
        new Date(a.conversation.updatedAt).getTime(),
    );
  }, [entries]);

  const handleOpenRenameDialog = () => {
    if (project) {
      setProjectNameInput(project.name);
    }
    setIsRenameDialogOpen(true);
  };

  const handleRenameProject = async () => {
    if (!projectNameInput.trim() || !project) return;

    try {
      setIsRenaming(true);
      await renameProject(project.id, projectNameInput);
      toast({
        title: 'Project updated',
        description: 'Project name saved successfully',
      });
      setIsRenameDialogOpen(false);
      await loadProject();
    } catch (error) {
      console.error('[ProjectDetail] Error renaming project:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update project',
        variant: 'destructive',
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;

    try {
      await deleteProject(project.id);
      toast({
        title: 'Project deleted',
        description: 'Project removed and conversations unassigned',
      });
      setDeleteDialogOpen(false);
      router.push('/');
    } catch (error) {
      console.error('[ProjectDetail] Error deleting project:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete project',
        variant: 'destructive',
      });
    }
  };

  const renderConversationEntry = (entry: ConversationEntry) => {
    const { conversation, lastUserMessage } = entry;
    const updatedLabel = new Date(conversation.updatedAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const rawPreview = lastUserMessage?.content
      ?.replace(/\s+/g, ' ')
      .trim();
    const preview = rawPreview && rawPreview.length > 0
      ? rawPreview.length > 140
        ? `${rawPreview.slice(0, 140)}…`
        : rawPreview
      : 'No user messages yet.';

    return (
      <button
        key={conversation.id}
        type="button"
        onClick={() => router.push(`/chat/${conversation.id}`)}
        className="w-full rounded-lg border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-accent"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium truncate">{conversation.title}</span>
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {updatedLabel}
          </span>
        </div>
        <div className="mt-1 text-sm text-muted-foreground truncate">{preview}</div>
      </button>
    );
  };

  let mainContent: React.ReactNode;
  if (isLoading) {
    mainContent = (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  } else if (!project) {
    mainContent = (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Project not found</h1>
        <p className="text-muted-foreground">
          The project you are looking for does not exist or has been deleted.
        </p>
        <Button onClick={() => router.push('/projects')}>Back to Projects</Button>
      </div>
    );
  } else {
    mainContent = (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">Project</div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Project actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleOpenRenameDialog}>
                Rename project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                Delete project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          <ProjectChatComposer
            projectId={project.id}
            onConversationCreated={loadConversations}
          />
          <p className="text-muted-foreground text-sm">
            Chats started here automatically stay organized under this project.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Chats in this Project</CardTitle>
            <CardDescription>
              {orderedEntries.length === 0
                ? 'No conversations have been added to this project yet.'
                : 'Select a conversation to jump back into the discussion.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {orderedEntries.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <MessageSquare className="h-5 w-5" />
                <span>No conversations yet.</span>
              </div>
            ) : (
              orderedEntries.map(renderConversationEntry)
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full overflow-hidden">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => router.push(`/?projectId=${projectId}`)}>
                  <MessageSquare className="h-4 w-4" />
                  <span>New Chat</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => setIsSearchDialogOpen(true)}>
                  <Search className="h-4 w-4" />
                  <span>Search conversations...</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="justify-between pr-0">
                <span>Projects</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={() => projectsSidebarRef.current?.openCreateProjectDialog()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <ProjectsSidebar ref={projectsSidebarRef} />
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Chat History</SidebarGroupLabel>
              <SidebarGroupContent>
                <ChatHistory />
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={() => router.push('/?openSettings=1')}>
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <div className="relative flex flex-1 flex-col overflow-hidden">
          <div className="border-b bg-background p-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <div className="text-sm text-muted-foreground">Project details</div>
                <div className="text-lg font-semibold">{project?.name ?? 'Project'}</div>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-muted/20">
            {mainContent}
          </div>
        </div>
      </div>

      <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Search Conversations</DialogTitle>
            <DialogDescription>
              Find your past conversations by title
            </DialogDescription>
          </DialogHeader>
          <SearchConversations onSelect={() => setIsSearchDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={isRenameDialogOpen}
        onOpenChange={(open) => {
          setIsRenameDialogOpen(open);
          if (open && project) {
            setProjectNameInput(project.name);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Update the project name to keep everything organized.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={projectNameInput}
              onChange={(event) => setProjectNameInput(event.target.value)}
              placeholder="Project name"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleRenameProject();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRenameProject}
              disabled={!projectNameInput.trim() || isRenaming}
            >
              {isRenaming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete “{project?.name ?? 'this project'}” and unassign all related chats.
              The chats themselves will remain available in your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteProject}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
