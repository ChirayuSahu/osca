import { PageContainer } from "@/components/ui/page-container";
import { PageHeaderSkeleton, SettingsSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <PageContainer aria-busy="true">
      <PageHeaderSkeleton />
      <SettingsSkeleton />
    </PageContainer>
  );
}
