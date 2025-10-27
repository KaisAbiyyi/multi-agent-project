import { useState, useCallback, useEffect } from 'react';
import { rateLimiter } from '@/lib/security';

interface RateLimitState {
  remaining: number;
  total: number;
  isThrottled: boolean;
  resetTime: Date | null;
}

/**
 * Hook to track and display rate limit status for API providers
 */
export function useRateLimit(provider: 'openrouter' | 'llm7', maxRequests = 100, windowMs = 60000) {
  const [state, setState] = useState<RateLimitState>({
    remaining: maxRequests,
    total: maxRequests,
    isThrottled: false,
    resetTime: null,
  });

  // Check if request is allowed
  const checkLimit = useCallback((): boolean => {
    const allowed = rateLimiter.isAllowed(provider, maxRequests, windowMs);
    const remaining = rateLimiter.getRemaining(provider, maxRequests, windowMs);
    
    setState({
      remaining,
      total: maxRequests,
      isThrottled: !allowed,
      resetTime: remaining < maxRequests ? new Date(Date.now() + windowMs) : null,
    });

    return allowed;
  }, [provider, maxRequests, windowMs]);

  // Update state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = rateLimiter.getRemaining(provider, maxRequests, windowMs);
      
      setState(prev => ({
        ...prev,
        remaining,
        isThrottled: remaining === 0,
        resetTime: remaining < maxRequests ? new Date(Date.now() + windowMs) : null,
      }));
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [provider, maxRequests, windowMs]);

  return {
    ...state,
    checkLimit,
  };
}
