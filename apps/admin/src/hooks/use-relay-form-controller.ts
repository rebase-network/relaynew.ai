import { useCallback, useState } from "react";
import * as Shared from "../shared";

type RelayRow = Shared.AdminRelaysResponse["rows"][number];

export function useRelayFormController(initialRelay: RelayRow | null = null, onDirty?: () => void) {
  const [form, setForm] = useState<Shared.RelayFormState>(() => Shared.buildRelayFormState(initialRelay ?? undefined));
  const [fieldErrors, setFieldErrors] = useState<Shared.RelayFormErrors>({});

  const loadRelay = useCallback((relay: RelayRow | null = null) => {
    setForm(Shared.buildRelayFormState(relay ?? undefined));
    setFieldErrors({});
  }, []);

  const updateForm = useCallback(<Key extends keyof Shared.RelayFormState>(key: Key, value: Shared.RelayFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    onDirty?.();
  }, [onDirty]);

  const updatePriceRow = useCallback((rowId: string, key: keyof Shared.RelayPriceRowFormState, value: string) => {
    setForm((current) => ({
      ...current,
      modelPrices: current.modelPrices.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)),
    }));
    setFieldErrors((current) => Shared.withoutFieldError(current, "modelPrices"));
    onDirty?.();
  }, [onDirty]);

  const addPriceRow = useCallback(() => {
    setForm((current) => ({
      ...current,
      modelPrices: [...current.modelPrices, Shared.createRelayPriceRowFormState(current.modelPrices.length)],
    }));
    setFieldErrors((current) => Shared.withoutFieldError(current, "modelPrices"));
    onDirty?.();
  }, [onDirty]);

  const removePriceRow = useCallback((rowId: string) => {
    setForm((current) => ({
      ...current,
      modelPrices:
        current.modelPrices.length > 1
          ? current.modelPrices.filter((row) => row.id !== rowId)
          : [Shared.createRelayPriceRowFormState()],
    }));
    setFieldErrors((current) => Shared.withoutFieldError(current, "modelPrices"));
    onDirty?.();
  }, [onDirty]);

  return {
    form,
    fieldErrors,
    setFieldErrors,
    loadRelay,
    updateForm,
    updatePriceRow,
    addPriceRow,
    removePriceRow,
  };
}
