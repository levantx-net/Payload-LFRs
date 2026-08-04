'use client'

import React, { useState } from 'react'
import { LfrsRating } from './LfrsRating.js'

import classes from './styles/lfrs.module.css'

export type LfrsTestimonialFormProps = {
  uniqueCode: string
  ratingMax?: number
  ratingStep?: number
  /**
   * Slug of the upload-enabled media collection configured in reviewMedia (e.g. 'media').
   * If omitted, photo upload UI is hidden and no photo payload is sent.
   */
  mediaCollectionSlug?: string
  className?: string
  style?: React.CSSProperties
  containerClassName?: string
  containerStyle?: React.CSSProperties
  formClassName?: string
  formStyle?: React.CSSProperties
  inputClassName?: string
  inputStyle?: React.CSSProperties
  textareaClassName?: string
  textareaStyle?: React.CSSProperties
  submitButtonClassName?: string
  submitButtonStyle?: React.CSSProperties
  errorClassName?: string
  errorStyle?: React.CSSProperties
  successClassName?: string
  successStyle?: React.CSSProperties
}

export const LfrsTestimonialForm: React.FC<LfrsTestimonialFormProps> = ({
  uniqueCode,
  ratingMax = 5,
  ratingStep = 1,
  mediaCollectionSlug,
  className,
  style,
  containerClassName,
  containerStyle,
  formClassName,
  formStyle,
  inputClassName,
  inputStyle,
  textareaClassName,
  textareaStyle,
  submitButtonClassName,
  submitButtonStyle,
  errorClassName,
  errorStyle,
  successClassName,
  successStyle,
}) => {
  const [firstName, setFirstName] = useState('')
  const [rating, setRating] = useState(0)
  const [testimonial, setTestimonial] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!uniqueCode) {
      setError('Invalid or missing invitation code. Please use the link provided in your email.')
      return
    }

    if (!firstName || !rating || !testimonial) {
      setError('Please fill in all required fields.')
      return
    }

    setLoading(true)

    try {
      let photoId: string | number | undefined

      // Upload file to configured media collection if a file is attached and media collection slug is provided
      if (selectedFile && mediaCollectionSlug) {
        const formData = new FormData()
        formData.append('file', selectedFile)

        const uploadRes = await fetch(`/api/${mediaCollectionSlug}`, {
          method: 'POST',
          body: formData,
        })

        const uploadData = await uploadRes.json()

        if (!uploadRes.ok) {
          throw new Error(uploadData.errors?.[0]?.message || uploadData.error || 'Failed to upload photo')
        }

        photoId = uploadData.doc?.id || uploadData.id
      }

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
          photo: photoId ? photoId : undefined,
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
      <div
        className={[classes.testimonialFormSuccess, successClassName].filter(Boolean).join(' ')}
        style={successStyle}
      >
        <h3>Thank you!</h3>
        <p>Your testimonial has been successfully submitted.</p>
      </div>
    )
  }

  const containerClasses = [classes.testimonialFormContainer, containerClassName, className]
    .filter(Boolean)
    .join(' ')

  const formClasses = [classes.testimonialForm, formClassName].filter(Boolean).join(' ')
  const errorClasses = [classes.testimonialFormError, errorClassName].filter(Boolean).join(' ')
  const inputClasses = [classes.formInput, inputClassName].filter(Boolean).join(' ')
  const textareaClasses = [classes.formTextarea, textareaClassName].filter(Boolean).join(' ')
  const buttonClasses = [classes.submitButton, submitButtonClassName].filter(Boolean).join(' ')

  return (
    <div className={containerClasses} style={{ ...containerStyle, ...style }}>
      <h3>Leave a Testimonial</h3>
      {error && (
        <div className={errorClasses} style={errorStyle}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className={formClasses} style={formStyle}>
        <div className={classes.formGroup}>
          <label htmlFor="firstName">First Name *</label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className={inputClasses}
            style={inputStyle}
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
            className={textareaClasses}
            style={textareaStyle}
          />
        </div>

        {mediaCollectionSlug && (
          <div className={classes.formGroup}>
            <label htmlFor="photo">Photo (Optional)</label>
            <input
              id="photo"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                setSelectedFile(file)
              }}
              className={inputClasses}
              style={inputStyle}
            />
          </div>
        )}

        <button type="submit" disabled={loading} className={buttonClasses} style={submitButtonStyle}>
          {loading ? 'Submitting...' : 'Submit Testimonial'}
        </button>
      </form>
    </div>
  )
}
