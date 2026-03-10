import { Card } from "@/components/ui/card";

export function SettingsSkeleton(): React.ReactElement {
  return (
    <div className="space-y-6 text-[#1A1A1A] dark:text-foreground">
      {/* Page title */}
      <Card className="border-[#DCDCDC] bg-white p-5 dark:border-[#222330] dark:bg-[#191A22]">
        <div className="h-6 w-48 animate-pulse rounded bg-muted/20" />
        <div className="mt-2 h-4 w-60 animate-pulse rounded bg-muted/20" />
      </Card>

      {/* Settings sections */}
      {Array.from({ length: 3 }).map((_, index) => (
        <Card
          key={`settings-card-${index}`}
          className="overflow-hidden border-[#DCDCDC] bg-white dark:border-[#222330] dark:bg-[#191A22]"
        >
          {/* section header */}
          <div className="border-b border-[#DCDCDC] px-6 py-4 dark:border-[#222330]">
            <div className="h-4 w-36 animate-pulse rounded bg-muted/20" />
          </div>
          {/* fields */}
          <div className="space-y-3 p-6">
            <div className="h-10 w-full animate-pulse rounded bg-muted/20" />
            <div className="h-10 w-full animate-pulse rounded bg-muted/20" />
            <div className="h-10 w-2/3 animate-pulse rounded bg-muted/20" />
          </div>
        </Card>
      ))}

      {/* Storage / bucket card */}
      <Card className="overflow-hidden border-[#DCDCDC] bg-white dark:border-[#222330] dark:bg-[#191A22]">
        <div className="border-b border-[#DCDCDC] px-6 py-4 dark:border-[#222330]">
          <div className="h-4 w-28 animate-pulse rounded bg-muted/20" />
        </div>
        <div className="space-y-2 p-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`bucket-${index}`}
              className="h-14 w-full animate-pulse rounded-[4px] bg-muted/20"
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
