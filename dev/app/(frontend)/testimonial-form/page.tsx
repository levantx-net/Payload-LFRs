import React from 'react'
import { LfrsTestimonialForm } from 'payload-lfrs/client'

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function TestimonialFormPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams
  const code =
    typeof resolvedSearchParams.code === 'string'
      ? resolvedSearchParams.code
      : ''

  return (
    <div style={{ maxWidth: '650px', margin: '2rem auto', padding: '0 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Leave a Testimonial
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          We standardly invite users to share their experience. Thank you for your feedback!
        </p>
      </div>

      {!code && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: '#f87171',
            fontSize: '0.9rem',
            textAlign: 'center',
          }}
        >
          No invitation code was found in the URL. If you received an email invite, please click the link provided in the email.
        </div>
      )}

      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '2rem',
        }}
      >
        <LfrsTestimonialForm uniqueCode={code} />
      </div>
    </div>
  )
}
