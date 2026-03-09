import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-44" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-20" />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`metric-${index}`}
              className="rounded-xl border border-border p-4"
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-8 w-20" />
            </div>
          ))}
        </div>

        <Skeleton className="mt-6 h-3 w-full" />
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border p-5">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="space-y-3 p-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`recent-task-${index}`}
              className="grid grid-cols-5 gap-4"
            >
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-7 w-7 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
