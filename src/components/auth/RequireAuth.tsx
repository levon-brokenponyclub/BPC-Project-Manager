import { Navigate, useLocation } from "react-router-dom";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/AuthProvider";

export function RequireAuth({
  children,
}: {
  children: React.ReactElement;
}): React.ReactElement {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-[1400px] space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
            <div className="surface p-4 space-y-3">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-4">
              <div className="surface p-4">
                <Skeleton className="h-12 w-full" />
              </div>
              <div className="surface p-5 space-y-3">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-4 w-72" />
                <Skeleton className="h-36 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
