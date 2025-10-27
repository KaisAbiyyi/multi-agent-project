'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Search, Loader2, MessageSquare } from 'lucide-react';
import { useConversationSearch } from '@/hooks/use-conversation-search';
import type { Conversation } from '@/types';
import { cn } from '@/lib/utils';

interface SearchConversationsProps {
  onSelect?: () => void;
}

export function SearchConversations({ onSelect }: SearchConversationsProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { searchQuery, setSearchQuery, filteredConversations, isSearching } = useConversationSearch({
    conversations,
    searchKeys: ['title'],
  });

  const loadConversations = useCallback(async () => {
    try {
      const convs = await db.conversations
        .orderBy('updatedAt')
        .reverse()
        .toArray();
      
      setConversations(convs);
    } catch (error) {
      console.error('[SearchConversations] Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleSelect = useCallback((convId: string) => {
    router.push(`/chat/${convId}`);
    onSelect?.();
  }, [router, onSelect]);

  const displayConversations = searchQuery.trim() ? filteredConversations : conversations;

  return (
    <div className="flex flex-col gap-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          autoFocus
        />
      </div>

      {/* Results */}
      <ScrollArea className="h-[400px] -mx-6 px-6">
        {isLoading || isSearching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : displayConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery.trim() ? 'No conversations found' : 'No conversations yet'}
            </p>
            {searchQuery.trim() && (
              <p className="text-xs text-muted-foreground mt-1">
                Try a different search term
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {displayConversations.map((conv) => (
              <Button
                key={conv.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-left font-normal h-auto py-3 px-3",
                  "hover:bg-accent"
                )}
                onClick={() => handleSelect(conv.id)}
              >
                <div className="flex flex-col gap-1 w-full min-w-0">
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
              </Button>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Results Count */}
      {!isLoading && !isSearching && displayConversations.length > 0 && (
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          {searchQuery.trim() 
            ? `${displayConversations.length} result${displayConversations.length !== 1 ? 's' : ''} found`
            : `${displayConversations.length} conversation${displayConversations.length !== 1 ? 's' : ''} total`
          }
        </div>
      )}
    </div>
  );
}
