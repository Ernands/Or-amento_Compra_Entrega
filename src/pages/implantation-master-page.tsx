import { useCallback } from "react";
import { LockKeyhole } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { ErrorPanel, LoadingPanel } from "@/components/app/page-state";
import { EvidencePendingNotice } from "@/components/implantation/evidence-pending-notice";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useImplantationAccess } from "@/context/implantation-access-context";
import { useImplantationQuery } from "@/hooks/use-implantation-query";

export function ImplantationMasterPage() {
  const { repository } = useImplantationAccess();
  const loader = useCallback(() => repository!.master(), [repository]);
  const query = useImplantationQuery(repository ? loader : null);
  if (query.loading && !query.data) return <LoadingPanel />;
  if (query.error) return <ErrorPanel message={query.error} retry={query.refresh} />;
  if (!query.data) return null;
  return <div className="space-y-6">
    <PageHeader eyebrow="Implantação" title="Checklist Mestre" description="Versão publicada usada para gerar o snapshot operacional de cada loja." />
    <Card className="shadow-none"><CardHeader><CardTitle className="flex items-center gap-2"><LockKeyhole className="size-4" />Somente leitura</CardTitle></CardHeader><CardContent className="grid gap-3 text-sm md:grid-cols-4">
      <div><span className="text-muted-foreground">Modelo</span><p className="font-medium">{query.data.model.name}</p></div>
      <div><span className="text-muted-foreground">Versão</span><p className="font-medium">{query.data.model.version}</p></div>
      <div><span className="text-muted-foreground">Status</span><p className="font-medium">{query.data.model.status}</p></div>
      <div><span className="text-muted-foreground">Checksum</span><p className="truncate font-mono text-xs" title={query.data.model.checksum}>{query.data.model.checksum}</p></div>
    </CardContent></Card>
    <EvidencePendingNotice />
    <Card className="overflow-hidden py-0 shadow-none"><CardContent className="overflow-x-auto p-0"><Table>
      <TableHeader><TableRow><TableHead className="pl-6">Código</TableHead><TableHead>Fase</TableHead><TableHead>Ação</TableHead><TableHead>Offset</TableHead><TableHead>Responsável padrão</TableHead><TableHead>Regras</TableHead></TableRow></TableHeader>
      <TableBody>{query.data.activities.map((activity) => <TableRow key={activity.id}>
        <TableCell className="pl-6 font-mono text-xs">{activity.code}</TableCell><TableCell>{activity.phase}</TableCell><TableCell className="font-medium">{activity.action}</TableCell>
        <TableCell className="tabular-nums">D{activity.offsetDays}</TableCell><TableCell>{activity.responsibleRole}</TableCell><TableCell><div className="flex flex-wrap gap-1">{activity.critical ? <Badge variant="destructive">Crítica</Badge> : null}{activity.mandatory ? <Badge variant="outline">Obrigatória</Badge> : null}{activity.evidenceRequired ? <Badge variant="outline">Evidência {activity.minimumEvidence}</Badge> : null}</div></TableCell>
      </TableRow>)}</TableBody>
    </Table></CardContent></Card>
  </div>;
}
