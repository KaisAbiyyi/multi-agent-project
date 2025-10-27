import { memo } from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface RateLimitIndicatorProps {
  provider: 'openrouter' | 'llm7';
  remainingRequests?: number;
  totalRequests?: number;
  resetTime?: Date;
  isThrottled?: boolean;
}

/**
 * Rate Limit Indicator Component
 * Shows rate limit status for API providers that have request limits
 */
export const RateLimitIndicator = memo(function RateLimitIndicator({
  provider,
  remainingRequests,
  totalRequests = 100,
  resetTime,
  isThrottled = false,
}: RateLimitIndicatorProps) {
  if (remainingRequests === undefined) {
    return null;
  }

  const percentage = (remainingRequests / totalRequests) * 100;
  const isLow = percentage < 20;
  const isCritical = percentage < 10;

  const providerName = provider === 'openrouter' ? 'OpenRouter' : 'LLM7';

  return (
    <div className="space-y-2">
      {isThrottled && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Rate limit exceeded for {providerName}. Please wait before sending more requests.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">
            {providerName} Rate Limit
          </span>
        </div>
        <Badge 
          variant={isCritical ? 'destructive' : isLow ? 'secondary' : 'outline'}
          className="text-xs"
        >
          {remainingRequests}/{totalRequests}
        </Badge>
      </div>

      <Progress 
        value={percentage} 
        className="h-1"
      />

      {resetTime && isLow && (
        <p className="text-xs text-muted-foreground">
          Resets at {resetTime.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
});
