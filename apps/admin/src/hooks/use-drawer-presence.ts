import { useEffect, useState } from "react";

export function useDrawerPresence<T>(open: boolean, value: T | null, clearDelayMs = 240) {
  const [presentedValue, setPresentedValue] = useState<T | null>(value);

  useEffect(() => {
    if (value) {
      setPresentedValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (open || !presentedValue) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setPresentedValue(null);
    }, clearDelayMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [clearDelayMs, open, presentedValue]);

  return presentedValue;
}
