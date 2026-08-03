# Testimonials Feature

The Testimonials feature allows administrators to easily collect, manage, and display user testimonials. It operates on an invite-only model, ensuring that only users who have been explicitly asked can submit a testimonial.

## Workflow

1. **Invitation**: An administrator creates a new Testimonial record from the Payload Admin panel by providing an `invitedEmail`.
2. **Email Delivery**: The plugin's hooks automatically generate a secure `uniqueCode` and send an email invitation to the user with a customized link.
3. **Submission**: The user clicks the link, bringing them to your frontend application. They fill out a form (using the provided `LfrsTestimonialForm` component) with their First Name, Rating, and Testimonial text.
4. **Acceptance**: The API validates the unique code and updates the existing testimonial document in the CMS, setting `testimonialAcceptedDate`.
5. **Moderation & Curation**: Testimonials default to `pending` status. Administrators can change their status to `accepted` or `rejected`, and optionally mark them as `featured`. Only `accepted` testimonials are served via the REST API endpoint.
6. **Display**: The frontend can display featured testimonials using the `LfrsTestimonials` UI component.

## Configuration

To ensure the invitation email links point to the correct URL on your frontend, you should configure the `testimonialFormUrl` in your `payloadLFRs` plugin options.

```typescript
import { buildConfig } from 'payload'
import { payloadLFRs } from 'payload-lfrs'

export default buildConfig({
  // ...
  plugins: [
    payloadLFRs({
      // ... other config
      testimonialFormUrl: 'https://your-frontend.com/add-testimonial', // The base URL where your LfrsTestimonialForm is hosted
    }),
  ],
})
```

When an invite is sent, the plugin will append `?code=UNIQUE_CODE` to this URL.

## Frontend Components

### `LfrsTestimonialForm`

This component renders the form where the invited user enters their details. It requires the `uniqueCode` to authenticate the submission.

```tsx
import { LfrsTestimonialForm } from 'payload-lfrs/client'
import { useSearchParams } from 'next/navigation' // or your router's equivalent

export default function AddTestimonialPage() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')

  if (!code) {
    return <div>Invalid Invitation Code</div>
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
      <h1>We value your feedback!</h1>
      <LfrsTestimonialForm uniqueCode={code} ratingMax={5} ratingStep={1} />
    </div>
  )
}
```

### `LfrsTestimonials`

Displays up to 3 featured testimonials in an elegant, responsive layout. It automatically handles fetching the data.

```tsx
import { LfrsTestimonials } from 'payload-lfrs/client'

export function Homepage() {
  return (
    <div>
      {/* ... your homepage content ... */}
      <LfrsTestimonials />
    </div>
  )
}
```

## API Endpoints

If you prefer to build your own custom UIs, you can use the headless REST endpoints:

- `GET /api/lfrs/testimonials`
  - **Query parameters:** `featured=true` (optional)
  - **Returns:** `{ docs: Array, page, totalDocs, ... }`
- `POST /api/lfrs/testimonials/submit`
  - **Body:** `{ uniqueCode: string, firstName: string, rating: number, testimonial: string }`
  - **Returns:** `{ success: true, testimonial: object }`
