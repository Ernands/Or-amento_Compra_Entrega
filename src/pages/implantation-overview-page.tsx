import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CircleAlert, CircleCheckBig, ClipboardCheck, Store } from "lucide-react";

import { MetricCard } from "@/components/app/metric-card";
import { PageHeader } from "@/components/app/page-header";
import { ErrorPanel, LoadingPanel } from "@/components/app/page-state";
import { EvidencePendingNotice } from "@/components/implantation/evidence-pending-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useImplantationAccess } from "@/context/implantation-access-context";
import { useImplantationQuery } from "@/hooks/use-implantation-query";

export function ImplantationOverviewPage() {
  const { repository } = useImplantationAccess();
  const loader = useCallback(() => repository!.overview(), [repository]);
  const query = useImplantationQuery(repository ? loader : null);
  const sortedStores = useMemo(() => [...(query.data?.stores ?? [])].sort((a, b) => a.store.name.localeCompare(b.store.name, "pt-BR")), [query.data?.stores]);

  if (query.loading && !query.data) return <LoadingPanel />;
  if (query.error) return <ErrorPanel message={query.error} retry={query.refresh} />;
  if (!query.data) return null;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Implantação" title="Visão geral" description="Acompanhe datas de inauguração, checklists, bloqueios e progresso das lojas no seu escopo." />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Resumo da implantação">
        <MetricCard label="Lojas no escopo" value={query.data.totals.stores} helper="respeitando Lojas_Permitidas" icon={Store} />
        <MetricCard label="Com data planejada" value={query.data.totals.withOpeningDate} helper="aptas para iniciar" icon={CalendarDays} />
        <MetricCard label="Implantações iniciadas" value={query.data.totals.started} helper="ciclos ativos" icon={ClipboardCheck} />
        <MetricCard label="Bloqueios" value={query.data.totals.blocked} helper="atividades bloqueadas" icon={CircleAlert} tone="red" />
        <MetricCard label="Atividades concluídas" value={query.data.totals.completedActivities} helper="em todas as lojas" icon={CircleCheckBig} tone="green" />
      </section>
      <EvidencePendingNotice />
      <Card className="overflow-hidden py-0 shadow-none">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead className="pl-6">Loja</TableHead><TableHead>Inauguração</TableHead><TableHead>Checklist</TableHead><TableHead>Progresso</TableHead><TableHead><span className="sr-only">Ações</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {sortedStores.map((entry) => (
                <TableRow key={entry.store.id}>
                  <TableCell className="pl-6"><p className="font-medium">{entry.store.name}</p><p className="font-mono text-xs text-muted-foreground">{entry.store.id}</p></TableCell>
                  <TableCell>{entry.store.plannedOpeningDate ? formatDate(entry.store.plannedOpeningDate) : <span className="text-muted-foreground">Não definida</span>}</TableCell>
                  <TableCell>{entry.implantation ? `${entry.summary.total} atividades` : <span className="text-muted-foreground">Não iniciado</span>}</TableCell>
                  <TableCell className="min-w-48"><div className="flex items-center gap-3"><Progress value={entry.summary.progress} className="w-28" /><span className="text-xs tabular-nums">{entry.summary.progress}%</span></div></TableCell>
                  <TableCell className="text-right"><Button asChild variant="ghost" size="sm"><Link to={`/lojas/${entry.store.id}?tab=implantacao`}>Abrir loja</Link></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(value: string) { return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`)); }
