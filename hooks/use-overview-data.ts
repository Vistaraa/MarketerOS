"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiResponse } from "@/lib/api-contracts";
import type { OverviewPayload, OverviewQuery } from "@/lib/types";

type OverviewState = {
  data: OverviewPayload | null;
  loading: boolean;
  error: string | null;
};

export function useOverviewData(query: Partial<OverviewQuery> = {}) {
  const [state, setState] = useState<OverviewState>({ data: null, loading: true, error: null });
  const [reloadKey, setReloadKey] = useState(0);
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        params.set(key, String(val));
      }
    });
    return params.toString();
  }, [query]);

  const retry = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ data: current.data, loading: true, error: null }));
    fetch(`/api/v1/overview?${queryString}`, { signal: controller.signal, headers: { Accept: "application/json" } })
      .then(async (response) => {
        const payload = await response.json() as ApiResponse<OverviewPayload>;
        if (!response.ok || !payload.data) throw new Error(payload.error?.message || "Unable to load Overview data.");
        return payload.data;
      })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState((current) => ({ data: current.data, loading: false, error: error instanceof Error ? error.message : "Unable to load Overview data." }));
      });
    return () => controller.abort();
  }, [queryString, reloadKey]);

  return { ...state, retry };
}
