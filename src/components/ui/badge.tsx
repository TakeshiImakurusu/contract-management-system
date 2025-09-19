import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = {
  default:
    "inline-flex items-center rounded-full border border-transparent bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground",
  secondary:
    "inline-flex items-center rounded-full border border-transparent bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground",
  outline: "inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground",
  muted:
    "inline-flex items-center rounded-full border border-transparent bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground",
  success:
    "inline-flex items-center rounded-full border border-transparent bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700",
  warning:
    "inline-flex items-center rounded-full border border-transparent bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800",
  danger:
    "inline-flex items-center rounded-full border border-transparent bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700",
  info:
    "inline-flex items-center rounded-full border border-transparent bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof badgeVariants;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return <span className={cn(badgeVariants[variant], className)} {...props} />;
}

export { Badge, badgeVariants };
