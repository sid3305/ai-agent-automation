import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MetricCardProps {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  trend?: {
    value: number | string;
    isPositive?: boolean;
    label?: string;
  };
  footer?: ReactNode;
  loading?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  footer,
  loading,
  className,
}: MetricCardProps) {
  if (loading) {
    return (
      <Card className={cn("p-5 flex flex-col justify-between border-border/30 bg-card/20 shadow-sm rounded-xl", className)}>
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-24 bg-muted/50 animate-pulse rounded" />
          <div className="h-4 w-4 bg-muted/50 animate-pulse rounded" />
        </div>
        <div className="h-8 w-16 bg-muted/50 animate-pulse rounded mb-2" />
        <div className="h-3 w-32 bg-muted/50 animate-pulse rounded" />
      </Card>
    );
  }

  return (
    <Card className={cn(
      "group relative p-5 flex flex-col justify-between border-border/30 bg-card/20 shadow-sm rounded-xl",
      "transition-all duration-300 hover:bg-card/40 hover:shadow-md hover:border-border/50",
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground/80 tracking-tight">
          {title}
        </h3>
        {Icon && (
          <div className="flex items-center justify-center text-muted-foreground/40 transition-colors duration-300 group-hover:text-foreground/70">
            <Icon className="size-4" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight text-foreground/95">
            {value}
          </span>
          {trend && (
            <span className={cn(
              "text-xs font-medium",
              trend.isPositive ? "text-success/90" : "text-destructive/90"
            )}>
              <span className="sr-only">{trend.isPositive ? "Increased by" : "Decreased by"}</span>
              <span aria-hidden="true">{trend.isPositive ? "+" : ""}</span>
              {trend.value}
            </span>
          )}
        </div>
        
        {(subtitle || trend?.label) && (
          <p className="text-xs text-muted-foreground/60 font-medium">
            {subtitle} {trend?.label && <span className="ml-1">{trend.label}</span>}
          </p>
        )}
      </div>

      {footer && (
        <div className="mt-4 pt-4 border-t border-border/20 text-xs text-muted-foreground/60">
          {footer}
        </div>
      )}
    </Card>
  );
}
