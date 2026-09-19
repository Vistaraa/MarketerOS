import { ContentDetailView } from "@/components/content-studio/content-detail-view";

export default function ContentDetailRoute({ params }: { params: { id: string } }) {
  return <ContentDetailView contentId={params.id} />;
}
