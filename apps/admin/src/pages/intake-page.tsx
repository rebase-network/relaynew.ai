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

export function IntakePage() {
  const submissions = useLoadable<Shared.AdminSubmissionsResponse>(() => Shared.fetchJson("/admin/submissions"), []);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const pendingRows = (submissions.data?.rows ?? []).filter((row) => row.status === "pending");
  const selectedSubmission = pendingRows.find((row) => row.id === selectedSubmissionId) ?? null;
  const testedCount = pendingRows.filter((row) => row.probeCredential?.lastVerifiedAt).length;
  const attentionCount = pendingRows.filter((row) => row.probeCredential?.lastProbeOk === false).length;

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
    return <ErrorCard message={submissions.error ?? "无法加载提交记录。"} />;
  }

  return (
    <>
      <Card title="提交记录">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 pb-2.5">
          <p className="text-xs text-white/68">共 {pendingRows.length} 条待处理</p>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/60">已初测 {testedCount}</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/60">需关注 {attentionCount}</span>
        </div>

        <div className="mt-2.5 space-y-2">
          {pendingRows.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/58">
              当前没有待审核提交。
            </div>
          ) : pendingRows.map((row) => (
            <SubmissionListCard
              key={row.id}
              onSelect={() => setSelectedSubmissionId(row.id)}
              selected={row.id === selectedSubmissionId}
              variant="pending"
              row={row}
            />
          ))}
        </div>
      </Card>

      <SubmissionInspectorDrawer
        mode="pending"
        open={Boolean(selectedSubmission)}
        submission={selectedSubmission}
        onClose={() => setSelectedSubmissionId(null)}
        onReload={submissions.reload}
      />
    </>
  );
}
