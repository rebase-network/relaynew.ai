import * as Shared from "../shared";
import { WorkflowDetailGrid, WorkflowPriceTable, WorkflowSection } from "../components/relay-workflow";

const {
  Card,
  ErrorCard,
  LoadingCard,
  Link,
  PUBLIC_SITE_URL,
  fetchJson,
  formatDateTime,
  formatHealthStatus,
  formatSubmissionStatus,
  useLoadable,
} = Shared;

export function SubmissionHistoryPage() {
  const submissions = useLoadable<Shared.AdminSubmissionsResponse>(() => fetchJson("/admin/submissions"), []);

  if (submissions.loading) return <LoadingCard />;
  if (submissions.error || !submissions.data) {
    return <ErrorCard message={submissions.error ?? "无法加载提交历史。"} />;
  }

  const historyRows = submissions.data.rows.filter((row) => row.status !== "pending");

  return (
    <Card title="提交记录历史" kicker="已处理记录">
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white/62">
        这里保留所有已经处理完成的提交，包括 approved、rejected 和 archived，便于运营追溯历史决策和测试快照。
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">提交历史</p>
            <p className="mt-1 text-lg tracking-[-0.03em]">已处理完成</p>
          </div>
          <p className="text-sm text-white/48">共 {historyRows.length} 条</p>
        </div>

        {historyRows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/58">
            当前还没有历史提交记录。
          </div>
        ) : historyRows.map((row) => (
          <div key={row.id} className="admin-list-card border border-white/10 bg-white/5 p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xl tracking-[-0.03em]">{row.relayName}</p>
                    <span className={row.status === "approved" ? "pill pill-active !cursor-default" : "pill pill-idle !cursor-default"}>
                      {formatSubmissionStatus(row.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm break-all text-white/62">{row.baseUrl}</p>
                </div>
                <p className="text-sm text-white/44">提交于 {formatDateTime(row.createdAt)}</p>
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.04fr)_minmax(18rem,0.96fr)]">
                <div className="space-y-3">
                  <WorkflowSection title="提交资料" description="保留原始提交内容，便于回看当时填写的信息。">
                    {row.description ? <p className="text-sm leading-6 text-white/72">{row.description}</p> : <p className="text-sm text-white/48">提交者未填写站点简介。</p>}
                    <div className="mt-3">
                      <WorkflowDetailGrid
                        items={[
                          { label: "联系方式", value: row.contactInfo ?? "未填写" },
                          {
                            label: "关联 Relay",
                            value: row.approvedRelay ? row.approvedRelay.name : row.status === "approved" ? "创建中或已解绑" : "未创建",
                          },
                        ]}
                      />
                    </div>
                  </WorkflowSection>

                  <WorkflowSection title="支持模型及价格表" description="保留提交时的原始价格信息，方便与当前 Relay 配置比对。">
                    <WorkflowPriceTable rows={row.modelPrices} />
                  </WorkflowSection>
                </div>

                <div className="space-y-3">
                  <WorkflowSection title="审核结果" description="这里汇总审批结论、备注和测试快照。">
                    <WorkflowDetailGrid
                      columns={1}
                      items={[
                        { label: "处理状态", value: formatSubmissionStatus(row.status) },
                        { label: "审核备注", value: row.reviewNotes ?? "未填写" },
                        {
                          label: "测试快照",
                          value: row.probeCredential
                            ? `${row.probeCredential.testModel} · ${formatHealthStatus(row.probeCredential.lastHealthStatus)}${row.probeCredential.lastVerifiedAt ? ` · ${formatDateTime(row.probeCredential.lastVerifiedAt)}` : ""}`
                            : "没有测试快照",
                        },
                      ]}
                    />
                  </WorkflowSection>

                  <WorkflowSection title="快捷入口" description="在需要时可以跳转到 Relay 列表或前台详情页继续检查。">
                    <div className="flex flex-wrap gap-2">
                      {row.status === "approved" ? <Link className="pill pill-idle" to="/relays">打开 Relay 列表</Link> : null}
                      {row.approvedRelay ? (
                        <a className="pill pill-ghost" href={`${PUBLIC_SITE_URL}/relay/${row.approvedRelay.slug}`} rel="noreferrer" target="_blank">
                          打开前台页面
                        </a>
                      ) : null}
                    </div>
                  </WorkflowSection>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
