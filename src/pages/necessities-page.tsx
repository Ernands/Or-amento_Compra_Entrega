import { useDeferredValue, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { ErrorPanel, LoadingPanel } from "@/components/app/page-state";
import { StatusBadge } from "@/components/app/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOperations } from "@/context/operations-context";

export function NecessitiesPage() {
  const { necessities, items, stores, loading, error, refresh } = useOperations(); const [query, setQuery] = useState(""); const deferredQuery = useDeferredValue(query); const [status, setStatus] = useState("");
  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]); const storeMap = useMemo(() => new Map(stores.map((store) => [store.id, store])), [stores]);
  const filtered = useMemo(() => { const q = normalize(deferredQuery); return necessities.filter((need) => (!status || need.status === status) && (!q || normalize([need.id, itemMap.get(need.itemId)?.operationalCode, itemMap.get(need.itemId)?.name, storeMap.get(need.storeId)?.name].join(" ")).includes(q))); }, [deferredQuery, itemMap, necessities, status, storeMap]);
  if (loading && !necessities.length) return <LoadingPanel />; if (error) return <ErrorPanel message={error} retry={refresh} />;
  return <div className="space-y-6"><PageHeader eyebrow="Operação" title="Necessidades" description="Relação normalizada entre cada loja e cada item do catálogo." /><Card className="shadow-none"><CardContent className="grid gap-2 p-4 md:grid-cols-[minmax(0,1fr)_240px]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar loja, necessidade, código ou item" className="pl-9" /></div><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-md border bg-transparent px-3 text-sm"><option value="">Todos os status</option>{[...new Set(necessities.map((need) => need.status))].map((entry) => <option key={entry}>{entry}</option>)}</select></CardContent></Card><Card className="overflow-hidden py-0 shadow-none"><CardContent className="overflow-x-auto p-0"><Table><TableHeader><TableRow><TableHead className="pl-6">Necessidade</TableHead><TableHead>Loja</TableHead><TableHead>Item</TableHead><TableHead className="text-right">Qtd.</TableHead><TableHead>Prioridade</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{filtered.slice(0, 100).map((need) => { const item = itemMap.get(need.itemId); const store = storeMap.get(need.storeId); return <TableRow key={need.id}><TableCell className="pl-6 font-mono text-xs">{need.id}</TableCell><TableCell>{store?.name}<p className="font-mono text-xs text-muted-foreground">{store?.id}</p></TableCell><TableCell><p className="font-medium">{item?.name}</p><p className="font-mono text-xs text-muted-foreground">{item?.operationalCode}</p></TableCell><TableCell className="text-right tabular-nums">{need.quantity}</TableCell><TableCell>{need.priority}</TableCell><TableCell><StatusBadge status={need.status} /></TableCell></TableRow>; })}</TableBody></Table></CardContent></Card><p className="text-xs text-muted-foreground">Exibindo {Math.min(filtered.length, 100)} de {filtered.length} registro(s).</p></div>;
}
function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR"); }
