import { AlertTriangle, CheckCircle2, Database, Eye } from "lucide-react";

import type { DataSourceInfo } from "@/domain/entities";
import { dateFormatter } from "@/lib/format";

export function SourceStatusCompact({ source, visitor, loading }: { source: DataSourceInfo | null; visitor: boolean; loading: boolean }) {
  if (loading && !source) {
    return <StatusFrame icon={<Database className="size-3.5 animate-pulse" />} title="Carregando dados" detail="Sincronizando o Dashboard…" />;
  }
  if (visitor) {
    return <StatusFrame icon={<Eye className="size-3.5 text-blue-700" />} title="Modo visitante — somente leitura" detail="Você pode visualizar os dados operacionais, mas nenhuma alteração é permitida." />;
  }
  if (!source) return null;
  const connected = source.status === "connected";
  const Icon = connected ? CheckCircle2 : source.status === "error" ? AlertTriangle : Database;
  const title = connected ? "Sincronização ao vivo ativa" : "Modo de leitura segura";
  const detail = `${source.message}${source.checkedAt ? ` ${connected ? "Conexão conferida" : "Snapshot conferido"} em ${dateFormatter.format(new Date(source.checkedAt))}.` : ""}`;
  return <StatusFrame icon={<Icon className={`size-3.5 ${connected ? "text-emerald-700" : "text-amber-700"}`} />} title={title} detail={detail} />;
}

function StatusFrame({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return <div className="hidden min-w-0 max-w-[520px] items-center gap-2 rounded-lg border bg-muted/35 px-2.5 py-1.5 md:flex" title={detail}><span className="shrink-0">{icon}</span><div className="min-w-0 leading-tight"><p className="truncate text-[11px] font-medium">{title}</p><p className="truncate text-[10px] text-muted-foreground">{detail}</p></div></div>;
}
