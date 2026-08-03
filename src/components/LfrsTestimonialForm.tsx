'use client'

import React, { useState } from 'react'
import { LfrsRating } from './LfrsRating.js'

import classes from './styles/lfrs.module.css'

export type LfrsTestimonialFormProps = {
  uniqueCode: string
  ratingMax?: number
  ratingStep?: number
}

export const LfrsTestimonialForm: React.FC<LfrsTestimonialFormProps> = ({
  uniqueCode,
  ratingMax = 5,
  ratingStep = 1,
}) => {
  const [firstName, setFirstName] = useState('')
  const [rating, setRating] = useState(0)
  const [testimonial, setTestimonial] = useState('')
  const [photo, setPhoto] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!firstName || !rating || !testimonial) {
      setError('Please fill in all required fields.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/lfrs/testimonials/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uniqueCode,
          firstName,
          rating,
          testimonial,
          photo: photo ? photo : undefined, // If string ID, otherwise might need upload implementation
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit testimonial')
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className={classes.testimonialFormSuccess}>
        <h3>Thank you!</h3>
        <p>Your testimonial has been successfully submitted.</p>
      </div>
    )
  }

  return (
    <div className={classes.testimonialFormContainer}>
      <h3>Leave a Testimonial</h3>
      {error && <div className={classes.testimonialFormError}>{error}</div>}
      <form onSubmit={handleSubmit} className={classes.testimonialForm}>
        <div className={classes.formGroup}>
          <label htmlFor="firstName">First Name *</label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className={classes.formInput}
          />
        </div>

        <div className={classes.formGroup}>
          <label>Rating *</label>
          <LfrsRating
            max={ratingMax}
            step={ratingStep}
            value={rating}
            onChange={(val) => setRating(val)}
          />
        </div>

        <div className={classes.formGroup}>
          <label htmlFor="testimonial">Testimonial *</label>
          <textarea
            id="testimonial"
            value={testimonial}
            onChange={(e) => setTestimonial(e.target.value)}
            required
            rows={4}
            className={classes.formTextarea}
          />
        </div>

        <button type="submit" disabled={loading} className={classes.submitButton}>
          {loading ? 'Submitting...' : 'Submit Testimonial'}
        </button>
      </form>
    </div>
  )
}
