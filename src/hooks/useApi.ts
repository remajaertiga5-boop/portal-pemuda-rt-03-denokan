// ============================================================
// useApi — React hook untuk API calls
// Menyediakan: loading, error, data, execute, reset
// ============================================================

import { useState, useCallback, useRef, useEffect } from "react";
import type { ApiResult } from "../utils/apiClient";

// ── Types ─────────────────────────────────────────────────
interface UseApiState<T = any> {
  data     : T | null;
  error    : string | null;
  loading  : boolean;
  called   : boolean;
  success  : boolean;
}

interface UseApiReturn<T = any> extends UseApiState<T> {
  execute    : (...args: any[]) => Promise<ApiResult<T>>;
  reset      : () => void;
  setData    : (data: T | null) => void;
}

// ── Hook ───────────────────────────────────────────────────
export function useApi<T = any>(): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data    : null,
    error   : null,
    loading : false,
    called  : false,
    success : false,
  });

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const execute = useCallback(async (
    apiFn    : (...args: any[]) => Promise<ApiResult<T>>,
    ...args  : any[]
  ): Promise<ApiResult<T>> => {
    setState(prev => ({ ...prev, loading: true, error: null, called: true }));

    try {
      const result = await apiFn(...args);

      if (!mountedRef.current) return result;

      setState({
        data    : result.data ?? null,
        error   : result.ok ? null : (result.error || "Gagal memuat data"),
        loading : false,
        called  : true,
        success : result.ok,
      });

      return result;
    } catch (err: any) {
      if (!mountedRef.current) {
        return { ok: false, error: "Component unmounted", status: 0 };
      }

      setState({
        data    : null,
        error   : err.message || "Terjadi kesalahan",
        loading : false,
        called  : true,
        success : false,
      });

      return { ok: false, error: err.message, status: 0 };
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      data    : null,
      error   : null,
      loading : false,
      called  : false,
      success : false,
    });
  }, []);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  return { ...state, execute, reset, setData };
}

// ── Mutation hook (no caching, for POST/PUT/DELETE) ────────
export function useMutation<T = any>(): UseApiReturn<T> {
  return useApi<T>();
}

// ── Query hook (with optional auto-fetch) ──────────────────
interface UseQueryOptions {
  enabled?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export function useQuery<T = any>(
  queryFn   : (...args: any[]) => Promise<ApiResult<T>>,
  queryArgs : any[] = [],
  options   : UseQueryOptions = {}
): UseApiReturn<T> & { refetch: () => Promise<ApiResult<T>> } {
  const api = useApi<T>();
  const { enabled = true } = options;

  const refetch = useCallback(async () => {
    return api.execute(queryFn, ...queryArgs);
  }, [api.execute, queryFn, ...queryArgs]);

  // Auto-fetch saat mount atau args berubah
  useEffect(() => {
    if (enabled) {
      refetch();
    }
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Panggil onSuccess/onError
  useEffect(() => {
    if (api.success && options.onSuccess) options.onSuccess(api.data);
    if (api.error && options.onError) options.onError(api.error);
  }, [api.success, api.error]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...api, refetch };
}

export default useApi;
