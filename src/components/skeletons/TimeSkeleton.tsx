import { Card } from "@/components/ui/card";

export function TimeSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Timer widget card */}
      <Card className="border-[#222330] bg-[#191A22] p-5">
        <div className="h-5 w-40 animate-pulse rounded bg-muted/20" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted/20" />
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="h-10 w-[260px] animate-pulse rounded bg-muted/20" />
          <div className="h-10 w-28 animate-pulse rounded bg-muted/20" />
          <div className="h-10 w-28 animate-pulse rounded bg-muted/20" />
        </div>
      </Card>

      {/* Time entries table */}
      <Card className="overflow-hidden border-[#222330] bg-[#191A22]">
        {/* toolbar */}
        <div className="flex h-13 items-center border-b border-[#222330] px-6 py-2">
          <div className="h-4 w-28 animate-pulse rounded bg-muted/20" />
        </div>
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={`entry-${index}`}
            className="grid h-12 grid-cols-[1fr_120px_80px] items-center border-b border-[#292B38] bg-[#191A22] px-6"
          >
            <div className="h-4 w-[50%] animate-pulse rounded bg-muted/20" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted/20" />
            <div className="h-4 w-12 animate-pulse rounded bg-muted/20" />
          </div>
        ))}
      </Card>
    </div>
  );
}
