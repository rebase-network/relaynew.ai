import { useState } from "react";
import * as Shared from "../../shared";

const {
  createSubmitModelPriceRow,
  fetchJson,
  validateSubmitForm,
} = Shared;

export function useSubmitForm() {
  const [state, setState] = useState<Shared.SubmitFormState>({
    relayName: "",
    baseUrl: "",
    websiteUrl: "",
    contactInfo: "",
    description: "",
    testApiKey: "",
    compatibilityMode: "auto",
    modelPrices: [createSubmitModelPriceRow()],
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Shared.PublicSubmissionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Shared.SubmitFormErrors>({});

  function updateField<Key extends keyof Shared.SubmitFormState>(key: Key, value: Shared.SubmitFormState[Key]) {
    setState((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setError(null);
  }

  function updateModelPriceRow(rowId: string, key: "modelKey" | "inputPricePer1M" | "outputPricePer1M", value: string) {
    setState((current) => ({
      ...current,
      modelPrices: current.modelPrices.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)),
    }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.modelPrices;
      return next;
    });
    setError(null);
  }

  function addModelPriceRow() {
    setState((current) => ({
      ...current,
      modelPrices: [...current.modelPrices, createSubmitModelPriceRow(current.modelPrices.length)],
    }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.modelPrices;
      return next;
    });
  }

  function removeModelPriceRow(rowId: string) {
    setState((current) => ({
      ...current,
      modelPrices:
        current.modelPrices.length > 1
          ? current.modelPrices.filter((row) => row.id !== rowId)
          : [createSubmitModelPriceRow()],
    }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.modelPrices;
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    const { errors, payload } = validateSubmitForm(state);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("请先修正高亮字段后再提交。");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetchJson<Shared.PublicSubmissionResponse>("/public/submissions", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setResult(response);
      setState({
        relayName: "",
        baseUrl: "",
        websiteUrl: "",
        contactInfo: "",
        description: "",
        testApiKey: "",
        compatibilityMode: "auto",
        modelPrices: [createSubmitModelPriceRow()],
      });
      setFieldErrors({});
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "提交失败。");
    } finally {
      setSubmitting(false);
    }
  }

  return {
    addModelPriceRow,
    error,
    fieldErrors,
    handleSubmit,
    removeModelPriceRow,
    result,
    state,
    submitting,
    updateField,
    updateModelPriceRow,
  };
}

export type SubmitFormController = ReturnType<typeof useSubmitForm>;
