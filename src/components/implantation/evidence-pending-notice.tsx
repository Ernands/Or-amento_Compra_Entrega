import { Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function EvidencePendingNotice() {
  return (
    <Alert>
      <Info aria-hidden="true" />
      <AlertTitle>Evidências preparadas para uma fase futura</AlertTitle>
      <AlertDescription>
        Evidências obrigatórias serão validadas após habilitação do módulo de arquivos. Nesta fase, a conclusão não é bloqueada e o Drive permanece desativado.
      </AlertDescription>
    </Alert>
  );
}
