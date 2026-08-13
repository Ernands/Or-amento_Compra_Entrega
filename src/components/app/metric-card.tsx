import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { integerFormatter } from "@/lib/format";

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: number;
  helper: string;
  icon: LucideIcon;
  tone?: "blue" | "yellow" | "green" | "red";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    yellow: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <Card className="overflow-hidden py-0 shadow-none">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{integerFormatter.format(value)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
        </div>
        <div className={`grid size-10 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}
