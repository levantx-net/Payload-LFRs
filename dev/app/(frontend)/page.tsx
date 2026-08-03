import Link from 'next/link'
import { LfrsTestimonials } from 'payload-lfrs/client'

export default function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      <section style={{ textAlign: 'center', padding: '3rem 1rem 1rem' }}>
        <h1
          style={{
            fontSize: '3rem',
            fontWeight: 700,
            marginBottom: '1rem',
            background: 'linear-gradient(to right, #6366f1, #2dd4bf)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Welcome to Payload LFRs Demo
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 2rem' }}>
          Explore Likes, Favourites, Ratings, Reviews, and Testimonials in a single integrated Payload CMS plugin.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link
            href="/posts"
            style={{
              background: 'var(--primary)',
              color: '#fff',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontWeight: 600,
            }}
          >
            Browse Posts
          </Link>
          <Link
            href="/testimonial-form"
            style={{
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              border: '1px solid var(--border)',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontWeight: 600,
            }}
          >
            Submit Testimonial
          </Link>
        </div>
      </section>

      {/* Featured Testimonials Showcase */}
      <section>
        <LfrsTestimonials />
      </section>
    </div>
  )
}
