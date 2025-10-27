'use client';

import { useHotkeys } from 'react-hotkeys-hook';
import { useRouter } from 'next/navigation';

interface UseGlobalShortcutsOptions {
  onNewChat?: () => void;
  onSearch?: () => void;
  onSettings?: () => void;
  onSend?: () => void;
}

/**
 * Global keyboard shortcuts for the app
 */
export function useGlobalShortcuts({
  onNewChat,
  onSearch,
  onSettings,
  onSend,
}: UseGlobalShortcutsOptions = {}) {
  const router = useRouter();

  // Cmd/Ctrl + N: New chat
  useHotkeys('mod+n', (e) => {
    e.preventDefault();
    if (onNewChat) {
      onNewChat();
    } else {
      router.push('/');
    }
  }, { enableOnFormTags: false });

  // Cmd/Ctrl + K: Search conversations
  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch();
    }
  }, { enableOnFormTags: false });

  // Cmd/Ctrl + ,: Settings
  useHotkeys('mod+,', (e) => {
    e.preventDefault();
    if (onSettings) {
      onSettings();
    }
  }, { enableOnFormTags: false });

  // Cmd/Ctrl + Enter: Send message (only in textareas)
  useHotkeys('mod+enter', (e) => {
    if (onSend) {
      e.preventDefault();
      onSend();
    }
  }, { enableOnFormTags: ['TEXTAREA'] });

  // Escape: Close dialogs/modals (handled by components)
  useHotkeys('escape', () => {
    // Handled by individual dialog components
  }, { enableOnFormTags: true });
}

/**
 * Hook for textarea-specific shortcuts
 */
export function useTextareaShortcuts({
  onSubmit,
}: {
  onSubmit: () => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}) {
  useHotkeys('mod+enter', (e) => {
    e.preventDefault();
    onSubmit();
  }, {
    enableOnFormTags: ['TEXTAREA'],
    enabled: true,
  });

  useHotkeys('shift+enter', () => {
    // Allow shift+enter for new lines (default behavior)
  }, {
    enableOnFormTags: ['TEXTAREA'],
  });
}
