import { ReportDetailView } from "@/components/reports/report-detail-view";

export default async function ReportDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportDetailView reportId={id} />;
}
