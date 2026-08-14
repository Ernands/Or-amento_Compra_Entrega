import { useCallback } from "react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/app/page-header";
import { ErrorPanel, LoadingPanel } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useImplantationAccess } from "@/context/implantation-access-context";
import { useImplantationQuery } from "@/hooks/use-implantation-query";

export function ImplantationChecklistsPage() {
  const { repository } = useImplantationAccess();
  const loader = useCallback(() => repository!.checklists(), [repository]);
  const query = useImplantationQuery(repository ? loader : null);
  if (query.loading && !query.data) return <LoadingPanel />;
  if (query.error) return <ErrorPanel message={query.error} retry={query.refresh} />;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Implantação" title="Checklists por loja" description="Ciclos iniciados a partir do snapshot imutável do Checklist Mestre publicado." />
      <Card className="overflow-hidden py-0 shadow-none"><CardContent className="overflow-x-auto p-0"><Table>
        <TableHeader><TableRow><TableHead className="pl-6">Loja</TableHead><TableHead>Modelo</TableHead><TableHead>Atividades</TableHead><TableHead>Críticas abertas</TableHead><TableHead>Progresso</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>{query.data?.stores.map((entry) => <TableRow key={entry.store.id}>
          <TableCell className="pl-6"><p className="font-medium">{entry.store.name}</p><p className="font-mono text-xs text-muted-foreground">{entry.store.id}</p></TableCell>
          <TableCell className="font-mono text-xs">{entry.implantation?.modelVersionId}</TableCell><TableCell>{entry.summary.total}</TableCell>
          <TableCell>{entry.summary.criticalOpen}</TableCell><TableCell className="min-w-48"><div className="flex items-center gap-3"><Progress value={entry.summary.progress} className="w-28" /><span className="text-xs tabular-nums">{entry.summary.progress}%</span></div></TableCell>
          <TableCell className="text-right"><Button asChild variant="ghost" size="sm"><Link to={`/lojas/${entry.store.id}?tab=implantacao`}>Ver checklist</Link></Button></TableCell>
        </TableRow>)}</TableBody>
      </Table></CardContent></Card>
      {!query.loading && !query.data?.stores.length ? <p className="text-sm text-muted-foreground">Nenhuma implantação foi iniciada nas lojas do seu escopo.</p> : null}
    </div>
  );
}
