import { ReactNode, useState } from "react";
import { LucideIcon, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  variant?: "default" | "primary" | "success" | "warning";
  tooltip?: ReactNode;
  to?: string;
  /** Fundo levemente colorido no card inteiro (não só no ícone), pra destacar cards de status/alerta. Só some visualmente pra variant success/warning. */
  highlightBg?: boolean;
  /** Alternativa a `to`: abre algo local (ex: modal) em vez de navegar. Ignorado se `to` também for passado. */
  onClick?: () => void;
}

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  tooltip,
  to,
  highlightBg,
  onClick,
}: StatCardProps) => {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const gradientClass = {
    default: "",
    primary: "bg-gradient-primary",
    success: "bg-gradient-success",
    warning: "bg-warning",
  }[variant];

  const iconBgClass = {
    default: "bg-muted-foreground",
    primary: gradientClass,
    success: gradientClass,
    warning: gradientClass,
  }[variant];

  const highlightBgClass = highlightBg
    ? { default: "", primary: "", success: "bg-green-100", warning: "bg-amber-100" }[variant]
    : "";

  const card = (
    <Card
      className={`h-full flex flex-col overflow-hidden transition-all hover:shadow-md ${highlightBgClass} ${to || onClick ? "cursor-pointer hover:border-primary/40" : ""}`}
      onClick={!to ? onClick : undefined}
    >
      <CardContent className="flex-1 flex items-center p-6">
        <div className="flex w-full items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {tooltip && (
                <Popover open={tooltipOpen} onOpenChange={setTooltipOpen}>
                  <PopoverTrigger asChild>
                    <Info
                      className="h-3.5 w-3.5 text-muted-foreground/70 cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTooltipOpen((o) => !o);
                      }}
                    />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto max-w-[220px] p-2">
                    <div className="text-sm">{tooltip}</div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
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
      <Link to={to} className="block h-full">
        {card}
      </Link>
    );
  }

  return card;
};
