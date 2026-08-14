import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatStatus } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLocaleUpperCase("pt-BR").replaceAll(" ", "_");
  return (
    <Badge
      variant="outline"
      className={cn(
        "whitespace-nowrap font-medium",
        normalized.includes("PENDENTE") && "border-amber-200 bg-amber-50 text-amber-800",
        normalized.includes("NAO_INICIADO") && "border-slate-200 bg-slate-50 text-slate-700",
        (normalized.includes("COTACAO") || normalized.includes("TRANSPORTE")) && "border-blue-200 bg-blue-50 text-blue-800",
        (normalized.includes("CONCLUIDO") || normalized.includes("ENTREGUE") || normalized === "ATIVO") && "border-emerald-200 bg-emerald-50 text-emerald-800",
        (normalized.includes("DIVERGENCIA") || normalized.includes("CANCELADO") || normalized === "INATIVO") && "border-red-200 bg-red-50 text-red-800",
      )}
    >
      {formatStatus(normalized)}
    </Badge>
  );
}
