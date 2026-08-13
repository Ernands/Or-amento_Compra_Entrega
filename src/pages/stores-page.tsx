import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { ErrorPanel, LoadingPanel } from "@/components/app/page-state";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOperations } from "@/context/operations-context";

export function StoresPage() {
  const { stores, loading, error, refresh } = useOperations();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => { const q = normalize(query); return stores.filter((store) => !q || normalize([store.id, store.name, store.city, store.state, store.status].join(" ")).includes(q)); }, [query, stores]);
  if (loading && !stores.length) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} retry={refresh} />;
  return <div className="space-y-6"><PageHeader eyebrow="Cadastros" title="Lojas" description="As 27 unidades previstas no arquivo oficial e seus dados de implantação." /><Card className="shadow-none"><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por loja, cidade, UF ou status" className="pl-9" /></div></CardContent></Card><Card className="overflow-hidden py-0 shadow-none"><CardContent className="overflow-x-auto p-0"><Table><TableHeader><TableRow><TableHead className="pl-6">Loja</TableHead><TableHead>Cidade / UF</TableHead><TableHead>Responsável</TableHead><TableHead>Status</TableHead><TableHead className="w-14"><span className="sr-only">Abrir</span></TableHead></TableRow></TableHeader><TableBody>{filtered.map((store) => <TableRow key={store.id}><TableCell className="pl-6"><p className="font-medium">{store.name}</p><p className="font-mono text-xs text-muted-foreground">{store.id}</p></TableCell><TableCell>{store.city} / {store.state}</TableCell><TableCell>{store.manager}</TableCell><TableCell><StatusBadge status={store.status} /></TableCell><TableCell><Button asChild variant="ghost" size="icon"><Link to={`/lojas/${store.id}`} aria-label={`Abrir ${store.name}`}><ArrowRight /></Link></Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card><p className="text-xs text-muted-foreground">{filtered.length} loja(s) encontrada(s).</p></div>;
}

function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR"); }
