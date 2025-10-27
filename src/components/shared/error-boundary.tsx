'use client';

import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Alert variant="destructive" className="max-w-2xl">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription className="mt-4 space-y-4">
          <p className="text-sm">
            We encountered an unexpected error. This has been logged and we&apos;ll look into it.
          </p>
          <details className="text-xs">
            <summary className="cursor-pointer font-medium">Error details</summary>
            <pre className="mt-2 overflow-auto rounded bg-muted p-2">
              {error.message}
            </pre>
          </details>
          <div className="flex gap-2">
            <Button onClick={resetErrorBoundary} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
            <Button onClick={() => router.push('/')} variant="outline" size="sm">
              <Home className="mr-2 h-4 w-4" />
              Go home
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        // Log to console in development
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
        
        // In production, you could send to error tracking service
        // e.g., Sentry.captureException(error);
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
