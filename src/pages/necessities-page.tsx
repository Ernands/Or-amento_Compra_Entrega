import { useDeferredValue, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "@/auth/auth-context";
import { PageHeader } from "@/components/app/page-header";
import { ErrorPanel, LoadingPanel } from "@/components/app/page-state";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOperations } from "@/context/operations-context";

const pageSizeOptions = [100, 250, 500, 0] as const;

export function NecessitiesPage() {
  const { accessMode } = useAuth();
  const { necessities, items, stores, loading, error, refresh } = useOperations();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [status, setStatus] = useState("");
  const [pageSize, setPageSize] = useState(100);
  const [page, setPage] = useState(1);
  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const storeMap = useMemo(() => new Map(stores.map((store) => [store.id, store])), [stores]);
  const statuses = useMemo(() => [...new Set(necessities.map((need) => need.status))], [necessities]);
  const filtered = useMemo(() => {
    const normalizedQuery = normalize(deferredQuery);
    return necessities.filter((need) => (
      (!status || need.status === status)
      && (!normalizedQuery || normalize([
        need.id,
        itemMap.get(need.itemId)?.operationalCode,
        itemMap.get(need.itemId)?.name,
        storeMap.get(need.storeId)?.name,
      ].join(" ")).includes(normalizedQuery))
    ));
  }, [deferredQuery, itemMap, necessities, status, storeMap]);

  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = pageSize === 0 ? 0 : (currentPage - 1) * pageSize;
  const visible = pageSize === 0 ? filtered : filtered.slice(startIndex, startIndex + pageSize);
  const firstVisible = filtered.length ? startIndex + 1 : 0;
  const lastVisible = startIndex + visible.length;

  if (loading && !necessities.length) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} retry={refresh} />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Operação" title="Necessidades" description="Todas as relações entre lojas e itens, com filtros e navegação completa." />
      <Card className="shadow-none">
        <CardContent className="grid gap-2 p-4 md:grid-cols-[minmax(0,1fr)_240px_170px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="Buscar loja, necessidade, código ou item"
              className="pl-9"
            />
          </div>
          <select
            aria-label="Filtrar por status"
            value={status}
            onChange={(event) => { setStatus(event.target.value); setPage(1); }}
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="">Todos os status</option>
            {statuses.map((entry) => <option key={entry}>{entry}</option>)}
          </select>
          <select
            aria-label="Registros por página"
            value={pageSize}
            onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}
            className="h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            {pageSizeOptions.map((size) => <option key={size} value={size}>{size === 0 ? "Exibir todos" : `${size} por página`}</option>)}
          </select>
        </CardContent>
      </Card>
      <Card className="overflow-hidden py-0 shadow-none">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead className="pl-6">Necessidade</TableHead><TableHead>Loja</TableHead><TableHead>Item</TableHead><TableHead className="text-right">Qtd.</TableHead><TableHead>Prioridade</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Cotações</TableHead></TableRow></TableHeader>
            <TableBody>
              {visible.map((need) => {
                const item = itemMap.get(need.itemId);
                const store = storeMap.get(need.storeId);
                const eligibleForQuote = need.status === "NAO_INICIADO" || need.status === "EM_COTACAO";
                return <TableRow key={need.id}><TableCell className="pl-6 font-mono text-xs">{need.id}</TableCell><TableCell>{store?.name}<p className="font-mono text-xs text-muted-foreground">{store?.id}</p></TableCell><TableCell><p className="font-medium">{item?.name}</p><p className="font-mono text-xs text-muted-foreground">{item?.operationalCode}</p></TableCell><TableCell className="text-right tabular-nums">{need.quantity}</TableCell><TableCell>{need.priority}</TableCell><TableCell><StatusBadge status={need.status} /></TableCell><TableCell className="text-right">{eligibleForQuote ? <Button asChild variant="ghost" size="sm"><Link to="/cotacoes" state={{ necessityId: need.id }}>{accessMode === "visitor" ? "Ver cotações" : "Cotar"}<ArrowRight /></Link></Button> : null}</TableCell></TableRow>;
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>Exibindo {firstVisible}–{lastVisible} de {filtered.length} registro(s). Total carregado: {necessities.length}.</p>
        {pageSize !== 0 && totalPages > 1 ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}><ChevronLeft />Anterior</Button>
            <span className="min-w-24 text-center">Página {currentPage} de {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages}>Próxima<ChevronRight /></Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}
