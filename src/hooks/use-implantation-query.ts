import { useCallback, useEffect, useState } from "react";

export function useImplantationQuery<T>(loader: (() => Promise<T>) | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(loader));
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!loader) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setData(await loader());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível carregar os dados de implantação.");
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    if (!loader) return;
    let active = true;
    loader().then((result) => {
      if (active) setData(result);
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof Error ? caught.message : "Não foi possível carregar os dados de implantação.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [loader]);
  return { data, loading, error, refresh, setData };
}
