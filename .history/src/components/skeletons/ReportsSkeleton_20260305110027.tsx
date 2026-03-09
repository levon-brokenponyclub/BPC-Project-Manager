import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ReportsSkeleton(): React.ReactElement {
  return (
    <Card className="p-5">
      <Skeleton className="h-7 w-56" />
      <Skeleton className="mt-2 h-4 w-72" />

      <div className="mt-6 overflow-hidden rounded-xl border border-border p-5">
        <div className="grid grid-cols-2 gap-4 pb-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={`report-row-${index}`} className="grid grid-cols-2 gap-4">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
