import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SettingsSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="mt-2 h-4 w-64" />
      </Card>

      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={`settings-card-${index}`} className="p-5">
          <Skeleton className="h-5 w-40" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      ))}

      <Card className="p-5">
        <Skeleton className="h-5 w-36" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={`bucket-${index}`} className="h-14 w-full" />
          ))}
        </div>
      </Card>
    </div>
  );
}
