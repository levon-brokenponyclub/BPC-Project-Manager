import { useEffect, useRef, useState } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

interface DataStateWrapperProps {
  isLoading: boolean;
  isError?: boolean;
  error?: unknown;
  isEmpty?: boolean;
  skeleton: React.ReactNode;
  empty?: React.ReactNode;
  errorState?: React.ReactNode;
  onRetry?: () => void;
  children: React.ReactNode;
  minDelayMs?: number;
}

export function DataStateWrapper({
  isLoading,
  isError = false,
  error,
  isEmpty = false,
  skeleton,
  empty,
  errorState,
  onRetry,
  children,
  minDelayMs = 350,
}: DataStateWrapperProps): React.ReactElement {
  const loadingStartRef = useRef<number | null>(null);
  const [isMinDelayActive, setIsMinDelayActive] = useState(false);

  useEffect(() => {
    if (isLoading) {
      if (loadingStartRef.current === null) {
        loadingStartRef.current = Date.now();
      }
      setIsMinDelayActive(true);
      return;
    }

    if (loadingStartRef.current === null) {
      setIsMinDelayActive(false);
      return;
    }

    const elapsedMs = Date.now() - loadingStartRef.current;
    const remainingMs = Math.max(0, minDelayMs - elapsedMs);

    const timeoutId = window.setTimeout(() => {
      loadingStartRef.current = null;
      setIsMinDelayActive(false);
    }, remainingMs);

    return () => window.clearTimeout(timeoutId);
  }, [isLoading, minDelayMs]);

  const shouldShowSkeleton = isLoading || isMinDelayActive;

  if (shouldShowSkeleton) {
    return <>{skeleton}</>;
  }

  if (isError) {
    return <>{errorState ?? <ErrorState error={error} onRetry={onRetry} />}</>;
  }

  if (isEmpty) {
    return (
      <>
        {empty ?? (
          <EmptyState
            title="No data found"
            description="There is no data to show yet."
          />
        )}
      </>
    );
  }

  return <>{children}</>;
}
