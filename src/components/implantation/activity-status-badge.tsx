import { Badge } from "@/components/ui/badge";
import { implantationStatusLabel, type ImplantationActivityView } from "@/domain/implantation-operational";

export function ActivityStatusBadge({ status }: Pick<ImplantationActivityView, "status">) {
  const variant = status === "CONCLUIDO" ? "default" : status === "BLOQUEADO" || status === "CANCELADO" ? "destructive" : "outline";
  return <Badge variant={variant}>{implantationStatusLabel(status)}</Badge>;
}
