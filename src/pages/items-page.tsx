import { useMemo, useState } from "react";
import { ExternalLink, Pencil, Plus, Search } from "lucide-react";

import { useAuth } from "@/auth/auth-context";
import { ItemCreateSheet, ItemEditSheet } from "@/components/app/item-edit-sheet";
import { PageHeader } from "@/components/app/page-header";
import { ErrorPanel, LoadingPanel } from "@/components/app/page-state";
import { StatusBadge } from "@/components/app/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOperations } from "@/context/operations-context";
import type { Item } from "@/domain/entities";

export function ItemsPage() {
  const { accessMode, user } = useAuth();
  const { items, loading, error, refresh, capabilities, createItem, updateItem } = useOperations();
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [creatingItem, setCreatingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const areas = useMemo(() => [...new Set(items.map((item) => item.area))], [items]);
  const filtered = useMemo(() => {
    const normalizedQuery = normalize(query);
    return items.filter((item) => (!normalizedQuery || normalize([item.id, item.operationalCode, item.name, item.group].join(" ")).includes(normalizedQuery)) && (!area || item.area === area));
  }, [area, items, query]);
  const canEdit = Boolean(user && user.profile !== "CONSULTA");
  const canCreate = canEdit && capabilities.createItem;

  if (loading && !items.length) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} retry={refresh} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catálogo mestre"
        title="Itens"
        description={accessMode === "visitor" ? "Catálogo operacional dos itens previstos para as lojas." : "Cadastre e edite especificações, rotas e dados do catálogo sem alterar o ID interno."}
        actions={canCreate ? <Button onClick={() => setCreatingItem(true)}><Plus />Novo item</Button> : null}
      />
      <Card className="shadow-none"><CardContent className="grid gap-2 p-4 md:grid-cols-[minmax(0,1fr)_220px]"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar código, item ou grupo" className="pl-9" /></div><select aria-label="Filtrar por área" value={area} onChange={(event) => setArea(event.target.value)} className="h-9 rounded-md border bg-transparent px-3 text-sm"><option value="">Todas as áreas</option>{areas.map((entry) => <option key={entry}>{entry}</option>)}</select></CardContent></Card>
      <Card className="overflow-hidden py-0 shadow-none">
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead className="pl-6">ID interno</TableHead><TableHead>Código</TableHead><TableHead>Item</TableHead><TableHead>Grupo / Área</TableHead><TableHead>Definição</TableHead><TableHead>Status</TableHead><TableHead className="w-56"><span className="sr-only">Ações</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="pl-6 font-mono text-xs">{item.id}</TableCell>
                  <TableCell><span className="font-mono text-xs">{item.operationalCode}</span>{item.duplicateOperationalCode ? <Badge variant="outline" className="ml-2 border-amber-200 bg-amber-50 text-amber-800">Duplicado</Badge> : null}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell><p>{item.group}</p><p className="text-xs text-muted-foreground">{item.area}</p></TableCell>
                  <TableCell><StatusBadge status={item.definitionStatus} /></TableCell>
                  <TableCell><StatusBadge status={item.active ? "ATIVO" : "INATIVO"} /></TableCell>
                  <TableCell><div className="flex justify-end gap-1">{item.productLink ? <Button asChild size="sm"><a href={item.productLink} target="_blank" rel="noreferrer"><ExternalLink />Ver produto</a></Button> : null}{canEdit ? <Button variant="ghost" size="sm" onClick={() => setEditingItem(item)}><Pencil />Editar</Button> : null}</div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">{filtered.length} item(ns) encontrado(s).</p>
      {creatingItem ? <ItemCreateSheet open productLinkSupported={capabilities.itemProductLink} onOpenChange={setCreatingItem} onSave={createItem} /> : null}
      {editingItem ? <ItemEditSheet key={`${editingItem.id}:${editingItem.version}`} item={editingItem} open productLinkSupported={capabilities.itemProductLink} onOpenChange={(open) => { if (!open) setEditingItem(null); }} onSave={updateItem} /> : null}
    </div>
  );
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}
