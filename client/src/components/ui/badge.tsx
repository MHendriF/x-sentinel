import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-mono font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-amber-500/30 bg-amber-500/10 text-amber-400",
        secondary:
          "border-slate-700 bg-obsidian-750 text-slate-300",
        success:
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        destructive:
          "border-red-500/30 bg-red-500/10 text-red-400",
        purple:
          "border-purple-500/30 bg-purple-500/10 text-purple-300",
        blue:
          "border-blue-500/30 bg-blue-500/10 text-blue-400",
        outline:
          "border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
