# Payload LFRs Plugin

A comprehensive plugin for [Payload CMS 3.x](https://payloadcms.com) that adds **Likes**, **Favourites**, **Ratings**, and **Reviews** (LFRs) capabilities to your existing collections.

## Features

- **Likes & Dislikes**: Allow users to like or dislike documents. Dislikes are mutually exclusive with likes.
- **Favourites**: Enable users to save documents to their favourites.
- **Ratings**: Add customizable rating systems (e.g., 5-star, 10-point scale, half-stars).
- **Reviews & Replies**: Let users write reviews and others to reply to them.
- **Media Uploads**: Support for attaching images or videos to reviews.
- **Fine-grained Access Control**: Configure who can interact with each feature per collection (e.g., specific roles, custom logic).
- **Automated Aggregation**: Automatically calculates and injects total likes, average ratings, and interaction states into your documents.
- **Review Moderation**: Built-in admin view to moderate pending reviews.

## Installation

```bash
npm install payload-lfrs
# or
pnpm add payload-lfrs
# or
yarn add payload-lfrs
```

## Example Project

This repository includes a fully functioning Next.js example project located in the `dev` folder. It demonstrates how to integrate the plugin into a Payload configuration and how to use the provided React components in a frontend application.

To run the example project locally:

```bash
git clone https://github.com/Talaween/Payload-LFRs.git
cd Payload-LFRs
pnpm install
pnpm dev
```

The example application will be available at `http://localhost:3000`.

## Basic Usage

Add the plugin to your Payload configuration:

```typescript
import { buildConfig } from 'payload'
import { payloadLfRs } from 'payload-lfrs'

export default buildConfig({
  // ... your existing config
  plugins: [
    payloadLfRs({
      collections: {
        // Enable LFRs features on the 'posts' collection
        posts: {
          likes: true,
          favourites: true,
          ratings: true,
          reviews: true,
        },
      },
    }),
  ],
})
```

## Configuration

The `payloadLfRs` plugin accepts a configuration object with the following properties:

### `collections` (Required)

A map of collection slugs to enable LFRs features on. For each collection, you can enable specific features and configure access control.

```typescript
collections: {
  posts: {
    likes: true, // Enable likes for any authenticated user
    dislikes: false, // Disabled
    favourites: ['admin', 'subscriber'], // Only specific roles can favourite
    ratings: true,
    reviews: true,
    readReviews: 'public', // Set who can read reviews
    allowMultipleReviews: true, // Allow users to leave multiple reviews (default: false)
    enableReviewRating: false, // Make review ratings optional for comment-style reviews (default: true)
    replies: ['admin'], // Enable replies, but only admins can respond
  }
}
```

#### Access Control

For each feature (`likes`, `dislikes`, `favourites`, `ratings`, `reviews`, `replies`), you can provide:

- `true`: Any authenticated user can use the feature (default if the feature key is omitted but the feature is mentioned, depending on implementation/type defaults).
- `false`: Feature disabled for this collection.
- `string[]`: Only users whose `roles` array includes at least one of these roles can use the feature. For example, `replies: ['admin']` restricts replying to administrators.
- `Function`: A custom async function receiving the request and target document. Return `true` to allow, `false` to deny.

```typescript
likes: async ({ req, targetCollection, targetDoc }) => {
  // Custom logic: e.g., only users who purchased this product can review it
  return true
}
```

### `rating`

Configure the rating system (default: 5-star, whole numbers).

```typescript
rating: {
  max: 5,        // Maximum rating value (default: 5)
  step: 0.5,     // Step increment, e.g., 0.5 for half-stars (default: 1)
  icon: 'star',  // Icon identifier hint for frontend (default: 'star')
}
```

### `reviewMedia`

Allow users to attach media to their reviews. **Note:** You must provide the slug of an existing upload-enabled collection.

```typescript
reviewMedia: {
  uploadCollection: 'media', // REQUIRED: an existing upload collection in your payload config
  allowedMimeTypes: ['image/jpeg', 'image/png'], // default: ['image/*']
  maxFiles: 3, // default: 5
  maxFileSize: 5 * 1024 * 1024, // 5MB limit
}
```

### `reviewModeration`

Set to `true` to require reviews to be approved before they are publicly visible (default: `false`). This also adds a dedicated Review Moderation view in the Admin panel.

```typescript
reviewModeration: true
```

### `usersCollectionSlug`

The slug of your users collection for authentication (default: `'users'`).

### `adminGroup`

The group name under which the LFRs collections will appear in the Admin UI (default: `'LFRs'`).

### `disabled`

Set to `true` to completely disable the plugin's features without uninstalling it or losing data (default: `false`).
When `disabled: true`, the plugin will continue to register its collections and fields to keep your database schema consistent (which is important for migrations), but it will *not* register any API endpoints, lifecycle hooks, or Admin UI components. This is perfect for temporarily pausing interactions while keeping historical data intact.

### `collectionSlugs`

Override the default slugs for the internal collections created by the plugin (`likes`, `dislikes`, `favourites`, `ratings`, `reviews`, `replies`).

## How It Works

1. **Collections Added**: The plugin automatically creates collections to store interactions (e.g. `lfrs_likes`, `lfrs_reviews`).
2. **Fields Injected**: It injects an `lfrs` field group into your target collections, containing aggregate data (e.g., `lfrs.likesCount`, `lfrs.averageRating`).
3. **Endpoints Created**: It registers REST endpoints under `/api/lfrs/...` to handle interactions (e.g., `/api/lfrs/like`, `/api/lfrs/rate`).
4. **Admin UI**: Adds custom components and moderation views to the Payload Admin panel.

### Interactions Status Widget

For each target collection where LFRs features are enabled, the plugin injects a custom **Interactions Status Widget** into the document's edit view sidebar. This widget displays an at-a-glance summary of all aggregated interactions for that document (such as total likes, total reviews, and average rating).

### Review Moderation View

If `reviewModeration: true` is enabled in your configuration, the plugin provides a dedicated **Review Moderation Queue** view in the Admin panel. Accessible via `/admin/lfrs-moderation`, this dashboard allows administrators to efficiently review, approve, or reject pending user reviews and replies before they are publicly displayed.

## API Endpoints

The plugin exposes several endpoints for interacting with the LFRs features from your frontend:

- `POST /api/lfrs/like`
- `POST /api/lfrs/dislike`
- `POST /api/lfrs/favourite`
- `POST /api/lfrs/rate`
- `POST /api/lfrs/review`
- `POST /api/lfrs/reply`
- `DELETE /api/lfrs/reply`
- `GET /api/lfrs/status` - Get the current user's interaction status for a document.
- `GET /api/lfrs/interactions` - Get paginated lists of interactions.
- `GET /api/lfrs/distribution` - Get the rating distribution for a document.
- `GET /api/lfrs/user-favourites` - Get an array of document IDs favourited by the user for a collection.
- `GET /api/lfrs/likes-count` - Get the count of likes for a specific document.
- `GET /api/lfrs/dislikes-count` - Get the count of dislikes for a specific document.
- `GET /api/lfrs/user-reviews` - Get all reviews submitted by a specific user for a document.

_Authentication is required for `POST` and `DELETE` endpoints._

## Frontend UI Components

The plugin provides a suite of ready-to-use React components for your frontend application. These components are exported via `payload-lfrs/client` and are built as client components (`"use client"`) to handle user interactions and optimistic UI updates seamlessly.

### Available Components

- **`LfrsLikeDislike`**: A toggleable thumbs-up/thumbs-down widget displaying current counts.
- **`LfrsFavourite`**: A bookmark/favorite button for saving documents.
- **`LfrsRating`**: An interactive star rating component for users to submit a score.
- **`LfrsRatingSummary`**: A visual summary showing the average rating and score distribution.
- **`LfrsComposeReview` / `LfrsComposeReply`**: Forms for submitting text reviews and nested replies.
- **`LfrsReviewCard` / `LfrsReplyCard`**: Display components for rendering individual reviews and replies.
- **`LfrsReviewsSection`**: A complete, integrated reviews area combining the summary, compose form, and a list of reviews.

### Example Usage

```tsx
import { LfrsLikeDislike, LfrsRating } from 'payload-lfrs/client'

export function PostDetails({ post }) {
  return (
    <div>
      <h1>{post.title}</h1>

      {/* Like / Dislike Toggle */}
      <LfrsLikeDislike
        targetCollection="posts"
        targetDoc={post.id}
        initialLikesCount={post.lfrs?.likesCount || 0}
        initialLiked={false} // Optionally pass initial state from server
      />

      {/* 5-Star Rating */}
      <LfrsRating targetCollection="posts" targetDoc={post.id} maxRating={5} />
    </div>
  )
}
```

## Building Custom UIs (Headless Usage)

The plugin is designed to be completely framework-agnostic. While we provide React components for convenience, you can build your own custom user interfaces in any framework (Vue, Svelte, Angular, React Native, or vanilla JavaScript) by directly interacting with the plugin's REST API.

### Custom Component Example

Here is an example of how you might build a custom "Like" interaction in vanilla JavaScript:

```javascript
async function toggleLike(targetCollection, targetDocId) {
  try {
    const response = await fetch('/api/lfrs/like', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer YOUR_TOKEN' // If required
      },
      body: JSON.stringify({
        collection: targetCollection,
        id: targetDocId,
      }),
    })

    if (!response.ok) throw new Error('Failed to toggle like')

    const data = await response.json()

    // Update your custom UI state here...
  } catch (error) {
    console.error(error)
  }
}
```

You can similarly use the `GET /api/lfrs/status` endpoint to fetch the current user's interaction state when a page loads, and map other interactions (Favorites, Ratings, Reviews) to their respective endpoints.

## Architecture & Developer Guide

If you are reviewing, contributing to, or debugging the plugin, here's an overview of the codebase structure and internal architecture.

### Code Organization

- `src/plugin.ts`: The main entry point. It accepts user configuration, sanitizes it (applying defaults), and injects the collections, fields, and endpoints into the Payload config.
- `src/collections/`: Contains the definitions for the plugin-managed collections (`likes`, `dislikes`, `favourites`, `ratings`, `reviews`, `replies`). These store the actual user interactions.
- `src/fields/`:
  - `aggregateFields.ts`: Generates the `lfrs` field group (e.g., `lfrs.likesCount`, `lfrs.averageRating`) that gets injected into target collections.
  - `joinFields.ts`: Injects Payload Join fields so administrators can see related LFRs documents directly from the target document's admin UI.
- `src/endpoints/`: The REST API implementations. These handle incoming user requests, enforce access control, and perform the database operations.
- `src/hooks/`: Contains Payload lifecycle hooks. E.g., `cascadeDelete.ts` ensures that when a target document is deleted, all associated interactions are also removed to prevent orphaned records.
- `src/admin/`: React components for Payload's Admin panel. Includes status widgets and the Review Moderation view.
- `src/types.ts`: TypeScript interfaces and types for configuration, internal sanitized config, and feature access.

### Aggregate Count Logic (Endpoint-Driven)

To ensure high reliability and avoid transaction context poisoning within Payload CMS, the aggregation logic (e.g., updating a post's `likesCount` or `dislikesCount`) is primarily **Endpoint-Driven**:

1. **Endpoints Suppress Hooks**: When a user interacts via the API endpoints (e.g., `/api/lfrs/like`), the endpoints perform the necessary database mutations (`create`, `delete`) while passing `context: { skipLfrsHooks: true }`. This suppresses the automatic hook-based recalculation.
2. **Explicit Updates**: After all mutations complete successfully, the endpoint explicitly counts the interactions directly from the database (serving as the source of truth) and performs a single atomic update to the target document's aggregate fields.
3. **Admin Panel Fallback**: The `afterChange` and `afterDelete` hooks in `src/hooks/recalculateAggregates.ts` are still kept as fallbacks. They will automatically recalculate the counts if an administrator creates or deletes an interaction manually from the Payload Admin UI, maintaining data consistency.

## License

MIT
