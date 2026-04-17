import * as Shared from "../shared";
import { WorkflowDetailGrid, WorkflowMetricCard, WorkflowPriceTable, WorkflowSection } from "../components/relay-workflow";

const {
  Card,
  ErrorCard,
  LoadingCard,
  Notice,
  fetchJson,
  formatCredentialStatus,
  formatDateTime,
  formatHealthStatus,
  useLoadable,
  useMutationState,
  useState,
} = Shared;

export function IntakePage() {
  const submissions = useLoadable<Shared.AdminSubmissionsResponse>(() => fetchJson("/admin/submissions"), []);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [mutation, setMutation] = useMutationState();

  async function review(id: string, status: "approved" | "rejected" | "archived") {
    setMutation({ pending: true, error: null, success: null });
    try {
      await fetchJson(`/admin/submissions/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ status, reviewNotes: notes[id] ?? null }),
      });
      setMutation({
        pending: false,
        error: null,
        success:
          status === "approved"
            ? "提交已通过，记录已进入提交历史，同时 Relay 已进入当前列表。"
            : `提交已标记为${status === "rejected" ? "拒绝" : "归档"}，并移入提交历史。`,
      });
      await submissions.reload();
    } catch (reason) {
      setMutation({ pending: false, error: reason instanceof Error ? reason.message : "无法处理提交记录。", success: null });
    }
  }

  if (submissions.loading) return <LoadingCard />;
  if (submissions.error || !submissions.data) {
    return <ErrorCard message={submissions.error ?? "无法加载提交记录。"} />;
  }

  const pendingRows = submissions.data.rows.filter((row) => row.status === "pending");
  const needsAttention = pendingRows.filter((row) => row.probeCredential?.lastProbeOk === false).length;
  const testedCount = pendingRows.filter((row) => row.probeCredential?.lastVerifiedAt).length;

  return (
    <Card title="提交记录" kicker="当前待审核">
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm leading-6 text-white/68">
          这里只保留当前待处理的提交。审批通过后会直接进入 Relay 列表；未通过的提交会进入提交历史，不再停留在当前队列。
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <WorkflowMetricCard label="待审核" value={pendingRows.length} helper="仍需运营人员给出处理结果。" />
          <WorkflowMetricCard label="已初测" value={testedCount} helper="已经拿到自动测试快照，可辅助审批。" />
          <WorkflowMetricCard label="需关注" value={needsAttention} helper="自动测试失败或结果异常，建议先阅读测试快照。" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">当前队列</p>
              <p className="mt-1 text-lg tracking-[-0.03em]">等待审批的提交</p>
            </div>
            <p className="text-sm text-white/48">共 {pendingRows.length} 条</p>
          </div>

          {pendingRows.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/58">
              当前没有待审核提交。
            </div>
          ) : pendingRows.map((row) => (
            <div key={row.id} className="admin-list-card border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xl tracking-[-0.03em]">{row.relayName}</p>
                    <p className="mt-2 text-sm break-all text-white/64">{row.baseUrl}</p>
                  </div>
                  <div className="text-sm text-white/46">
                    <p>{formatDateTime(row.createdAt)}</p>
                    <p className="mt-1">初始测试 {row.probeCredential ? "已完成" : "待执行"}</p>
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-[minmax(0,1.06fr)_minmax(18rem,0.94fr)]">
                  <div className="space-y-3">
                    <WorkflowSection title="提交资料" description="这些信息将决定目录简介、联系方式以及后续 Relay 基础信息。">
                      {row.description ? <p className="text-sm leading-6 text-white/72">{row.description}</p> : <p className="text-sm text-white/48">提交者未填写站点简介。</p>}
                      <div className="mt-3">
                        <WorkflowDetailGrid
                          items={[
                            {
                              label: "站点网站",
                              value: row.websiteUrl ? (
                                <a className="underline underline-offset-4 text-white/82" href={row.websiteUrl} rel="noreferrer" target="_blank">
                                  {row.websiteUrl}
                                </a>
                              ) : "未填写",
                            },
                            { label: "联系方式", value: row.contactInfo ?? "未填写" },
                          ]}
                        />
                      </div>
                    </WorkflowSection>

                    <WorkflowSection title="支持模型及价格表" description="审批通过后会作为 Relay 的初始价格资料写入列表。">
                      <WorkflowPriceTable rows={row.modelPrices} />
                    </WorkflowSection>
                  </div>

                  <div className="space-y-3">
                    <WorkflowSection title="初始测试快照" description="优先看健康状态、HTTP 返回与错误消息，判断测试 Key 是否可用。">
                      {row.probeCredential ? (
                        <WorkflowDetailGrid
                          columns={1}
                          items={[
                            {
                              label: "测试凭据",
                              value: `${row.probeCredential.apiKeyPreview} · ${formatCredentialStatus(row.probeCredential.status)}`,
                            },
                            {
                              label: "测试模型",
                              value: `${row.probeCredential.testModel} · ${formatHealthStatus(row.probeCredential.lastHealthStatus)}${row.probeCredential.lastHttpStatus ? ` · ${row.probeCredential.lastHttpStatus}` : ""}`,
                            },
                            {
                              label: "最近测试",
                              value: row.probeCredential.lastVerifiedAt ? formatDateTime(row.probeCredential.lastVerifiedAt) : "尚未完成验证",
                            },
                            {
                              label: "测试消息",
                              value: row.probeCredential.lastMessage ?? "暂无附加消息。",
                            },
                          ]}
                        />
                      ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-3 py-4 text-sm text-white/50">
                          当前还没有初始测试快照，可稍后刷新查看。
                        </div>
                      )}
                    </WorkflowSection>

                    <WorkflowSection title="审核备注与操作" description="备注会随记录一起进入提交历史，便于后续追踪。">
                      <label className="field-label block">
                        审核备注
                        <textarea
                          className="field-input min-h-28"
                          placeholder="记录测试异常、补充信息或拒绝原因"
                          value={notes[row.id] ?? row.reviewNotes ?? ""}
                          onChange={(event) => setNotes((current) => ({ ...current, [row.id]: event.target.value }))}
                        />
                      </label>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button className="pill pill-active" disabled={mutation.pending} type="button" onClick={() => review(row.id, "approved")}>批准并创建 Relay</button>
                        <button className="pill pill-idle" disabled={mutation.pending} type="button" onClick={() => review(row.id, "rejected")}>拒绝</button>
                        <button className="pill pill-ghost" disabled={mutation.pending} type="button" onClick={() => review(row.id, "archived")}>归档</button>
                      </div>
                    </WorkflowSection>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4"><Notice state={mutation} /></div>
    </Card>
  );
}
