import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useOperations } from "@/context/operations-context";

interface RefreshButtonProps {
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function RefreshButton({ onRefresh, refreshing }: RefreshButtonProps = {}) {
  const { refresh, loading } = useOperations();
  const activeLoading = refreshing ?? loading;
  return (
    <Button variant="outline" onClick={onRefresh ?? refresh} disabled={activeLoading}>
      <RefreshCw className={activeLoading ? "animate-spin" : ""} />
      {activeLoading ? "Atualizando" : "Atualizar dados"}
    </Button>
  );
}
