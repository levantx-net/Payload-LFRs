import configPromise from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { LfrsRatingSummary } from 'payload-lfrs/client'

import {
  LfrsFavourite,
  LfrsLikeDislike,
  LfrsReviewsSection,
} from '../../components/LfrsWithRedirects'

export default async function SinglePostPage({ params }: { params: { id: string } }) {
  const { id } = await params
  const payload = await getPayload({ config: configPromise })

  let post
  try {
    post = await payload.findByID({
      id,
      collection: 'posts',
    })
  } catch (e) {
    notFound()
  }

  return (
    <div className="post-container">
      <div className="post-header">
        <div style={{ alignItems: 'flex-start', display: 'flex', justifyContent: 'space-between' }}>
          <h1 className="post-title">{post?.title}</h1>
          <LfrsFavourite targetCollection="posts" targetDoc={id} />
        </div>

        <div className="lfrs-actions">
          <LfrsLikeDislike
            targetCollection="posts"
            targetDoc={id}
          />
          <span style={{ color: 'var(--text-muted)' }}>Like or Dislike this post</span>
        </div>
      </div>

      <div className="post-content">
        <p>
          This is the content of the post: {post?.title}. In a real application, this would be
          rendering rich text or other fields from the Payload CMS.
        </p>
        <p>
          You can interact with this post using the Like, Dislike, and Favourite buttons above, or
          rate and review it below.
        </p>
      </div>

      <hr style={{ borderColor: 'var(--border)', margin: '3rem 0' }} />

      <div className="lfrs-container">
        <h2>Rate and Review this Post</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Please rate this post out of 5 and leave a review below.
        </p>

        {/* This component shows the distribution of 5, 4, 3, 2, 1 stars */}
        <LfrsRatingSummary targetCollection="posts" targetDoc={id} />

        <div style={{ marginTop: '3rem' }}>
          {/* This component displays existing reviews and provides an input field to add a new review */}
          <LfrsReviewsSection targetCollection="posts" targetDoc={id} />
        </div>
      </div>
    </div>
  )
}
