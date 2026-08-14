import { AlertCircle, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingPanel({ label = "Carregando dados do sistema" }: { label?: string } = {}) {
  return <div className="space-y-6" role="status" aria-live="polite" aria-busy="true">
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
      <LoaderCircle className="size-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{"Aguarde enquanto as informa\u00e7\u00f5es s\u00e3o consultadas no Apps Script."}</p>
      </div>
    </div>
    <Skeleton className="h-20 w-full" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32" />)}</div>
    <Skeleton className="h-80 w-full" />
  </div>;
}

export function ErrorPanel({ message, retry, signOut }: { message: string; retry: () => void; signOut?: () => void }) {
  return <Card className="mx-auto mt-16 max-w-xl"><CardHeader><AlertCircle className="size-8 text-destructive" /><CardTitle>Não foi possível carregar os dados</CardTitle></CardHeader><CardContent><p className="mb-5 text-sm text-muted-foreground">{message}</p><div className="flex gap-2"><Button onClick={retry}>Tentar novamente</Button>{signOut ? <Button variant="outline" onClick={signOut}>Trocar conta</Button> : null}</div></CardContent></Card>;
}
