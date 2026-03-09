import { Card } from "@/components/ui/card";

export function DashboardSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card
            key={`stat-${index}`}
            className="border-[#222330] bg-[#191A22] p-5"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-muted/20" />
            <div className="mt-3 h-8 w-20 animate-pulse rounded bg-muted/20" />
          </Card>
        ))}
      </div>

      {/* Recent tasks table */}
      <Card className="overflow-hidden border-[#222330] bg-[#191A22]">
        {/* toolbar */}
        <div className="flex h-13 items-center border-b border-[#222330] px-6 py-2">
          <div className="h-4 w-32 animate-pulse rounded bg-muted/20" />
        </div>

        {/* status group header */}
        <div className="h-10 border-b border-[#222330] bg-[#1E1F2A] px-6">
          <div className="flex h-full items-center gap-3">
            <div className="h-3 w-3 animate-pulse rounded-full bg-muted/20" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted/20" />
          </div>
        </div>

        {/* task rows */}
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`task-${index}`}
            className="grid h-11 grid-cols-[1fr_60px_120px_60px] items-center border-b border-[#292B38] bg-[#191A22] px-6"
          >
            <div className="h-4 w-[60%] animate-pulse rounded bg-muted/20" />
            <div className="h-7 w-7 animate-pulse rounded-full bg-muted/20" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted/20" />
            <div className="h-7 w-7 animate-pulse rounded-full bg-muted/20" />
          </div>
        ))}
      </Card>
    </div>
  );
}
