'use client'

import { usePayloadAPI } from '@payloadcms/ui'
import React from 'react'

export const ReviewModerationView: React.FC = () => {
  // We can fetch pending reviews
  const [{ data: reviewsData, isLoading: reviewsLoading }, { setParams: setReviewsParams }] =
    usePayloadAPI('/api/lfrs-reviews', {
      initialParams: {
        limit: 10,
        where: {
          status: {
            equals: 'pending',
          },
        },
      },
    })

  // We can fetch pending replies
  const [{ data: repliesData, isLoading: repliesLoading }, { setParams: setRepliesParams }] =
    usePayloadAPI('/api/lfrs-replies', {
      initialParams: {
        limit: 10,
        where: {
          status: {
            equals: 'pending',
          },
        },
      },
    })

  const handleApprove = async (collection: string, id: string) => {
    try {
      await fetch(`/api/${collection}/${id}`, {
        body: JSON.stringify({ status: 'approved' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      // Refresh
      setReviewsParams((prev: any) => ({ ...prev }))
      setRepliesParams((prev: any) => ({ ...prev }))
    } catch (e) {
      console.error(e)
    }
  }

  const handleReject = async (collection: string, id: string) => {
    try {
      await fetch(`/api/${collection}/${id}`, {
        body: JSON.stringify({ status: 'rejected' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      // Refresh
      setReviewsParams((prev: any) => ({ ...prev }))
      setRepliesParams((prev: any) => ({ ...prev }))
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div style={{ margin: '0 auto', maxWidth: '1200px', padding: '2rem' }}>
      <h1>LFRs Moderation Queue</h1>
      <p style={{ color: 'var(--theme-elevation-400)' }}>
        Review and moderate pending reviews and replies.
      </p>

      <section style={{ marginTop: '2rem' }}>
        <h2>Pending Reviews ({reviewsData?.totalDocs || 0})</h2>
        {reviewsLoading ? (
          <div>Loading...</div>
        ) : reviewsData?.docs?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviewsData.docs.map((doc: any) => (
              <div
                key={doc.id}
                style={{
                  background: 'var(--theme-elevation-50)',
                  border: '1px solid var(--theme-elevation-200)',
                  borderRadius: '4px',
                  padding: '1rem',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}
                >
                  <strong>
                    {doc.title || 'No title'} (Score: {doc.score})
                  </strong>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleApprove('lfrs-reviews', doc.id)}
                      style={{
                        background: '#0070f3',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '0.5rem 1rem',
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject('lfrs-reviews', doc.id)}
                      style={{
                        background: '#e00',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '0.5rem 1rem',
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
                <p>{doc.body}</p>
                <div style={{ color: 'var(--theme-elevation-400)', fontSize: '0.8rem' }}>
                  User: {typeof doc.user === 'object' ? doc.user?.email || doc.user?.id : doc.user}{' '}
                  | Target: {doc.targetCollection} ({doc.targetDoc})
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No pending reviews.</p>
        )}
      </section>

      <section style={{ marginTop: '3rem' }}>
        <h2>Pending Replies ({repliesData?.totalDocs || 0})</h2>
        {repliesLoading ? (
          <div>Loading...</div>
        ) : repliesData?.docs?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {repliesData.docs.map((doc: any) => (
              <div
                key={doc.id}
                style={{
                  background: 'var(--theme-elevation-50)',
                  border: '1px solid var(--theme-elevation-200)',
                  borderRadius: '4px',
                  padding: '1rem',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}
                >
                  <strong>
                    Reply to Review ID:{' '}
                    {typeof doc.review === 'object' ? doc.review?.id : doc.review}
                  </strong>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleApprove('lfrs-replies', doc.id)}
                      style={{
                        background: '#0070f3',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '0.5rem 1rem',
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject('lfrs-replies', doc.id)}
                      style={{
                        background: '#e00',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '0.5rem 1rem',
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
                <p>{doc.body}</p>
                <div style={{ color: 'var(--theme-elevation-400)', fontSize: '0.8rem' }}>
                  User: {typeof doc.user === 'object' ? doc.user?.email || doc.user?.id : doc.user}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No pending replies.</p>
        )}
      </section>
    </div>
  )
}
