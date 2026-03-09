import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TasksSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={`task-filter-${index}`} className="h-8 w-20" />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 w-28" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border bg-stone-50/70 px-5 py-3">
          <div className="grid grid-cols-7 gap-4">
            {Array.from({ length: 7 }).map((_, index) => (
              <Skeleton key={`task-head-${index}`} className="h-4 w-full" />
            ))}
          </div>
        </div>
        <div className="space-y-2 p-5">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={`task-row-${index}`} className="grid grid-cols-7 gap-4">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
