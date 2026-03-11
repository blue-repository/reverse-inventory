import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "border-slate-300 bg-slate-100 text-slate-800",
        success: "border-emerald-300 bg-emerald-100 text-emerald-800",
        warning: "border-amber-300 bg-amber-100 text-amber-900",
        danger: "border-red-300 bg-red-100 text-red-800",
        info: "border-blue-300 bg-blue-100 text-blue-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
