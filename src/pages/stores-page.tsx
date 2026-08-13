import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, CircleCheck, CircleOff, Pencil, Search, UserRoundPlus } from "lucide-react";

import { useAuth } from "@/auth/auth-context";
import { PageHeader } from "@/components/app/page-header";
import { MetricCard } from "@/components/app/metric-card";
import { ErrorPanel, LoadingPanel } from "@/components/app/page-state";
import { StatusBadge } from "@/components/app/status-badge";
import { StoreEditSheet } from "@/components/app/store-edit-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOperations } from "@/context/operations-context";
import type { Store } from "@/domain/entities";

export function StoresPage() {
  const { user } = useAuth();
  const { stores, loading, error, refresh, updateStore } = useOperations();
  const [query, setQuery] = useState("");
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const filtered = useMemo(() => {
    const normalizedQuery = normalize(query);
    return stores.filter((store) => !normalizedQuery || normalize([store.id, store.name, store.city, store.state, store.status].join(" ")).includes(normalizedQuery));
  }, [query, stores]);
  const canEdit = Boolean(user && user.profile !== "CONSULTA");
  const storeCounts = useMemo(() => ({
    total: stores.length,
    active: stores.filter((store) => normalize(store.status) === "ativa").length,
    toRegister: stores.filter((store) => normalize(store.status).replace(/\s/g, "") === "acadastrar").length,
    inactive: stores.filter((store) => normalize(store.status) === "inativa").length,
  }), [stores]);

  if (loading && !stores.length) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} retry={refresh} />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Cadastros" title="Lojas" description="As 27 unidades previstas e seus dados de implantação. Use Editar para atualizar a planilha DEV." />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo das lojas">
        <MetricCard label="Lojas" value={storeCounts.total} helper="unidades no escopo atual" icon={Building2} />
        <MetricCard label="Ativas" value={storeCounts.active} helper="unidades ativas" icon={CircleCheck} />
        <MetricCard label="A cadastrar" value={storeCounts.toRegister} helper="cadastro ainda pendente" icon={UserRoundPlus} tone="yellow" />
        <MetricCard label="Inativas" value={storeCounts.inactive} helper="unidades inativas" icon={CircleOff} tone="red" />
      </section>
      <Card className="shadow-none"><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por loja, cidade, UF ou status" className="pl-9" /></div></CardContent></Card>
      <Card className="overflow-hidden py-0 shadow-none">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead className="pl-6">Loja</TableHead><TableHead>Cidade / UF</TableHead><TableHead>Responsável</TableHead><TableHead>Status</TableHead><TableHead className="w-36"><span className="sr-only">Ações</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="pl-6"><p className="font-medium">{store.name}</p><p className="font-mono text-xs text-muted-foreground">{store.id}</p></TableCell>
                  <TableCell>{store.city || "—"} / {store.state || "—"}</TableCell>
                  <TableCell>{store.manager || "—"}</TableCell>
                  <TableCell><StatusBadge status={store.status} /></TableCell>
                  <TableCell><div className="flex justify-end gap-1">{canEdit ? <Button variant="ghost" size="sm" onClick={() => setEditingStore(store)}><Pencil />Editar</Button> : null}<Button asChild variant="ghost" size="icon"><Link to={`/lojas/${store.id}`} aria-label={`Abrir ${store.name}`}><ArrowRight /></Link></Button></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">{filtered.length} loja(s) encontrada(s).</p>
      {editingStore ? <StoreEditSheet key={`${editingStore.id}:${editingStore.version}`} store={editingStore} open onOpenChange={(open) => { if (!open) setEditingStore(null); }} onSave={updateStore} /> : null}
    </div>
  );
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}
