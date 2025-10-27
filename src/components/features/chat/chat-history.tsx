'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { db } from '@/lib/db';
import type { Conversation } from '@/types';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { MessageSquare, Loader2, Pin, Trash2, Edit2, MoreVertical, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { useConversationSearch } from '@/hooks/use-conversation-search';
import { sanitizeInput } from '@/lib/security';

export function ChatHistory() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [newTitle, setNewTitle] = useState('');
  
  // Search functionality
  const { searchQuery, setSearchQuery, filteredConversations, isSearching } = useConversationSearch({
    conversations,
    searchKeys: ['title'],
  });

  const loadConversations = useCallback(async () => {
    try {
      const convs = await db.conversations
        .orderBy('updatedAt')
        .reverse()
        .limit(20)
        .toArray();
      
      // Sort: pinned first, then by updatedAt
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

    // Reload every 2 seconds to catch new conversations
    const interval = setInterval(loadConversations, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [loadConversations]);

  const handlePin = useCallback(async (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
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
        description: 'Failed to pin conversation',
        variant: 'destructive',
      });
    }
  }, [loadConversations, toast]);

  const handleDeleteClick = useCallback((conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedConv(conv);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedConv) return;
    
    try {
      // Delete all messages in conversation
      await db.messages.where('conversationId').equals(selectedConv.id).delete();
      // Delete conversation
      await db.conversations.delete(selectedConv.id);
      
      await loadConversations();
      
      toast({
        title: 'Deleted',
        description: 'Conversation deleted successfully',
      });
      
      // If we're on the deleted conversation page, redirect home
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

  const handleRenameClick = useCallback((conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedConv(conv);
    setNewTitle(conv.title);
    setRenameDialogOpen(true);
  }, []);

  const handleRenameConfirm = useCallback(async () => {
    if (!selectedConv || !newTitle.trim()) return;
    
    // Sanitize input to prevent XSS
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

  // Use filtered conversations if searching, otherwise use all conversations
  const displayConversations = searchQuery.trim() ? filteredConversations : conversations;
  const pinnedConversations = displayConversations.filter((conv) => conv.isPinned);
  const otherConversations = displayConversations.filter((conv) => !conv.isPinned);

  return (
    <>
      <SidebarMenu>
        {pinnedConversations.map((conv) => {
          const isActive = pathname === `/chat/${conv.id}`;

          return (
            <SidebarMenuItem key={conv.id}>
              <div className="flex items-center gap-1 w-full group">
                <SidebarMenuButton
                  onClick={() => router.push(`/chat/${conv.id}`)}
                  isActive={isActive}
                  className="flex-1"
                >
                  <span className="truncate flex-1">{conv.title}</span>
                  {conv.isPinned && <Pin className="h-3 w-3 flex-shrink-0 text-muted-foreground" />}
                </SidebarMenuButton>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => handlePin(conv, e as React.MouseEvent)}>
                      <Pin className="h-4 w-4 mr-2" />
                      Unpin
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleRenameClick(conv, e as React.MouseEvent)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => handleDeleteClick(conv, e as React.MouseEvent)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </SidebarMenuItem>
          );
        })}
        {pinnedConversations.length > 0 && otherConversations.length > 0 && (
          <div className="px-3 py-1">
            <Separator />
          </div>
        )}
        {otherConversations.map((conv) => {
          const isActive = pathname === `/chat/${conv.id}`;

          return (
            <SidebarMenuItem key={conv.id}>
              <div className="flex items-center gap-1 w-full group">
                <SidebarMenuButton
                  onClick={() => router.push(`/chat/${conv.id}`)}
                  isActive={isActive}
                  className="flex-1"
                >
                  <span className="truncate flex-1">{conv.title}</span>
                </SidebarMenuButton>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => handlePin(conv, e as React.MouseEvent)}>
                      <Pin className="h-4 w-4 mr-2" />
                      Pin
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => handleRenameClick(conv, e as React.MouseEvent)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => handleDeleteClick(conv, e as React.MouseEvent)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{selectedConv?.title}&rdquo; and all its messages. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Conversation</DialogTitle>
            <DialogDescription>
              Enter a new title for this conversation
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Conversation title"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
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

      {/* Search Dialog */}
      <Dialog open={searchDialogOpen} onOpenChange={(open) => {
        setSearchDialogOpen(open);
        if (!open) setSearchQuery('');
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Search Conversations</DialogTitle>
            <DialogDescription>
              Find your past conversations by title
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Type to search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                autoFocus
              />
            </div>
            
            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            
            {!isSearching && searchQuery.trim() && (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {displayConversations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No conversations found matching &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  <>
                    <div className="text-sm text-muted-foreground px-2">
                      {displayConversations.length} result{displayConversations.length === 1 ? '' : 's'} found
                    </div>
                    {displayConversations.map((conv) => {
                      const isActive = pathname === `/chat/${conv.id}`;
                      return (
                        <button
                          key={conv.id}
                          onClick={() => {
                            router.push(`/chat/${conv.id}`);
                            setSearchDialogOpen(false);
                            setSearchQuery('');
                          }}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                            'hover:bg-accent',
                            isActive && 'bg-accent'
                          )}
                        >
                          <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{conv.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(conv.updatedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                          {conv.isPinned && (
                            <Pin className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                          )}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}
            
            {!searchQuery.trim() && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Start typing to search your conversations
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
