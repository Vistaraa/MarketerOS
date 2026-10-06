import { ContentDetailView } from "@/components/content-studio/content-detail-view";

export default async function ContentDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContentDetailView contentId={id} />;
}
