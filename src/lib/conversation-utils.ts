/**
 * Generate a conversation title from the first user message
 */
export function generateConversationTitle(firstMessage: string, maxLength: number = 50): string {
  if (!firstMessage || !firstMessage.trim()) {
    return 'New Conversation';
  }

  // Remove markdown formatting
  let cleaned = firstMessage
    .replace(/[#*_`~]/g, '') // Remove markdown symbols
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Truncate to maxLength
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength).trim();
    
    // Try to end at a word boundary
    const lastSpace = cleaned.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) {
      cleaned = cleaned.substring(0, lastSpace);
    }
    
    cleaned += '...';
  }

  return cleaned || 'New Conversation';
}

/**
 * Format conversation timestamp for display
 */
export function formatConversationDate(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
