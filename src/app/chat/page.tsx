'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { Loader2 } from 'lucide-react';

export default function ChatRedirect() {
  const router = useRouter();

  useEffect(() => {
    const redirectToChat = async () => {
      try {
        // Get the most recent conversation
        const conversations = await db.conversations
          .orderBy('updatedAt')
          .reverse()
          .limit(1)
          .toArray();

        if (conversations.length > 0 && conversations[0]) {
          // Redirect to most recent conversation
          router.replace(`/chat/${conversations[0].id}`);
        } else {
          // No conversations, redirect to home to create one
          router.replace('/');
        }
      } catch (error) {
        console.error('[Chat Redirect] Error:', error);
        router.replace('/');
      }
    };

    redirectToChat();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
