import * as Shared from "../shared";
import { SubmissionInspectorDrawer } from "../components/submission-inspector-drawer";
import { SubmissionListCard } from "../components/submission-list-card";

const {
  Card,
  ErrorCard,
  LoadingCard,
  useEffect,
  useLoadable,
  useState,
} = Shared;

export function SubmissionHistoryPage() {
  const submissions = useLoadable<Shared.AdminSubmissionsResponse>(() => Shared.fetchJson("/admin/submissions"), []);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const historyRows = (submissions.data?.rows ?? []).filter((row) => row.status !== "pending");
  const approvedCount = historyRows.filter((row) => row.status === "approved").length;
  const rejectedCount = historyRows.filter((row) => row.status === "rejected").length;
  const archivedCount = historyRows.filter((row) => row.status === "archived").length;
  const selectedSubmission = historyRows.find((row) => row.id === selectedSubmissionId) ?? null;

  useEffect(() => {
    if (!selectedSubmissionId || submissions.loading) {
      return;
    }

    if (!selectedSubmission) {
      setSelectedSubmissionId(null);
    }
  }, [selectedSubmission, selectedSubmissionId, submissions.loading]);

  if (submissions.loading) {
    return <LoadingCard />;
  }

  if (submissions.error || !submissions.data) {
    return <ErrorCard message={submissions.error ?? "无法加载提交历史。"} />;
  }

  return (
    <>
      <Card title="提交历史">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 pb-2.5">
          <p className="text-xs text-white/68">共 {historyRows.length} 条</p>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/60">通过 {approvedCount}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/60">拒绝 {rejectedCount}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/60">归档 {archivedCount}</span>
        </div>

        <div className="mt-2.5 space-y-2">
          {historyRows.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/58">
              当前还没有历史提交记录。
            </div>
          ) : historyRows.map((row) => (
            <SubmissionListCard
              key={row.id}
              onSelect={() => setSelectedSubmissionId(row.id)}
              selected={row.id === selectedSubmissionId}
              variant="history"
              row={row}
            />
          ))}
        </div>
      </Card>

      <SubmissionInspectorDrawer
        mode="history"
        open={Boolean(selectedSubmission)}
        submission={selectedSubmission}
        onClose={() => setSelectedSubmissionId(null)}
        onReload={submissions.reload}
      />
    </>
  );
}
