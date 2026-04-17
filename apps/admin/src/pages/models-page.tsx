import * as Shared from "../shared";

const {
  clsx,
  Link,
  useEffect,
  useMemo,
  useSearchParams,
  useState,
  Card,
  ConfirmDialog,
  ErrorCard,
  FieldError,
  LoadingCard,
  Notice,
  PROBE_COMPATIBILITY_OPTIONS,
  PUBLIC_SITE_URL,
  buildCredentialRoute,
  buildPriceModelOptions,
  buildRelayFormState,
  buildRelaySelectOptions,
  createDefaultModelFormState,
  createDefaultPriceFormState,
  createDefaultSponsorFormState,
  createRelayPriceRowFormState,
  fetchJson,
  formatCatalogStatus,
  formatCompatibilityMode,
  formatCredentialStatus,
  formatDate,
  formatDateTime,
  formatHealthStatus,
  formatModelStatus,
  formatOverviewMetricLabel,
  formatSubmissionStatus,
  formatSponsorStatus,
  formatTime,
  getModelOptionLabel,
  getRelayOptionLabel,
  matchesSearchQuery,
  pickPreferredCredential,
  trimString,
  useLoadable,
  useMutationState,
  validateModelForm,
  validatePriceForm,
  validateProbeCredentialForm,
  validateRelayForm,
  validateSponsorForm,
  withoutFieldError,
} = Shared;

export function ModelsPage() {
  const models = useLoadable<Shared.AdminModelsResponse>(() => fetchJson("/admin/models"), []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Shared.AdminModelUpsert>(createDefaultModelFormState);
  const [fieldErrors, setFieldErrors] = useState<Shared.ModelFormErrors>({});
  const [mutation, setMutation] = useMutationState();

  function resetForm() {
    setEditingId(null);
    setForm(createDefaultModelFormState());
    setFieldErrors({});
    setMutation({ pending: false, error: null, success: null });
  }

  function beginEditingModel(model: Shared.AdminModel) {
    setEditingId(model.id);
    setForm({
      key: model.key,
      vendor: model.vendor,
      name: model.name,
      family: model.family,
      inputPriceUnit: model.inputPriceUnit,
      outputPriceUnit: model.outputPriceUnit,
      isActive: model.isActive,
    });
    setFieldErrors({});
    setMutation({ pending: false, error: null, success: null });
  }

  async function submitModel() {
    const { errors, payload } = validateModelForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setMutation({ pending: false, error: "请先修正高亮字段，再保存模型。", success: null });
      return;
    }

    setMutation({ pending: true, error: null, success: null });
    try {
      await fetchJson(editingId ? `/admin/models/${editingId}` : "/admin/models", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setMutation({ pending: false, error: null, success: editingId ? "模型已更新。" : "模型已创建。" });
      setEditingId(null);
      setForm(createDefaultModelFormState());
      setFieldErrors({});
      await models.reload();
    } catch (reason) {
      setMutation({
        pending: false,
        error: reason instanceof Error ? reason.message : editingId ? "无法更新模型。" : "无法创建模型。",
        success: null,
      });
    }
  }

  if (models.loading) return <LoadingCard />;
  if (models.error || !models.data) return <ErrorCard message={models.error ?? "无法加载模型列表。"} />;

  const activeCount = models.data.rows.filter((model) => model.isActive).length;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <Card title="模型列表" kicker="站点目录使用的模型">
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white/62">
          这里维护站点目录使用的模型清单。启用中的模型会出现在价格页的下拉框中；停用后会保留历史价格和探测数据，
          但不再用于新的价格录入。
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">模型目录</p>
              <p className="mt-1 text-lg tracking-[-0.03em]">当前已录入的模型</p>
            </div>
            <p className="text-sm text-white/48">
              启用 {activeCount} / 共 {models.data.rows.length}
            </p>
          </div>
          {models.data.rows.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/58">
              当前还没有模型记录，请先补录模型目录。
            </div>
          ) : models.data.rows.map((model) => (
            <div
              key={model.id}
              className={clsx(
                "admin-list-card border p-3.5",
                model.id === editingId ? "border-[#ffd06a]/70 bg-white/10" : "border-white/10 bg-white/5",
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xl tracking-[-0.03em]">{model.name}</p>
                  <p className="mt-1 text-sm text-white/60">{model.vendor} · {model.family}</p>
                </div>
                <p className="text-xs uppercase tracking-[0.16em] text-white/40">{formatModelStatus(model.isActive)}</p>
              </div>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/40">{model.key}</p>
              <p className="mt-3 text-sm text-white/60">
                输入单位：{model.inputPriceUnit ?? "未设置"} · 输出单位：{model.outputPriceUnit ?? "未设置"}
              </p>
              <p className="mt-2 text-sm text-white/55">
                最近更新：{formatDateTime(model.updatedAt)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="pill pill-idle" onClick={() => beginEditingModel(model)} type="button">
                  编辑模型
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title={editingId ? "编辑模型" : "创建模型"} kicker={editingId ? "模型维护" : "目录补录"}>
        {editingId ? (
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/62">
            你正在编辑已有模型。停用模型后，价格页不会再允许新建该模型的价格记录，但历史数据仍会保留。
          </div>
        ) : null}
        <div className="grid gap-2.5">
          {([
            { label: "模型键值", key: "key", placeholder: "openai-gpt-4.1" },
            { label: "模型名称", key: "name", placeholder: "GPT-4.1" },
            { label: "模型提供方", key: "vendor", placeholder: "OpenAI" },
            { label: "模型分类", key: "family", placeholder: "gpt-4.1" },
            { label: "输入价格单位", key: "inputPriceUnit", placeholder: "USD / 1M tokens" },
            { label: "输出价格单位", key: "outputPriceUnit", placeholder: "USD / 1M tokens" },
          ] as const).map(({ label, key, placeholder }) => (
            <label key={key} className="field-label">
              {label}
              <input
                className="field-input"
                placeholder={placeholder}
                type="text"
                value={form[key] ?? ""}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setForm((current) => ({
                    ...current,
                    [key]: nextValue || (key === "inputPriceUnit" || key === "outputPriceUnit" ? null : ""),
                  }));
                  if (key === "key" || key === "vendor" || key === "name" || key === "family") {
                    setFieldErrors((current) => withoutFieldError(current, key));
                  }
                  setMutation((current) => ({ ...current, error: null }));
                }}
              />
              <FieldError
                message={
                  key === "key" || key === "vendor" || key === "name" || key === "family"
                    ? fieldErrors[key]
                    : undefined
                }
              />
            </label>
          ))}
          <label className="inline-flex items-center gap-3 text-sm text-white/70">
            <input
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
              type="checkbox"
            />
            在价格录入中启用
          </label>
          <div className="flex flex-wrap gap-2.5">
            <button className="pill pill-active" disabled={mutation.pending} onClick={submitModel} type="button">
              {mutation.pending ? "保存中..." : editingId ? "保存修改" : "创建模型"}
            </button>
            {editingId ? <button className="pill pill-idle" type="button" onClick={resetForm}>取消编辑</button> : null}
          </div>
          <Notice state={mutation} />
        </div>
      </Card>
    </div>
  );
}

