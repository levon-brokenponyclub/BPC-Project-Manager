import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-sm font-medium transition-colors duration-150 focus-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "border border-[#6C77E5] bg-[#5E69D1] text-[#FEFEFF] shadow-[0px_4px_4px_-1px_rgba(0,0,0,0.05),0px_1px_1px_rgba(0,0,0,0.1)] hover:bg-[#6A76EB] active:bg-[#5763D8]",
        secondary:
          "border border-border bg-surface text-foreground hover:bg-surface/80 active:bg-surface/60",
        ghost:
          "border border-transparent bg-transparent text-muted hover:bg-surface hover:text-foreground active:bg-surface/80",
      },
      size: {
        sm: "h-9 gap-1.5 px-3 text-[13px] leading-4",
        md: "h-10 gap-2 px-4 text-[13px] leading-4",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
