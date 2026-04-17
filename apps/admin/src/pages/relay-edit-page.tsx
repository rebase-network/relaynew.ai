import * as Shared from "../shared";
import { RelayEditorForm } from "../components/relay-editor-form";
import { WorkflowDetailGrid, WorkflowPriceTable, WorkflowSection } from "../components/relay-workflow";

const {
  Card,
  ErrorCard,
  Link,
  LoadingCard,
  PUBLIC_SITE_URL,
  buildRelayFormState,
  createRelayPriceRowFormState,
  fetchJson,
  formatCatalogStatus,
  formatCredentialStatus,
  formatDateTime,
  formatHealthStatus,
  useEffect,
  useLoadable,
  useMutationState,
  useNavigate,
  useParams,
  useState,
  validateRelayForm,
  withoutFieldError,
} = Shared;

export function RelayEditPage() {
  const navigate = useNavigate();
  const params = useParams();
  const relayId = params.relayId ?? "";
  const relays = useLoadable<Shared.AdminRelaysResponse>(() => fetchJson("/admin/relays"), [relayId]);
  const [form, setForm] = useState<Shared.RelayFormState>(() => buildRelayFormState());
  const [fieldErrors, setFieldErrors] = useState<Shared.RelayFormErrors>({});
  const [mutation, setMutation] = useMutationState();

  const relay = relays.data?.rows.find((row) => row.id === relayId) ?? null;

  useEffect(() => {
    if (!relay) {
      return;
    }

    setForm(buildRelayFormState(relay));
    setFieldErrors({});
    setMutation({ pending: false, error: null, success: null });
  }, [relay]);

  function updateForm<Key extends keyof Shared.RelayFormState>(key: Key, value: Shared.RelayFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setMutation((current) => ({ ...current, error: null }));
  }

  function updatePriceRow(rowId: string, key: keyof Shared.RelayPriceRowFormState, value: string) {
    setForm((current) => ({
      ...current,
      modelPrices: current.modelPrices.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)),
    }));
    setFieldErrors((current) => withoutFieldError(current, "modelPrices"));
    setMutation((current) => ({ ...current, error: null }));
  }

  function addPriceRow() {
    setForm((current) => ({
      ...current,
      modelPrices: [...current.modelPrices, createRelayPriceRowFormState(current.modelPrices.length)],
    }));
    setFieldErrors((current) => withoutFieldError(current, "modelPrices"));
  }

  function removePriceRow(rowId: string) {
    setForm((current) => ({
      ...current,
      modelPrices:
        current.modelPrices.length > 1
          ? current.modelPrices.filter((row) => row.id !== rowId)
          : [createRelayPriceRowFormState()],
    }));
    setFieldErrors((current) => withoutFieldError(current, "modelPrices"));
  }

  function resetForm() {
    if (!relay) {
      return;
    }

    setForm(buildRelayFormState(relay));
    setFieldErrors({});
    setMutation({ pending: false, error: null, success: null });
  }

  async function submitRelay() {
    if (!relay) {
      return;
    }

    const { errors, payload } = validateRelayForm(form, { editing: true });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setMutation({ pending: false, error: "请先修正高亮字段，再保存 Relay。", success: null });
      return;
    }

    setMutation({ pending: true, error: null, success: null });
    try {
      await fetchJson(`/admin/relays/${relay.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setMutation({ pending: false, error: null, success: "Relay 已更新。" });
      await relays.reload();
    } catch (reason) {
      setMutation({ pending: false, error: reason instanceof Error ? reason.message : "无法保存 Relay。", success: null });
    }
  }

  async function updateRelayStatus(status: Shared.RelayFormState["catalogStatus"]) {
    if (!relay) {
      return;
    }

    const nextForm = buildRelayFormState(relay);
    nextForm.catalogStatus = status;
    const { payload } = validateRelayForm(nextForm, { editing: true });

    setMutation({ pending: true, error: null, success: null });
    try {
      await fetchJson(`/admin/relays/${relay.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setMutation({
        pending: false,
        error: null,
        success:
          status === "archived"
            ? `${relay.name} 已归档。`
            : status === "paused"
              ? `${relay.name} 已暂停。`
              : `${relay.name} 已重新激活。`,
      });
      await relays.reload();
    } catch (reason) {
      setMutation({ pending: false, error: reason instanceof Error ? reason.message : "无法更新 Relay 状态。", success: null });
    }
  }

  if (relays.loading) {
    return <LoadingCard />;
  }

  if (relays.error || !relays.data) {
    return <ErrorCard message={relays.error ?? "无法加载 Relay 详情。"} />;
  }

  if (!relay) {
    return (
      <Card title="未找到 Relay" kicker="Relay 编辑页">
        <p className="text-sm leading-6 text-white/62">这个 Relay 可能已经被删除，或链接中的标识不正确。</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="pill pill-active" to="/relays">返回 Relay 列表</Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">Relay 编辑页</p>
          <h2 className="mt-2 text-3xl tracking-[-0.05em] md:text-4xl">{relay.name}</h2>
          <p className="mt-2 text-sm leading-6 text-white/60">在这里完整编辑站点资料、模型价格、测试 Key 和公开状态。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="pill pill-idle" type="button" onClick={() => navigate(-1)}>
            返回上一页
          </button>
          <Link className="pill pill-ghost" to="/relays">Relay 列表</Link>
          <a className="pill pill-ghost" href={`${PUBLIC_SITE_URL}/relay/${relay.slug}`} rel="noreferrer" target="_blank">
            前台详情页
          </a>
        </div>
      </div>

      <Card title="当前状态与资料概览" kicker="编辑前概览">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.02fr)_minmax(18rem,0.98fr)]">
          <div className="space-y-3">
            <WorkflowSection title="站点资料" description="帮助你在编辑前快速确认当前公开资料。">
              {relay.description ? <p className="text-sm leading-6 text-white/72">{relay.description}</p> : <p className="text-sm text-white/48">暂未填写站点简介。</p>}
              <div className="mt-3">
                <WorkflowDetailGrid
                  items={[
                    { label: "状态", value: formatCatalogStatus(relay.catalogStatus) },
                    {
                      label: "站点网站",
                      value: relay.websiteUrl ? (
                        <a className="underline underline-offset-4 text-white/82" href={relay.websiteUrl} rel="noreferrer" target="_blank">
                          {relay.websiteUrl}
                        </a>
                      ) : "未填写",
                    },
                    { label: "联系方式", value: relay.contactInfo ?? "未填写" },
                    { label: "Base URL", value: relay.baseUrl },
                  ]}
                />
              </div>
            </WorkflowSection>

            <WorkflowSection title="支持模型及价格表" description="这里展示当前已保存的价格信息，保存后会刷新成最新内容。">
              <WorkflowPriceTable rows={relay.modelPrices} maxRows={8} />
            </WorkflowSection>
          </div>

          <div className="space-y-3">
            <WorkflowSection title="测试状态" description="方便确认当前 Relay 是否具备自动测试条件。">
              {relay.probeCredential ? (
                <WorkflowDetailGrid
                  columns={1}
                  items={[
                    {
                      label: "测试凭据",
                      value: `${relay.probeCredential.apiKeyPreview} · ${formatCredentialStatus(relay.probeCredential.status)}`,
                    },
                    {
                      label: "测试模型",
                      value: `${relay.probeCredential.testModel} · ${formatHealthStatus(relay.probeCredential.lastHealthStatus)}${relay.probeCredential.lastHttpStatus ? ` · ${relay.probeCredential.lastHttpStatus}` : ""}`,
                    },
                    {
                      label: "最近验证",
                      value: relay.probeCredential.lastVerifiedAt ? formatDateTime(relay.probeCredential.lastVerifiedAt) : "尚未完成验证",
                    },
                  ]}
                />
              ) : (
                <div className="rounded-2xl border border-[#ffd06a]/24 bg-[#ffd06a]/8 px-3 py-3 text-sm leading-6 text-[#ffd892]">
                  当前没有可用的测试 Key，Relay 无法参与自动测试。
                </div>
              )}
            </WorkflowSection>

            <WorkflowSection title="快捷操作" description="保存资料之外，也可以直接调整 Relay 的公开状态。">
              <div className="flex flex-wrap gap-2">
                {relay.catalogStatus === "active" ? (
                  <button className="pill pill-idle" disabled={mutation.pending} onClick={() => void updateRelayStatus("paused")} type="button">
                    暂停
                  </button>
                ) : (
                  <button className="pill pill-idle" disabled={mutation.pending} onClick={() => void updateRelayStatus("active")} type="button">
                    重新激活
                  </button>
                )}
                <button className="pill pill-ghost" disabled={mutation.pending} onClick={() => void updateRelayStatus("archived")} type="button">
                  归档
                </button>
              </div>
            </WorkflowSection>
          </div>
        </div>
      </Card>

      <Card title="编辑 Relay" kicker="完整表单">
        <RelayEditorForm
          mode="edit"
          form={form}
          fieldErrors={fieldErrors}
          mutation={mutation}
          headerNotice="如不填写新的测试API Key，则保留当前已绑定的 Key；如果填写新的 Key，会直接替换为新的测试凭据。"
          submitLabel="保存修改"
          submittingLabel="保存中..."
          resetLabel="恢复原始内容"
          extraActions={
            relay.catalogStatus === "active" ? (
              <button className="pill pill-ghost" disabled={mutation.pending} onClick={() => void updateRelayStatus("paused")} type="button">
                暂停 Relay
              </button>
            ) : (
              <button className="pill pill-ghost" disabled={mutation.pending} onClick={() => void updateRelayStatus("active")} type="button">
                重新激活
              </button>
            )
          }
          onSubmit={() => void submitRelay()}
          onReset={resetForm}
          onUpdateForm={updateForm}
          onUpdatePriceRow={updatePriceRow}
          onAddPriceRow={addPriceRow}
          onRemovePriceRow={removePriceRow}
        />
      </Card>
    </div>
  );
}
