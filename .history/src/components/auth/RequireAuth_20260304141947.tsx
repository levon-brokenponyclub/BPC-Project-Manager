import { Navigate, useLocation } from "react-router-dom";

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-2xl border border-border bg-white px-6 py-4 text-sm text-muted shadow-soft">
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
