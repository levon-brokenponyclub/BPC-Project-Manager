import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TimeSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-4 w-72" />
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Skeleton className="h-10 w-[260px]" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </Card>

      <Card className="p-5">
        <Skeleton className="h-6 w-28" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={`entry-${index}`} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}
