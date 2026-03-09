import { Card } from "@/components/ui/card";

export function ReportsSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card className="border-[#222330] bg-[#191A22] p-5">
        <div className="h-6 w-48 animate-pulse rounded bg-muted/20" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted/20" />
      </Card>

      {/* Report table */}
      <Card className="overflow-hidden border-[#222330] bg-[#191A22]">
        {/* column headers */}
        <div className="grid h-10 grid-cols-[1fr_140px_100px] items-center border-b border-[#222330] bg-[#1E1F2A] px-6">
          <div className="h-3 w-24 animate-pulse rounded bg-muted/20" />
          <div className="h-3 w-20 animate-pulse rounded bg-muted/20" />
          <div className="h-3 w-16 animate-pulse rounded bg-muted/20" />
        </div>
        {/* rows */}
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={`report-row-${index}`}
            className="grid h-11 grid-cols-[1fr_140px_100px] items-center border-b border-[#292B38] bg-[#191A22] px-6"
          >
            <div className="h-4 w-[55%] animate-pulse rounded bg-muted/20" />
            <div className="h-4 w-20 animate-pulse rounded bg-muted/20" />
            <div className="h-4 w-14 animate-pulse rounded bg-muted/20" />
          </div>
        ))}
      </Card>
    </div>
  );
}
