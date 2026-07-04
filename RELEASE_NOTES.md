# Release Notes - v1.3.0

This release introduces significant performance optimizations, highly requested features, and validation fixes that align developer configurations with admin panel settings.

## 🚀 Key Features

### 1. Customizable Admin Role Check (`isAdmin` Callback)
- **Problem**: Previously, the plugin statically checked if users had the role `'admin'`. This was not customizable and failed for applications using different admin roles.
- **Solution**: Replaced the static check with a customizable `isAdmin` callback function defined in the plugin configuration.
- **Details**:
  - Developers can pass `isAdmin: ({ req }) => boolean | Promise<boolean>` in their plugin configuration options.
  - The default callback checks if `req.user.roles` contains `'admin'`.
  - All access controls (`isOwnerOrAdmin`) and REST API endpoints now utilize this callback dynamically.

### 2. Client-Side API Caching & Request Deduplication
- **Problem**: When a page renders components like `LfrsLikeDislike`, `LfrsFavourite`, and `LfrsReviewsSection` simultaneously, they all fire independent queries to `/api/lfrs/status`, causing excessive network traffic and database queries.
- **Solution**: Implemented a lightweight client-side cache utility (`statusCache.ts`) that deduplicates identical, concurrent requests into a single in-flight Promise and caches the result for 5 seconds.
- **Details**:
  - Automatically deduplicates multiple mounted widgets on a single page.
  - Automatically invalidates cache values after mutation events (toggle like, favourite, reply, review, delete reviews/replies).

### 3. Standalone Interactive `LfrsRating` Component
- **Problem**: The `LfrsRating` component was previously a presentation-only component. Developers had no lightweight way to let users submit rating-only scores without rendering the full review composition UI.
- **Solution**: Added support for interactive submit mode when `targetCollection` and `targetDoc` are passed as props.
- **Details**:
  - Fetches the user's existing rating on mount via the client status cache.
  - Optimistically updates UI on click and makes a POST request to `/api/lfrs/review` containing the score.
  - Displays clear saving/saved/error state feedback to the user.
  - Dispatches `lfrs-review-added` window event to refresh components like `LfrsRatingSummary` instantly.

### 4. Grouped & Conditional Admin Settings
- **Problem**: Settings like "Allow Multiple Reviews" and "Enable Replies" were visible even when reviews were turned off. They also appeared out of order.
- **Solution**: Reorganized settings in the LFRs Admin panel.
- **Details**:
  - Nested "Allow Multiple Reviews" and "Enable Replies" under the "Enable Reviews" toggle.
  - Used Payload's conditional visibility (`admin.condition`) so these dependent toggles are only visible when reviews are checked.

### 5. Document Sharing to Social Media
- **Problem**: Users had no native way to share documents to popular social networks or track how many times a document has been shared.
- **Solution**: Added a complete document sharing system containing both REST API endpoints and client-side UI buttons.
- **Details**:
  - Includes a pre-built `LfrsShare` client component with native support for Facebook, Twitter/X, WhatsApp, Telegram, LinkedIn, and Clipboard Copy (Web Share API).
  - Tracks and stores events via the `/api/lfrs/share` POST endpoint.
  - Automatically aggregates share events and updates the target document's `sharesCount` counter (part of the `lfrs` field group).

---

## 🛠️ Bug Fixes & Improvements

### Respecting Runtime Admin panel overrides
- **Problem**: If an administrator disabled ratings or reviews at runtime from the admin panel, users attempting to submit reviews/ratings would encounter a validation error (`"A rating score is required."` or similar) because the `beforeChange` hook in `reviews.ts` only checked the static plugin configuration instead of the merged admin overrides.
- **Solution**:
  - Relocated validation logic from the static `beforeChange` collection hook to the endpoint controller where fully merged settings (developer config + admin overrides) are resolved via `getEnabledFeatures()`.
  - The `beforeChange` hook now only performs format validation on present values and does not throw false validation errors.
  - Relaxed the upfront body validation check in `/api/lfrs/review` to prevent failing rating-only requests when reviews are disabled.

### Dependent Feature Cascade (Reviews & Replies)
- **Problem**: A user could toggle replies on in settings while reviews were turned off, causing errors and broken UI.
- **Solution**:
  - Enforced a dependency check on the backend inside `getEnabledFeatures()`. If `reviews` are disabled (by developer or admin), `replies` are automatically removed from the active feature list.
  - Checked read-only endpoints (`likesCount`, `dislikesCount`, `likesUsers`, `dislikesUsers`, `distribution`) and restricted access if the corresponding feature is disabled.

### Stale State Fix in `LfrsRatingSummary`
- **Problem**: The ratings distribution summary component didn't show updated counts after rating actions because its internal fetch function retained previously caught error states (e.g. `'Disabled'`).
- **Solution**: Added logic to explicitly clear previous error and loading flags at the start of each fetch and on successful response.

---

## 📖 Configuration & Integration Example

Here is how you can configure the new features in your `payload.config.ts`:

```typescript
import { lfrsPlugin } from 'payload-lfrs'

export default buildConfig({
  plugins: [
    lfrsPlugin({
      // 1. Pass custom admin checking callback
      isAdmin: ({ req }) => {
        return req.user?.roles?.includes('superuser') || req.user?.roles?.includes('admin')
      },
      collections: {
        posts: {
          likes: true,
          dislikes: true,
          favourites: true,
          ratings: true,
          reviews: {
            allowMultiple: false,
          },
          replies: true,
        }
      }
    })
  ]
})
```

To let users submit rating-only scores directly in Next.js:

```tsx
import { LfrsRating, LfrsRatingSummary } from 'payload-lfrs/client'

export default function Page({ params }) {
  return (
    <div>
      <h3>Rate this Post</h3>
      {/* Renders interactive stars and auto-saves to API */}
      <LfrsRating targetCollection="posts" targetDoc={params.id} />
      
      {/* Shows current star distribution breakdown */}
      <LfrsRatingSummary targetCollection="posts" targetDoc={params.id} />
    </div>
  )
}
```
