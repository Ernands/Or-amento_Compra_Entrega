import { AlertTriangle, CheckCircle2, Database } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { DataSourceInfo } from "@/domain/entities";
import { dateFormatter } from "@/lib/format";

export function SourceBanner({ source }: { source: DataSourceInfo }) {
  const connected = source.status === "connected";
  const Icon = connected ? CheckCircle2 : source.status === "error" ? AlertTriangle : Database;
  return (
    <Alert className={connected ? "border-emerald-200 bg-emerald-50/80" : "border-amber-200 bg-amber-50/80"}>
      <Icon className={connected ? "text-emerald-700" : "text-amber-700"} />
      <AlertTitle>{connected ? "Sincronização ao vivo ativa" : "Modo de leitura segura"}</AlertTitle>
      <AlertDescription className="mt-1 max-w-5xl text-xs leading-relaxed sm:text-sm">
        {source.message} Última versão verificada em {dateFormatter.format(new Date(source.modifiedAt))}.
      </AlertDescription>
    </Alert>
  );
}
