import { Card } from "@/components/ui/card";

export function TasksSkeleton(): React.ReactElement {
  return (
    <Card className="overflow-hidden border-[#222330] bg-[#191A22]">
      {/* toolbar row */}
      <div className="flex h-13 items-center border-b border-[#222330] px-6 py-2">
        <div className="h-4 w-20 animate-pulse rounded bg-muted/20" />
      </div>

      {/* status group header */}
      <div className="h-10 border-b border-[#222330] bg-[#1E1F2A] px-6">
        <div className="flex h-full items-center gap-3">
          <div className="h-3 w-3 animate-pulse rounded-full bg-muted/20" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted/20" />
        </div>
      </div>

      {/* task rows */}
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={`task-row-${index}`}
          className="grid h-11 grid-cols-[1fr_60px_120px_60px] items-center border-b border-[#292B38] bg-[#191A22] px-6"
        >
          <div className="h-4 w-[55%] animate-pulse rounded bg-muted/20" />
          <div className="h-7 w-7 animate-pulse rounded-full bg-muted/20" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted/20" />
          <div className="h-7 w-7 animate-pulse rounded-full bg-muted/20" />
        </div>
      ))}
    </Card>
  );
}
