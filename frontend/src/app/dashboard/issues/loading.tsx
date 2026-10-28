import { PageContainer } from "@/components/ui/page-container";
import { CardGridSkeleton, PageHeaderSkeleton, RepoCardSkeleton } from "@/components/skeletons";

// Next issues: a grid of issue cards
export default function Loading() {
  return (
    <PageContainer aria-busy="true">
      <PageHeaderSkeleton />
      <CardGridSkeleton card={<RepoCardSkeleton />} />
    </PageContainer>
  );
}
