import type { Payload } from 'payload'

import config from '@payload-config'
import { createPayloadRequest, getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import { sanitizePluginConfig } from '../src/defaults.js'
import { createDislikeEndpoint } from '../src/endpoints/dislike.js'
import { createDistributionEndpoint } from '../src/endpoints/distribution.js'
import { createFavouriteEndpoint } from '../src/endpoints/favourite.js'
import { createInteractionsEndpoint } from '../src/endpoints/interactions.js'
import { createLikeEndpoint } from '../src/endpoints/like.js'
import { createRateEndpoint } from '../src/endpoints/rate.js'
import { createReplyEndpoint, deleteReplyEndpoint } from '../src/endpoints/reply.js'
import { createReviewEndpoint } from '../src/endpoints/review.js'
import { createStatusEndpoint } from '../src/endpoints/status.js'
import { payloadLfRs } from '../src/index.js'

let payload: Payload
let adminUser: any
let subUser: any
let empUser: any
let testPost: any
let testProduct: any
let testDoc: any

// Utility to create a mocked PayloadRequest with body and user
async function makeRequest(
  handler: any,
  method: string,
  body: any,
  user: any,
  query?: Record<string, string>,
) {
  const url = new URL('http://localhost:3000/api/endpoint')
  if (query) {
    Object.keys(query).forEach((key) => url.searchParams.append(key, query[key]))
  }

  const req = new Request(url.toString(), {
    body: ['DELETE', 'PATCH', 'POST', 'PUT'].includes(method) ? JSON.stringify(body) : undefined,
    headers: { 'Content-Type': 'application/json' },
    method,
  })

  const payloadRequest = await createPayloadRequest({ config, request: req })
  payloadRequest.user = user

  // payloadRequest.json() mock for Payload < 3.0, but in Payload 3.x req.json() works on the Request.
  // Actually createPayloadRequest wraps it.

  const response = await handler(payloadRequest)
  let data
  try {
    data = await response.json()
  } catch (e) {
    data = null
  }
  if (response.status === 500) {
    console.log(`500 Error:`, data)
  }
  return { data, status: response.status }
}

const sanitizedConfig = sanitizePluginConfig({
  collections: {
    'internal-docs': {
      favourites: false,
      likes: ['employee', 'admin'],
    },
    posts: {
      dislikes: true,
      favourites: true,
      likes: true,
      ratings: true,
      replies: true,
      reviews: true,
    },
    products: {
      likes: true,
      ratings: ({ req }: any) => {
        // Only allow rating if user is authenticated (custom fn test)
        return !!req.user
      },
      replies: false,
      reviews: ['admin', 'subscriber'],
    },
  },
  reviewMedia: { maxFiles: 3, uploadCollection: 'media' },
  reviewModeration: true,
  usersCollectionSlug: 'users',
})

afterAll(async () => {
  await payload.destroy()
})

beforeAll(async () => {
  payload = await getPayload({ config })

  // Seed Users
  adminUser = await payload.create({
    collection: 'users',
    data: { email: 'admin@test.com', password: 'test', roles: ['admin'] },
  })
  subUser = await payload.create({
    collection: 'users',
    data: { email: 'sub@test.com', password: 'test', roles: ['subscriber'] },
  })
  empUser = await payload.create({
    collection: 'users',
    data: { email: 'emp@test.com', password: 'test', roles: ['employee'] },
  })

  // Seed Targets
  testPost = await payload.create({ collection: 'posts', data: { title: 'Test Post' } })
  testProduct = await payload.create({ collection: 'products', data: { name: 'Test Product' } })
  testDoc = await payload.create({ collection: 'internal-docs', data: { title: 'Internal Doc' } })
})

describe('Likes, Dislikes & Mutual Exclusivity', () => {
  test('User can like a post and it updates aggregates', async () => {
    const handler = createLikeEndpoint(sanitizedConfig)
    const { data, status } = await makeRequest(
      handler,
      'POST',
      { id: testPost.id, collection: 'posts' },
      adminUser,
    )

    expect(status).toBe(200)
    expect(data.liked).toBe(true)
    expect(data.likesCount).toBe(1)

    // Uniqueness
    const { data: d2, status: st2 } = await makeRequest(
      handler,
      'POST',
      { id: testPost.id, collection: 'posts' },
      adminUser,
    )
    expect(st2).toBe(200)
    expect(d2.liked).toBe(false)
    expect(d2.likesCount).toBe(0)
  })

  test('Mutual exclusivity between likes and dislikes', async () => {
    const likeHandler = createLikeEndpoint(sanitizedConfig)
    const dislikeHandler = createDislikeEndpoint(sanitizedConfig)

    // Like it
    await makeRequest(likeHandler, 'POST', { id: testPost.id, collection: 'posts' }, adminUser)
    // Dislike it
    const { data, status } = await makeRequest(
      dislikeHandler,
      'POST',
      { id: testPost.id, collection: 'posts' },
      adminUser,
    )

    expect(status).toBe(200)
    expect(data.disliked).toBe(true)
    expect(data.dislikesCount).toBe(1)
    expect(data.likesCount).toBe(0) // Like removed

    // Status check
    const statusHandler = createStatusEndpoint(sanitizedConfig)
    const { data: stData } = await makeRequest(statusHandler, 'GET', {}, adminUser, {
      id: testPost.id,
      collection: 'posts',
    })
    expect(stData.liked).toBe(false)
    expect(stData.disliked).toBe(true)
  })
})

describe('Ratings & Aggregates', () => {
  test('Rate a post and recalculate average', async () => {
    const handler = createRateEndpoint(sanitizedConfig)
    const { data, status } = await makeRequest(
      handler,
      'POST',
      { id: testPost.id, collection: 'posts', score: 4 },
      adminUser,
    )

    expect(status).toBe(200)
    expect(data.ratingsCount).toBe(1)
    expect(data.ratingsAverage).toBe(4)

    // Update score
    const { data: d2 } = await makeRequest(
      handler,
      'POST',
      { id: testPost.id, collection: 'posts', score: 2 },
      adminUser,
    )
    expect(d2.ratingsCount).toBe(1)
    expect(d2.ratingsAverage).toBe(2)
  })

  test('Invalid score validation', async () => {
    const handler = createRateEndpoint(sanitizedConfig)
    const { data, status } = await makeRequest(
      handler,
      'POST',
      { id: testPost.id, collection: 'posts', score: 6 },
      adminUser,
    ) // Max is 5
    expect(status).toBe(400)
  })
})

describe('Reviews, Replies & Moderation', () => {
  let reviewId: string

  test('Create review with pending status', async () => {
    const handler = createReviewEndpoint(sanitizedConfig)
    const { data, status } = await makeRequest(
      handler,
      'POST',
      {
        id: testPost.id,
        body: 'Awesome post',
        collection: 'posts',
        score: 5,
        title: 'Great',
      },
      adminUser,
    )

    expect(status).toBe(200)
    expect(data.review.status).toBe('pending')
    reviewId = data.review.id

    // Since it's pending, reviewsCount shouldn't include it
    expect(data.reviewsCount).toBe(0)

    // Approve it
    await payload.update({
      id: reviewId,
      collection: sanitizedConfig.collectionSlugs.reviews,
      data: { status: 'approved' },
    })

    const post = await payload.findByID({ id: testPost.id, collection: 'posts' })
    expect(post.lfrs?.reviewsCount).toBe(1)
  })

  test('Reply to review', async () => {
    const handler = createReplyEndpoint(sanitizedConfig)
    const { data, status } = await makeRequest(
      handler,
      'POST',
      { body: 'Thanks!', reviewId },
      adminUser,
    )

    expect(status).toBe(200)
    expect(data.reply.body).toBe('Thanks!')
    expect(data.repliesCount).toBe(1)

    const delHandler = deleteReplyEndpoint(sanitizedConfig)
    const { data: d2, status: st2 } = await makeRequest(
      delHandler,
      'DELETE',
      { replyId: data.reply.id },
      adminUser,
    )
    expect(st2).toBe(200)
    expect(d2.repliesCount).toBe(0)
  })
})

describe('Access Control', () => {
  test('Role-based access: internal-docs likes allowed for employee, denied for subscriber', async () => {
    const handler = createLikeEndpoint(sanitizedConfig)

    // Employee
    const { status: s1 } = await makeRequest(
      handler,
      'POST',
      { id: testDoc.id, collection: 'internal-docs' },
      empUser,
    )
    expect(s1).toBe(200)

    // Subscriber
    const { status: s2 } = await makeRequest(
      handler,
      'POST',
      { id: testDoc.id, collection: 'internal-docs' },
      subUser,
    )
    expect(s2).toBe(403)
  })

  test('Custom function access: products ratings allowed if authenticated', async () => {
    const handler = createRateEndpoint(sanitizedConfig)

    // Auth user
    const { status: s1 } = await makeRequest(
      handler,
      'POST',
      { id: testProduct.id, collection: 'products', score: 3 },
      subUser,
    )
    expect(s1).toBe(200)

    // Unauth user
    const { status: s2 } = await makeRequest(
      handler,
      'POST',
      { id: testProduct.id, collection: 'products', score: 3 },
      null,
    )
    expect(s2).toBe(403)
  })

  test('Feature disabled: internal-docs favourites returns 404', async () => {
    const handler = createFavouriteEndpoint(sanitizedConfig)
    const { status } = await makeRequest(
      handler,
      'POST',
      { id: testDoc.id, collection: 'internal-docs' },
      adminUser,
    )
    expect(status).toBe(404)
  })
})

describe('Distribution Endpoint', () => {
  test('Get accurate rating distribution', async () => {
    const handler = createDistributionEndpoint(sanitizedConfig)
    const { data, status } = await makeRequest(handler, 'GET', {}, null, {
      id: testPost.id,
      collection: 'posts',
    })

    expect(status).toBe(200)
    expect(data.distribution).toBeDefined()
    expect(data.totalRatings).toBeGreaterThan(0)
  })
})

describe('Interactions Endpoint', () => {
  test('Get paginated reviews', async () => {
    const handler = createInteractionsEndpoint(sanitizedConfig)
    const { data, status } = await makeRequest(handler, 'GET', {}, null, {
      id: testPost.id,
      type: 'reviews',
      collection: 'posts',
    })

    expect(status).toBe(200)
    expect(data.docs).toBeInstanceOf(Array)
    expect(data.totalDocs).toBeGreaterThan(0)
  })
})

describe('Cascade Delete Hook', () => {
  test('Deleting a target document removes all interactions', async () => {
    await payload.delete({ id: testPost.id, collection: 'posts' })

    // Verify likes are deleted
    const { totalDocs } = await payload.find({
      collection: sanitizedConfig.collectionSlugs.likes,
      where: { targetDoc: { equals: testPost.id } },
    })

    expect(totalDocs).toBe(0)
  })
})
