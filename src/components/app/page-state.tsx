import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingPanel() {
  return <div className="space-y-6" aria-label="Carregando dados"><Skeleton className="h-20 w-full" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-32" />)}</div><Skeleton className="h-80 w-full" /></div>;
}

export function ErrorPanel({ message, retry, signOut }: { message: string; retry: () => void; signOut?: () => void }) {
  return <Card className="mx-auto mt-16 max-w-xl"><CardHeader><AlertCircle className="size-8 text-destructive" /><CardTitle>Não foi possível carregar os dados</CardTitle></CardHeader><CardContent><p className="mb-5 text-sm text-muted-foreground">{message}</p><div className="flex gap-2"><Button onClick={retry}>Tentar novamente</Button>{signOut ? <Button variant="outline" onClick={signOut}>Trocar conta</Button> : null}</div></CardContent></Card>;
}
