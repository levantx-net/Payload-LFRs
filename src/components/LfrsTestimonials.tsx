'use client'

import React, { useEffect, useState } from 'react'

import classes from './styles/lfrs.module.css'

export type Testimonial = {
  id: string
  firstName: string
  rating: number
  testimonial: string
  photo?: { url: string }
}

export const LfrsTestimonials: React.FC = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/lfrs/testimonials?featured=true&limit=3', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.docs) {
          setTestimonials(data.docs)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className={classes.testimonialsContainer}>Loading testimonials...</div>
  }

  if (testimonials.length === 0) {
    return null
  }

  return (
    <div className={classes.testimonialsContainer}>
      <h2 className={classes.testimonialsTitle}>What people are saying</h2>
      <p className={classes.testimonialsSubtitle}>
        Chesscademy has inspired tens of thousands of people around the world to learn chess.
      </p>

      <div className={classes.testimonialsGrid}>
        {testimonials.map((t) => (
          <div key={t.id} className={classes.testimonialCard}>
            <div className={classes.testimonialBubble}>
              <p>{t.testimonial}</p>
            </div>
            <div className={classes.testimonialAuthor}>
              {t.photo?.url ? (
                <img alt={t.firstName} className={classes.testimonialAvatar} src={t.photo.url} />
              ) : (
                <div className={classes.testimonialAvatarPlaceholder}>{t.firstName.charAt(0)}</div>
              )}
              <div className={classes.testimonialAuthorName}>{t.firstName}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
