import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  className?: string;
}

export function Avatar({ src, name, className }: AvatarProps) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#2A2C38] bg-[#191A22]",
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={name ?? "Avatar"}
          className="size-full object-cover"
        />
      ) : (
        <span className="text-[10px] font-medium text-[#8B8C9E]">
          {getInitials(name)}
        </span>
      )}
    </div>
  );
}
