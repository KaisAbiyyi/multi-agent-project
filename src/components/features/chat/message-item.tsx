import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Bot, User, Copy, Check } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MarkdownRenderer } from '@/components/shared/markdown-renderer';
import { Badge } from '@/components/ui/badge';
import type { Message } from '@/types';

interface MessageItemProps {
  message: Message;
  agentName?: string;
}

/**
 * Memoized message item component to prevent unnecessary re-renders
 * Only re-renders when message content or agent name changes
 */
export const MessageItem = memo(function MessageItem({ message, agentName }: MessageItemProps) {
  const isUser = message.role === 'user';
  const displayName = message.authorLabel || agentName || 'AI';
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const CopyIcon = isCopied ? Check : Copy;

  const handleCopy = useCallback(() => {
    if (!message.content) {
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      console.warn('[MessageItem] Clipboard API unavailable');
      return;
    }

    navigator.clipboard
      .writeText(message.content)
      .then(() => {
        setIsCopied(true);
        if (copyTimeoutRef.current) {
          clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = setTimeout(() => {
          setIsCopied(false);
        }, 1500);
      })
      .catch((error) => {
        console.error('[MessageItem] Failed to copy message content:', error);
      });
  }, [message.content]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`flex gap-4 ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {!isUser && (
        <Avatar className="mt-1 h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className="group flex max-w-[80%] flex-1 flex-col gap-3">
        <div
          className={`${
            isUser
              ? 'bg-primary text-primary-foreground self-end rounded-lg p-4'
              : 'self-start space-y-2 text-foreground'
          }`}
        >
          {!isUser && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{displayName}</span>
              {message.stageLabel && (
                <Badge variant="outline" className="text-xs">
                  {message.stageLabel}
                </Badge>
              )}
            </div>
          )}

          {message.initialContent && message.initialContent !== message.content && (
            <div className="bg-muted-foreground/10 mb-3 rounded border-l-2 border-primary/50 p-2 text-xs italic">
              <MarkdownRenderer content={message.initialContent} />
            </div>
          )}

          <div className="prose prose-sm dark:prose-invert max-w-none break-words">
            {message.content ? (
              <MarkdownRenderer content={message.content} />
            ) : (
              <div className="text-muted-foreground flex items-center gap-2">
                <div className="flex gap-1">
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-current"
                    style={{ animationDelay: '0ms' }}
                  ></span>
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-current"
                    style={{ animationDelay: '150ms' }}
                  ></span>
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-current"
                    style={{ animationDelay: '300ms' }}
                  ></span>
                </div>
                <span className="text-xs">Thinking...</span>
              </div>
            )}
          </div>

          <div className="mt-2 text-xs opacity-70">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          disabled={!message.content}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background/90 text-muted-foreground opacity-0 shadow-sm transition-opacity duration-150 disabled:pointer-events-none disabled:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 ${
            isUser
              ? 'self-end hover:text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground'
              : 'self-start hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted-foreground'
          }`}
          aria-label={isCopied ? 'Message copied' : 'Copy message'}
        >
          <CopyIcon className="h-4 w-4" />
        </button>
      </div>

      {isUser && (
        <Avatar className="mt-1 h-8 w-8">
          <AvatarFallback className="bg-secondary">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.stageLabel === nextProps.message.stageLabel &&
    prevProps.message.initialContent === nextProps.message.initialContent &&
    prevProps.agentName === nextProps.agentName
  );
});
