'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { MessageSquare, Loader2, Pin, Trash2, Edit2, MoreVertical } from 'lucide-react';

import type { Conversation, Project } from '@/types';
import { db } from '@/lib/db';
import { sanitizeInput } from '@/lib/security';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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

const CONVERSATION_DRAG_TYPE = 'application/x-conversation-id';
const MAX_CONVERSATIONS = 30;

export function ChatHistory() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [draggedConversationId, setDraggedConversationId] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const convs = await db.conversations
        .orderBy('updatedAt')
        .reverse()
        .limit(MAX_CONVERSATIONS)
        .toArray();

      const sorted = convs.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      setConversations(sorted);
    } catch (error) {
      console.error('[ChatHistory] Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 2000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  const loadProjects = useCallback(async () => {
    try {
      const list = await db.projects.toArray();
      setProjects(list);
    } catch (error) {
      console.error('[ChatHistory] Error loading projects:', error);
    }
  }, []);

  useEffect(() => {
    loadProjects();
    const interval = setInterval(loadProjects, 5000);
    return () => clearInterval(interval);
  }, [loadProjects]);

  const projectLookup = useMemo(() => {
    return new Map(projects.map((project) => [project.id, project]));
  }, [projects]);

  const pinnedConversations = useMemo(
    () => conversations.filter((conv) => conv.isPinned),
    [conversations],
  );
  const otherConversations = useMemo(
    () => conversations.filter((conv) => !conv.isPinned),
    [conversations],
  );

  const handlePin = useCallback(
    async (conv: Conversation, event: React.MouseEvent) => {
      event.stopPropagation();
      try {
        await db.conversations.update(conv.id, {
          isPinned: !conv.isPinned,
        });
        await loadConversations();
        toast({
          title: conv.isPinned ? 'Unpinned' : 'Pinned',
          description: `Conversation ${conv.isPinned ? 'unpinned' : 'pinned'} successfully`,
        });
      } catch (error) {
        console.error('[ChatHistory] Error pinning conversation:', error);
        toast({
          title: 'Error',
          description: 'Failed to update pin state',
          variant: 'destructive',
        });
      }
    },
    [loadConversations, toast],
  );

  const handleDeleteClick = useCallback((conv: Conversation, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedConv(conv);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedConv) return;

    try {
      await db.messages.where('conversationId').equals(selectedConv.id).delete();
      await db.conversations.delete(selectedConv.id);
      await loadConversations();

      toast({
        title: 'Deleted',
        description: 'Conversation deleted successfully',
      });

      if (pathname === `/chat/${selectedConv.id}`) {
        router.push('/');
      }
    } catch (error) {
      console.error('[ChatHistory] Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive',
      });
    } finally {
      setDeleteConfirmOpen(false);
      setSelectedConv(null);
    }
  }, [selectedConv, loadConversations, toast, pathname, router]);

  const handleRenameClick = useCallback((conv: Conversation, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedConv(conv);
    setNewTitle(conv.title);
    setRenameDialogOpen(true);
  }, []);

  const handleRenameConfirm = useCallback(async () => {
    if (!selectedConv || !newTitle.trim()) return;
    const sanitizedTitle = sanitizeInput(newTitle.trim());

    try {
      await db.conversations.update(selectedConv.id, {
        title: sanitizedTitle,
      });
      await loadConversations();

      toast({
        title: 'Renamed',
        description: 'Conversation renamed successfully',
      });
    } catch (error) {
      console.error('[ChatHistory] Error renaming conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to rename conversation',
        variant: 'destructive',
      });
    } finally {
      setRenameDialogOpen(false);
      setSelectedConv(null);
      setNewTitle('');
    }
  }, [selectedConv, newTitle, loadConversations, toast]);

  const renderConversationRow = useCallback(
    (conv: Conversation) => {
      const isActiveConversation = pathname === `/chat/${conv.id}`;
      const isDragged = draggedConversationId === conv.id;
      const projectName = conv.projectId
        ? projectLookup.get(conv.projectId)?.name ?? 'Project'
        : null;

      return (
        <SidebarMenuItem key={conv.id}>
          <div
            className={cn('group flex w-full items-center gap-1', isDragged && 'opacity-60')}
            draggable
            onDragStart={(event) => {
              setDraggedConversationId(conv.id);
              event.dataTransfer.setData(CONVERSATION_DRAG_TYPE, conv.id);
              event.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={() => setDraggedConversationId(null)}
          >
            <SidebarMenuButton
              onClick={() => router.push(`/chat/${conv.id}`)}
              isActive={isActiveConversation}
              className="flex-1"
            >
              <span className="truncate flex-1">{conv.title}</span>
              {projectName && (
                <span className="text-xs text-muted-foreground">{projectName}</span>
              )}
              {conv.isPinned && (
                <Pin className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
              )}
            </SidebarMenuButton>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(event) => event.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(event) => handlePin(conv, event)}>
                  <Pin className="mr-2 h-4 w-4" />
                  {conv.isPinned ? 'Unpin' : 'Pin'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(event) => handleRenameClick(conv, event)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(event) => handleDeleteClick(conv, event)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SidebarMenuItem>
      );
    },
    [
      draggedConversationId,
      handleDeleteClick,
      handlePin,
      handleRenameClick,
      pathname,
      projectLookup,
      router,
    ],
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

  if (conversations.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton disabled>
            <MessageSquare className="h-4 w-4" />
            <span className="text-muted-foreground">No conversations yet</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <>
      <SidebarMenu>
        {pinnedConversations.map(renderConversationRow)}
        {pinnedConversations.length > 0 && otherConversations.length > 0 && (
          <SidebarMenuItem>
            <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              Recent
            </div>
          </SidebarMenuItem>
        )}
        {otherConversations.map(renderConversationRow)}
      </SidebarMenu>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete “{selectedConv?.title}” and all its messages. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Conversation</DialogTitle>
            <DialogDescription>Enter a new title for this conversation</DialogDescription>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="Conversation title"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleRenameConfirm();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameConfirm} disabled={!newTitle.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
