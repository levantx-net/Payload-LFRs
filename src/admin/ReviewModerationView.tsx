'use client'

import { usePayloadAPI } from '@payloadcms/ui'
import React, { useState } from 'react'

type Tab = 'pending-reviews' | 'pending-replies' | 'likes' | 'dislikes' | 'favourites'

export const ReviewModerationView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('pending-reviews')

  // Pending reviews
  const [{ data: reviewsData, isLoading: reviewsLoading }, { setParams: setReviewsParams }] =
    usePayloadAPI('/api/lfrs-reviews', {
      initialParams: {
        limit: 20,
        sort: '-createdAt',
        where: {
          status: {
            equals: 'pending',
          },
        },
      },
    })

  // Pending replies
  const [{ data: repliesData, isLoading: repliesLoading }, { setParams: setRepliesParams }] =
    usePayloadAPI('/api/lfrs-replies', {
      initialParams: {
        limit: 20,
        sort: '-createdAt',
        where: {
          status: {
            equals: 'pending',
          },
        },
      },
    })

  // All likes
  const [{ data: likesData, isLoading: likesLoading }, { setParams: setLikesParams }] =
    usePayloadAPI('/api/lfrs-likes', {
      initialParams: {
        limit: 20,
        sort: '-createdAt',
      },
    })

  // All dislikes
  const [{ data: dislikesData, isLoading: dislikesLoading }, { setParams: setDislikesParams }] =
    usePayloadAPI('/api/lfrs-dislikes', {
      initialParams: {
        limit: 20,
        sort: '-createdAt',
      },
    })

  // All favourites
  const [{ data: favouritesData, isLoading: favouritesLoading }, { setParams: setFavouritesParams }] =
    usePayloadAPI('/api/lfrs-favourites', {
      initialParams: {
        limit: 20,
        sort: '-createdAt',
      },
    })

  const handleApprove = async (collection: string, id: string) => {
    try {
      await fetch(`/api/${collection}/${id}`, {
        body: JSON.stringify({ status: 'approved' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      })
      setReviewsParams((prev: any) => ({ ...prev }))
      setRepliesParams((prev: any) => ({ ...prev }))
    } catch (e) {
      // eslint-disable-next-line no-console
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
      setReviewsParams((prev: any) => ({ ...prev }))
      setRepliesParams((prev: any) => ({ ...prev }))
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
  }

  const handleDelete = async (collection: string, id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return
    }
    try {
      await fetch(`/api/${collection}/${id}`, {
        method: 'DELETE',
      })
      if (collection === 'lfrs-likes') {
        setLikesParams((prev: any) => ({ ...prev }))
      } else if (collection === 'lfrs-dislikes') {
        setDislikesParams((prev: any) => ({ ...prev }))
      } else if (collection === 'lfrs-favourites') {
        setFavouritesParams((prev: any) => ({ ...prev }))
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
  }

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    background: isActive ? 'var(--theme-elevation-100)' : 'transparent',
    border: 'none',
    borderBottom: isActive ? '2px solid var(--theme-elevation-800)' : '2px solid transparent',
    color: isActive ? 'var(--theme-elevation-800)' : 'var(--theme-elevation-400)',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    padding: '12px 20px',
    transition: 'all 0.2s ease',
  })

  const cardStyle: React.CSSProperties = {
    background: 'var(--theme-elevation-50)',
    border: '1px solid var(--theme-elevation-200)',
    borderRadius: '4px',
    padding: '1rem',
  }

  const buttonStyle = (bg: string): React.CSSProperties => ({
    background: bg,
    border: 'none',
    borderRadius: '4px',
    color: 'white',
    cursor: 'pointer',
    padding: '0.5rem 1rem',
  })

  const renderInteractionCard = (
    doc: any,
    type: 'like' | 'dislike' | 'favourite',
  ) => {
    const collectionMap = {
      dislike: 'lfrs-dislikes',
      favourite: 'lfrs-favourites',
      like: 'lfrs-likes',
    }
    const collection = collectionMap[type]
    const label = type.charAt(0).toUpperCase() + type.slice(1)
    return (
      <div key={doc.id} style={cardStyle}>
        <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <strong>{label}</strong>
          <button onClick={() => handleDelete(collection, doc.id)} style={buttonStyle('#e00')} type="button">
            Delete
          </button>
        </div>
        <div style={{ color: 'var(--theme-elevation-400)', fontSize: '0.8rem' }}>
          User: {typeof doc.user === 'object' ? doc.user?.email || doc.user?.id : doc.user} | Target:{' '}
          {doc.targetCollection} ({doc.targetDoc})
        </div>
      </div>
    )
  }

  return (
    <div style={{ margin: '0 auto', maxWidth: '1200px', padding: '2rem' }}>
      <h1>LFRs Moderation</h1>
      <p style={{ color: 'var(--theme-elevation-400)' }}>
        Review and moderate user interactions across all collections.
      </p>

      <div
        style={{
          borderBottom: '1px solid var(--theme-elevation-200)',
          display: 'flex',
          gap: '4px',
          marginBottom: '2rem',
          marginTop: '2rem',
        }}
      >
        <button onClick={() => setActiveTab('pending-reviews')} style={tabStyle(activeTab === 'pending-reviews')} type="button">
          Pending Reviews ({reviewsData?.totalDocs || 0})
        </button>
        <button onClick={() => setActiveTab('pending-replies')} style={tabStyle(activeTab === 'pending-replies')} type="button">
          Pending Replies ({repliesData?.totalDocs || 0})
        </button>
        <button onClick={() => setActiveTab('likes')} style={tabStyle(activeTab === 'likes')} type="button">
          All Likes ({likesData?.totalDocs || 0})
        </button>
        <button onClick={() => setActiveTab('dislikes')} style={tabStyle(activeTab === 'dislikes')} type="button">
          All Dislikes ({dislikesData?.totalDocs || 0})
        </button>
        <button onClick={() => setActiveTab('favourites')} style={tabStyle(activeTab === 'favourites')} type="button">
          All Favourites ({favouritesData?.totalDocs || 0})
        </button>
      </div>

      {activeTab === 'pending-reviews' && (
        <section>
          {reviewsLoading ? (
            <div>Loading...</div>
          ) : reviewsData?.docs?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reviewsData.docs.map((doc: any) => (
                <div key={doc.id} style={cardStyle}>
                  <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <strong>
                      {doc.title || 'No title'} (Score: {doc.score})
                    </strong>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleApprove('lfrs-reviews', doc.id)} style={buttonStyle('#0070f3')} type="button">
                        Approve
                      </button>
                      <button onClick={() => handleReject('lfrs-reviews', doc.id)} style={buttonStyle('#e00')} type="button">
                        Reject
                      </button>
                    </div>
                  </div>
                  <p>{doc.body}</p>
                  <div style={{ color: 'var(--theme-elevation-400)', fontSize: '0.8rem' }}>
                    User: {typeof doc.user === 'object' ? doc.user?.email || doc.user?.id : doc.user} | Target:{' '}
                    {doc.targetCollection} ({doc.targetDoc})
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No pending reviews.</p>
          )}
        </section>
      )}

      {activeTab === 'pending-replies' && (
        <section>
          {repliesLoading ? (
            <div>Loading...</div>
          ) : repliesData?.docs?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {repliesData.docs.map((doc: any) => (
                <div key={doc.id} style={cardStyle}>
                  <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <strong>
                      Reply to Review ID:{' '}
                      {typeof doc.review === 'object' ? doc.review?.id : doc.review}
                    </strong>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleApprove('lfrs-replies', doc.id)} style={buttonStyle('#0070f3')} type="button">
                        Approve
                      </button>
                      <button onClick={() => handleReject('lfrs-replies', doc.id)} style={buttonStyle('#e00')} type="button">
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
      )}

      {activeTab === 'likes' && (
        <section>
          {likesLoading ? (
            <div>Loading...</div>
          ) : likesData?.docs?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {likesData.docs.map((doc: any) => renderInteractionCard(doc, 'like'))}
            </div>
          ) : (
            <p>No likes yet.</p>
          )}
        </section>
      )}

      {activeTab === 'dislikes' && (
        <section>
          {dislikesLoading ? (
            <div>Loading...</div>
          ) : dislikesData?.docs?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {dislikesData.docs.map((doc: any) => renderInteractionCard(doc, 'dislike'))}
            </div>
          ) : (
            <p>No dislikes yet.</p>
          )}
        </section>
      )}

      {activeTab === 'favourites' && (
        <section>
          {favouritesLoading ? (
            <div>Loading...</div>
          ) : favouritesData?.docs?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {favouritesData.docs.map((doc: any) => renderInteractionCard(doc, 'favourite'))}
            </div>
          ) : (
            <p>No favourites yet.</p>
          )}
        </section>
      )}
    </div>
  )
}
