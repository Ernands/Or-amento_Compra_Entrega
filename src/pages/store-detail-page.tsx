import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Boxes, CheckCircle2, ClipboardList, PackageCheck } from "lucide-react";

import { useAuth } from "@/auth/auth-context";
import { MetricCard } from "@/components/app/metric-card";
import { PageHeader } from "@/components/app/page-header";
import { ErrorPanel, LoadingPanel } from "@/components/app/page-state";
import { StatusBadge } from "@/components/app/status-badge";
import { StoreImplantationPanel } from "@/components/implantation/store-implantation-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useImplantationAccess } from "@/context/implantation-access-context";
import { useOperations } from "@/context/operations-context";

export function StoreDetailPage() {
  const { id = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { accessMode } = useAuth();
  const { capabilities } = useImplantationAccess();
  const { stores, items, necessities, dashboard, loading, error, refresh } = useOperations();
  if (loading && !dashboard) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} retry={refresh} />;
  const store = stores.find((entry) => entry.id === id);
  if (!store || !dashboard) return <ErrorPanel message="Loja não encontrada." retry={refresh} />;
  const progress = dashboard.stores.find((entry) => entry.store.id === store.id);
  if (!progress) return <ErrorPanel message="Resumo da loja não encontrado." retry={refresh} />;
  const visitor = accessMode === "visitor";
  const implantationAvailable = accessMode === "authenticated" && capabilities?.view;
  const requestedTab = searchParams.get("tab");
  const activeTab = requestedTab === "implantacao" && implantationAvailable ? "implantacao" : "resumo";
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const storeNeeds = necessities.filter((need) => need.storeId === store.id);
  return <div className="space-y-6">
    <Button asChild variant="ghost" size="sm" className="-ml-3"><Link to="/lojas"><ArrowLeft />Voltar para lojas</Link></Button>
    <PageHeader eyebrow={store.id} title={store.name} description={visitor ? `${store.city || "—"}/${store.state || "—"}` : `${store.city}/${store.state} · Responsável: ${store.manager}`} />
    <div role="tablist" aria-label="Detalhes da loja" className="flex gap-1 border-b">
      <button type="button" role="tab" aria-selected={activeTab === "resumo"} onClick={() => setSearchParams({})} className={activeTab === "resumo" ? "border-b-2 border-primary px-4 py-2 text-sm font-medium text-primary" : "px-4 py-2 text-sm text-muted-foreground"}>Resumo e necessidades</button>
      {implantationAvailable ? <button type="button" role="tab" aria-selected={activeTab === "implantacao"} onClick={() => setSearchParams({ tab: "implantacao" })} className={activeTab === "implantacao" ? "border-b-2 border-primary px-4 py-2 text-sm font-medium text-primary" : "px-4 py-2 text-sm text-muted-foreground"}>Implantação</button> : null}
    </div>
    {activeTab === "implantacao" ? <StoreImplantationPanel storeId={store.id} /> : <StoreOperationalSummary progress={progress} storeNeeds={storeNeeds} itemMap={itemMap} />}
  </div>;
}

function StoreOperationalSummary({ progress, storeNeeds, itemMap }: {
  progress: { progress: number; total: number; pendingDefinition: number; purchased: number; completed: number };
  storeNeeds: Array<{ id: string; itemId: string; quantity: number; status: string }>;
  itemMap: Map<string, { operationalCode: string; name: string; area: string }>;
}) {
  return <>
    <Card className="shadow-none"><CardContent className="p-5"><div className="mb-2 flex justify-between text-sm"><span className="font-medium">Progresso geral</span><span className="tabular-nums text-muted-foreground">{progress.progress}%</span></div><Progress value={progress.progress} /></CardContent></Card>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Itens necessários" value={progress.total} helper="catálogo completo da loja" icon={Boxes} /><MetricCard label="Pendentes" value={progress.pendingDefinition} helper="exigem definição" icon={ClipboardList} tone="yellow" /><MetricCard label="Comprados" value={progress.purchased} helper="compras registradas" icon={PackageCheck} tone="green" /><MetricCard label="Concluídos" value={progress.completed} helper="entrega conferida" icon={CheckCircle2} tone="green" /></section>
    <Card className="overflow-hidden py-0 shadow-none"><CardContent className="overflow-x-auto p-0"><Table><TableHeader><TableRow><TableHead className="pl-6">Código</TableHead><TableHead>Item</TableHead><TableHead>Área</TableHead><TableHead className="text-right">Qtd.</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{storeNeeds.map((need) => { const item = itemMap.get(need.itemId); return <TableRow key={need.id}><TableCell className="pl-6 font-mono text-xs">{item?.operationalCode}</TableCell><TableCell><p className="font-medium">{item?.name}</p><p className="font-mono text-xs text-muted-foreground">{need.id}</p></TableCell><TableCell>{item?.area}</TableCell><TableCell className="text-right tabular-nums">{need.quantity}</TableCell><TableCell><StatusBadge status={need.status} /></TableCell></TableRow>; })}</TableBody></Table></CardContent></Card>
  </>;
}
