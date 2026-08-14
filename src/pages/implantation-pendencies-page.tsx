import { useCallback } from "react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/app/page-header";
import { ErrorPanel, LoadingPanel } from "@/components/app/page-state";
import { ActivityStatusBadge } from "@/components/implantation/activity-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useImplantationAccess } from "@/context/implantation-access-context";
import { useImplantationQuery } from "@/hooks/use-implantation-query";

export function ImplantationPendenciesPage() {
  const { repository } = useImplantationAccess();
  const loader = useCallback(() => repository!.pendencies(), [repository]);
  const query = useImplantationQuery(repository ? loader : null);
  if (query.loading && !query.data) return <LoadingPanel />;
  if (query.error) return <ErrorPanel message={query.error} retry={query.refresh} />;
  return <div className="space-y-6">
    <PageHeader eyebrow="Implantação" title="Pendências" description="Atividades vencidas, bloqueadas ou sem responsável dentro das lojas permitidas." />
    <Card className="overflow-hidden py-0 shadow-none"><CardContent className="overflow-x-auto p-0"><Table>
      <TableHeader><TableRow><TableHead className="pl-6">Loja</TableHead><TableHead>Atividade</TableHead><TableHead>Data-alvo</TableHead><TableHead>Responsável</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
      <TableBody>{query.data?.items.map(({ activity, store }) => <TableRow key={activity.id}>
        <TableCell className="pl-6"><p className="font-medium">{store.name}</p><p className="font-mono text-xs text-muted-foreground">{store.id}</p></TableCell>
        <TableCell><p className="font-medium">{activity.action}</p><p className="text-xs text-muted-foreground">{activity.phase}</p></TableCell>
        <TableCell>{activity.currentTargetDate}</TableCell><TableCell>{activity.responsibleUserId || <span className="text-destructive">Não atribuído</span>}</TableCell>
        <TableCell><ActivityStatusBadge status={activity.status} /></TableCell><TableCell className="text-right"><Button asChild variant="ghost" size="sm"><Link to={`/implantacao/atividades/${activity.id}`}>Abrir</Link></Button></TableCell>
      </TableRow>)}</TableBody>
    </Table></CardContent></Card>
    {!query.loading && !query.data?.items.length ? <p className="text-sm text-muted-foreground">Nenhuma pendência operacional encontrada.</p> : null}
  </div>;
}
