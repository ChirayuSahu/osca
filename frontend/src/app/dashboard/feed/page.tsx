import { Metadata } from 'next'
import { FeedList } from '@/components/feed/FeedList'

export const metadata: Metadata = {
  title: 'Your Feed | OSCA',
  description: 'Repositories recommended for you based on your skills and interests.',
}

export default function FeedPage() {
  return (
    <div className="w-full">
      <FeedList />
    </div>
  )
}
