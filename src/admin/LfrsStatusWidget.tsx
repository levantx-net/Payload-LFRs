'use client'

import { useField } from '@payloadcms/ui'
import React from 'react'

export const LfrsStatusWidget: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { value } = useField<any>({ path: 'lfrs' })

  if (!value) {
    return null
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      <h4
        style={{
          color: 'var(--theme-elevation-400)',
          fontSize: '14px',
          margin: '0 0 12px 0',
          textTransform: 'uppercase',
        }}
      >
        Interactions
      </h4>
      <div
        style={{
          background: 'var(--theme-elevation-50)',
          border: '1px solid var(--theme-elevation-100)',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '16px',
        }}
      >
        {typeof value.likesCount === 'number' && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Likes:</span>
            <strong>{value.likesCount}</strong>
          </div>
        )}
        {typeof value.dislikesCount === 'number' && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Dislikes:</span>
            <strong>{value.dislikesCount}</strong>
          </div>
        )}
        {typeof value.favouritesCount === 'number' && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Favourites:</span>
            <strong>{value.favouritesCount}</strong>
          </div>
        )}
        {typeof value.ratingsCount === 'number' && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Ratings:</span>
            <strong>
              {value.ratingsCount} (Avg: {value.ratingsAverage?.toFixed(1) || 0})
            </strong>
          </div>
        )}
        {typeof value.reviewsCount === 'number' && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Reviews:</span>
            <strong>{value.reviewsCount}</strong>
          </div>
        )}
      </div>
    </div>
  )
}
