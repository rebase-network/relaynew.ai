import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { type MutationState } from "./types";

export function useLoadable<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    loader()
      .then((value) => {
        if (active) {
          setData(value);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "发生未知错误");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, deps);

  return { data, loading, error, reload: () => loader().then(setData) };
}

export function useMutationState(): [MutationState, Dispatch<SetStateAction<MutationState>>] {
  const [state, setState] = useState<MutationState>({ pending: false, error: null, success: null });
  return [state, setState];
}
