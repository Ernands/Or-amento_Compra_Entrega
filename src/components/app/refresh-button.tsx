import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useOperations } from "@/context/operations-context";

export function RefreshButton() {
  const { refresh, loading } = useOperations();
  return (
    <Button variant="outline" onClick={refresh} disabled={loading}>
      <RefreshCw className={loading ? "animate-spin" : ""} />
      {loading ? "Atualizando" : "Atualizar dados"}
    </Button>
  );
}
