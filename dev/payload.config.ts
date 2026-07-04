import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import path from 'path'
import { buildConfig } from 'payload'
import { payloadLFRs } from 'payload-lfrs'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { testEmailAdapter } from './helpers/testEmailAdapter.js'
import { Posts } from './collections/Posts.js'
import { seed } from './seed.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

if (!process.env.ROOT_DIR) {
  process.env.ROOT_DIR = dirname
}

const buildConfigWithMemoryDB = async () => {
  if (process.env.NODE_ENV === 'test') {
    const memoryDB = await MongoMemoryReplSet.create({
      replSet: {
        count: 3,
        dbName: 'payloadmemory',
      },
    })
    process.env.DATABASE_URL = `${memoryDB.getUri()}&retryWrites=true`
  }
  return buildConfig({
    admin: {
      importMap: {
        baseDir: path.resolve(dirname),
      },
    },
    collections: [
      {
        slug: 'users',
        auth: true,
        access: {
          create: () => true,
        },
        fields: [
          {
            name: 'roles',
            type: 'select',
            defaultValue: ['subscriber'],
            hasMany: true,
            options: ['admin', 'subscriber'],
          },
        ],
      },
      Posts,
      {
        slug: 'media',
        fields: [],
        upload: {
          staticDir: path.resolve(dirname, 'media'),
        },
      },
    ],
    db: mongooseAdapter({
      ensureIndexes: true,
      url: process.env.DATABASE_URL || '',
    }),
    editor: lexicalEditor(),
    email: testEmailAdapter,
    onInit: async (payload) => {
      await seed(payload)
    },
    plugins: [
      payloadLFRs({
        collections: {
          posts: {
            allowMultipleReviews: true, // Can leave multiple reviews
            dislikes: true, // test mutual exclusivity

            favourites: true,
            likes: true,
            ratings: true,
            replies: true, // Any logged in user can reply
            reviews: true,
            shares: true, // test sharing
          },
        },
        enableReviewReactions: true,
        reviewMedia: {
          maxFiles: 3,
          uploadCollection: 'media',
        },
        reviewModeration: true,
        usersCollectionSlug: 'users',
        isAdmin: ({ req }) => {
          if (!req.user) {
            return false
          }
          return (req.user.roles as string[])?.includes('admin')
        },
      }),
    ],
    secret: process.env.PAYLOAD_SECRET || 'test-secret_key',
    sharp,
    typescript: {
      outputFile: path.resolve(dirname, 'payload-types.ts'),
    },
  })
}

export default buildConfigWithMemoryDB()
