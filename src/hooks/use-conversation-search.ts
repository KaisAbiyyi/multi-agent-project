'use client';

import { useState, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import Fuse from 'fuse.js';
import type { Conversation } from '@/types';

interface UseConversationSearchOptions {
  conversations: Conversation[];
  searchKeys?: string[];
}

/**
 * Hook for fuzzy searching conversations
 */
export function useConversationSearch({
  conversations,
  searchKeys = ['title', 'agentNames'],
}: UseConversationSearchOptions) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 300);

  const fuse = useMemo(() => {
    return new Fuse(conversations, {
      keys: searchKeys,
      threshold: 0.3,
      ignoreLocation: true,
    });
  }, [conversations, searchKeys]);

  const filteredConversations = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return conversations;
    }

    const results = fuse.search(debouncedQuery);
    return results.map(result => result.item);
  }, [conversations, debouncedQuery, fuse]);

  return {
    searchQuery,
    setSearchQuery,
    filteredConversations,
    isSearching: searchQuery !== debouncedQuery,
  };
}
