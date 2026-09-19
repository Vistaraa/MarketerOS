import { ReportDetailView } from "@/components/reports/report-detail-view";

export default function ReportDetailRoute({ params }: { params: { id: string } }) {
  return <ReportDetailView reportId={params.id} />;
}
