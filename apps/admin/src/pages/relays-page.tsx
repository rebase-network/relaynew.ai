import * as Shared from "../shared";
import { AdminDrawer } from "../components/admin-drawer";
import { RelayEditorForm } from "../components/relay-editor-form";
import { WorkflowDetailGrid, WorkflowMetricCard, WorkflowPriceTable, WorkflowSection } from "../components/relay-workflow";

const {
  Card,
  ConfirmDialog,
  ErrorCard,
  LoadingCard,
  Link,
  PUBLIC_SITE_URL,
  buildRelayFormState,
  createRelayPriceRowFormState,
  fetchJson,
  formatCatalogStatus,
  formatCredentialStatus,
  formatDateTime,
  formatHealthStatus,
  useLoadable,
  useMutationState,
  useState,
  validateRelayForm,
  withoutFieldError,
} = Shared;

export function RelaysPage() {
  const relays = useLoadable<Shared.AdminRelaysResponse>(() => fetchJson("/admin/relays"), []);
  const [createOpen, setCreateOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Shared.AdminRelaysResponse["rows"][number] | null>(null);
  const [actionMutation, setActionMutation] = useMutationState();
  const [createMutation, setCreateMutation] = useMutationState();
  const [form, setForm] = useState<Shared.RelayFormState>(() => buildRelayFormState());
  const [fieldErrors, setFieldErrors] = useState<Shared.RelayFormErrors>({});

  function resetCreateForm() {
    setForm(buildRelayFormState());
    setFieldErrors({});
    setCreateMutation({ pending: false, error: null, success: null });
  }

  function openCreateDrawer() {
    resetCreateForm();
    setCreateOpen(true);
  }

  function closeCreateDrawer() {
    setCreateOpen(false);
    resetCreateForm();
  }

  function updateForm<Key extends keyof Shared.RelayFormState>(key: Key, value: Shared.RelayFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setCreateMutation((current) => ({ ...current, error: null }));
  }

  function updatePriceRow(rowId: string, key: keyof Shared.RelayPriceRowFormState, value: string) {
    setForm((current) => ({
      ...current,
      modelPrices: current.modelPrices.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)),
    }));
    setFieldErrors((current) => withoutFieldError(current, "modelPrices"));
    setCreateMutation((current) => ({ ...current, error: null }));
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

  async function createRelay() {
    const { errors, payload } = validateRelayForm(form, { editing: false });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setCreateMutation({ pending: false, error: "请先修正高亮字段，再创建 Relay。", success: null });
      return;
    }

    setCreateMutation({ pending: true, error: null, success: null });
    try {
      await fetchJson("/admin/relays", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await relays.reload();
      closeCreateDrawer();
      setActionMutation({ pending: false, error: null, success: "Relay 已创建并加入当前列表。" });
    } catch (reason) {
      setCreateMutation({ pending: false, error: reason instanceof Error ? reason.message : "无法创建 Relay。", success: null });
    }
  }

  async function updateRelayStatus(relay: Shared.AdminRelaysResponse["rows"][number], status: Shared.RelayFormState["catalogStatus"]) {
    const nextForm = buildRelayFormState(relay);
    nextForm.catalogStatus = status;
    const { payload } = validateRelayForm(nextForm, { editing: true });

    setActionMutation({ pending: true, error: null, success: null });
    try {
      await fetchJson(`/admin/relays/${relay.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setArchiveTarget(null);
      setActionMutation({
        pending: false,
        error: null,
        success:
          status === "archived"
            ? `${relay.name} 已归档到 Relay 历史。`
            : status === "paused"
              ? `${relay.name} 已暂停，后续不会参与自动测试和公开展示。`
              : `${relay.name} 已重新激活。`,
      });
      await relays.reload();
    } catch (reason) {
      setArchiveTarget(null);
      setActionMutation({ pending: false, error: reason instanceof Error ? reason.message : "无法更新 Relay 状态。", success: null });
    }
  }

  if (relays.loading) {
    return <LoadingCard />;
  }

  if (relays.error || !relays.data) {
    return <ErrorCard message={relays.error ?? "无法加载 Relay 列表。"} />;
  }

  const currentRelays = relays.data.rows.filter((relay) => relay.catalogStatus === "active" || relay.catalogStatus === "paused");
  const activeCount = currentRelays.filter((relay) => relay.catalogStatus === "active").length;
  const pausedCount = currentRelays.filter((relay) => relay.catalogStatus === "paused").length;

  return (
    <>
      <Card title="Relay 列表" kicker="当前运营中的站点">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="max-w-3xl text-sm leading-6 text-white/62">
              这里专门用来看当前 Relay 列表。审批通过后的 Relay 会直接进入这里；只有 <span className="text-white/82">active</span> 状态的 Relay
              才参与自动测试、目录展示和榜单排行。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="pill pill-active" type="button" onClick={openCreateDrawer}>
              手动添加 Relay
            </button>
            <Link className="pill pill-ghost" to="/relays/history">查看 Relay 历史</Link>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <WorkflowMetricCard label="当前 Relay" value={currentRelays.length} helper="当前列表只展示 active 和 paused。" />
          <WorkflowMetricCard label="激活中" value={activeCount} helper="会继续参与自动测试、目录与排行榜。" />
          <WorkflowMetricCard label="已暂停" value={pausedCount} helper="保留资料，但不会公开展示。" />
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">当前 Relay</p>
              <p className="mt-1 text-lg tracking-[-0.03em]">面向运营的站点清单</p>
            </div>
            <p className="text-sm text-white/48">共 {currentRelays.length} 条</p>
          </div>

          {currentRelays.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/58">
              当前还没有 Relay。你可以点击右上角“手动添加 Relay”，或去提交记录中批准一个待审核站点。
            </div>
          ) : currentRelays.map((relay) => (
            <div key={relay.id} className="admin-list-card border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xl tracking-[-0.03em]">{relay.name}</p>
                      <span className={relay.catalogStatus === "active" ? "pill pill-active !cursor-default" : "pill pill-idle !cursor-default"}>
                        {formatCatalogStatus(relay.catalogStatus)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/40">{relay.slug}</p>
                    <p className="mt-3 text-sm break-all text-white/64">{relay.baseUrl}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link className="pill pill-active" to={`/relays/${relay.id}`}>编辑 Relay</Link>
                    {relay.catalogStatus === "active" ? (
                      <button className="pill pill-idle" disabled={actionMutation.pending} onClick={() => void updateRelayStatus(relay, "paused")} type="button">
                        暂停
                      </button>
                    ) : (
                      <button className="pill pill-idle" disabled={actionMutation.pending} onClick={() => void updateRelayStatus(relay, "active")} type="button">
                        重新激活
                      </button>
                    )}
                    <a className="pill pill-ghost" href={`${PUBLIC_SITE_URL}/relay/${relay.slug}`} rel="noreferrer" target="_blank">
                      前台详情页
                    </a>
                    <button className="pill pill-ghost" disabled={actionMutation.pending} onClick={() => setArchiveTarget(relay)} type="button">
                      归档
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_minmax(16rem,0.92fr)_minmax(16rem,0.92fr)]">
                  <WorkflowSection title="站点资料" description="目录展示和运营判断会优先参考这里的信息。">
                    {relay.description ? <p className="text-sm leading-6 text-white/72">{relay.description}</p> : <p className="text-sm text-white/48">暂未填写站点简介。</p>}
                    <div className="mt-3">
                      <WorkflowDetailGrid
                        items={[
                          {
                            label: "站点网站",
                            value: relay.websiteUrl ? (
                              <a className="underline underline-offset-4 text-white/82" href={relay.websiteUrl} rel="noreferrer" target="_blank">
                                {relay.websiteUrl}
                              </a>
                            ) : "未填写",
                          },
                          { label: "联系方式", value: relay.contactInfo ?? "未填写" },
                        ]}
                      />
                    </div>
                  </WorkflowSection>

                  <WorkflowSection title="支持模型及价格表" description="快速查看当前公开价格配置。">
                    <WorkflowPriceTable rows={relay.modelPrices} maxRows={4} />
                  </WorkflowSection>

                  <WorkflowSection title="测试状态" description="方便快速判断这个 Relay 是否具备持续测试条件。">
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
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <Shared.Notice state={actionMutation} />
        </div>
      </Card>

      <ConfirmDialog
        confirmLabel="归档 Relay"
        confirmPendingLabel="归档中..."
        message={archiveTarget ? `${archiveTarget.name} 将移出当前 Relay 列表，只保留在 Relay 历史中。` : ""}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (archiveTarget) {
            void updateRelayStatus(archiveTarget, "archived");
          }
        }}
        open={Boolean(archiveTarget)}
        pending={actionMutation.pending}
        title={archiveTarget ? `确认归档 ${archiveTarget.name}？` : ""}
      />

      <AdminDrawer
        open={createOpen}
        title="手动添加 Relay"
        description="新增 Relay 会直接进入当前列表；你可以在这里一次性填写站点资料、价格表和测试信息。"
        onClose={closeCreateDrawer}
      >
        <RelayEditorForm
          mode="create"
          form={form}
          fieldErrors={fieldErrors}
          mutation={createMutation}
          headerNotice="手动新增适合运营人员直接录入 Relay。创建完成后，站点会按状态决定是否参与自动测试与前台展示。"
          submitLabel="创建 Relay"
          submittingLabel="创建中..."
          resetLabel="清空表单"
          onSubmit={() => void createRelay()}
          onReset={resetCreateForm}
          onUpdateForm={updateForm}
          onUpdatePriceRow={updatePriceRow}
          onAddPriceRow={addPriceRow}
          onRemovePriceRow={removePriceRow}
        />
      </AdminDrawer>
    </>
  );
}
