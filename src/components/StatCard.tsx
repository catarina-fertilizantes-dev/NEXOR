import { LucideIcon, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning";
  tooltip?: string;
  to?: string;
}

export const StatCard = ({ title, value, icon: Icon, trend, variant = "default", tooltip, to }: StatCardProps) => {
  const gradientClass = {
    default: "",
    primary: "bg-gradient-primary",
    success: "bg-gradient-success",
    warning: "bg-warning",
  }[variant];

  const iconBgClass = {
    default: "bg-muted",
    primary: gradientClass,
    success: gradientClass,
    warning: gradientClass,
  }[variant];

  const card = (
    <Card className={`overflow-hidden transition-all hover:shadow-md ${to ? "cursor-pointer hover:border-primary/40" : ""}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {tooltip && (
                <TooltipProvider>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <Info
                        className="h-3.5 w-3.5 text-muted-foreground/70 cursor-help"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-[220px]">{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
            {trend && (
              <p className={`mt-1 text-sm ${trend.positive ? "text-success" : "text-destructive"}`}>
                {trend.positive ? "↑" : "↓"} {trend.value}
              </p>
            )}
          </div>
          <div className={`rounded-xl p-3 ${iconBgClass}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        {card}
      </Link>
    );
  }

  return card;
};
