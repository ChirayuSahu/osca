import { Metadata } from 'next'
import { FeedList } from '@/components/feed/FeedList'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'

export const metadata: Metadata = {
  title: 'Your Feed | OSCA',
  description: 'Repositories recommended for you based on your skills and interests.',
}

export default function FeedPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Discover"
        title="For you"
        description="Repositories matched to your skills, ranked by how friendly they are to newcomers."
      />
      <FeedList />
    </PageContainer>
  )
}
