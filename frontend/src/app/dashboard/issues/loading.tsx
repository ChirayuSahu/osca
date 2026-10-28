import { PageContainer } from "@/components/ui/page-container";
import { ListCardSkeleton, PageHeaderSkeleton } from "@/components/skeletons";

// Next issues: one list card of issue rows
export default function Loading() {
  return (
    <PageContainer aria-busy="true">
      <PageHeaderSkeleton />
      <ListCardSkeleton rows={6} action={false} />
    </PageContainer>
  );
}
