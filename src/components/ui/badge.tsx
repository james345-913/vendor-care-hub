import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        open: "border-transparent bg-ochre/30 text-ochre-foreground",
        in_review: "border-transparent bg-info/15 text-info",
        resolved: "border-transparent bg-success/15 text-success",
        closed: "border-transparent bg-muted text-muted-foreground",
        pending: "border-transparent bg-ochre/30 text-ochre-foreground",
        active: "border-transparent bg-success/15 text-success",
        suspended: "border-transparent bg-destructive/15 text-destructive",
        high: "border-transparent bg-accent/15 text-accent",
        meeting: "border-transparent bg-primary/12 text-primary",
        notice: "border-transparent bg-accent/12 text-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
