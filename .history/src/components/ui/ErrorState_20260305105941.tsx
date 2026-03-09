import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  error?: unknown;
  onRetry?: () => void;
}

function getErrorDetails(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}

export function ErrorState({
  message = "Something went wrong while loading data.",
  error,
  onRetry,
}: ErrorStateProps): React.ReactElement {
  const details = getErrorDetails(error);

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/50 px-6 py-8">
      <p className="text-base font-semibold text-red-800">{message}</p>
      {import.meta.env.DEV ? (
        <p className="mt-2 text-xs text-red-700/90">{details}</p>
      ) : null}
      {onRetry ? (
        <div className="mt-4">
          <Button type="button" variant="secondary" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );
}
