import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import path from 'path'
import { buildConfig } from 'payload'
import { payloadLfRs } from 'payload-lfrs'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { testEmailAdapter } from './helpers/testEmailAdapter.js'
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
        fields: [
          {
            name: 'roles',
            type: 'select',
            defaultValue: ['subscriber'],
            hasMany: true,
            options: ['admin', 'subscriber', 'employee'],
          },
        ],
      },
      {
        slug: 'posts',
        fields: [
          {
            name: 'title',
            type: 'text',
          },
        ],
      },
      {
        slug: 'products',
        fields: [
          {
            name: 'name',
            type: 'text',
          },
        ],
      },
      {
        slug: 'internal-docs',
        fields: [
          {
            name: 'title',
            type: 'text',
          },
        ],
      },
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
      payloadLfRs({
        collections: {
          'internal-docs': {
            favourites: false,
            likes: ['employee', 'admin'],
          },
          posts: {
            dislikes: true, // test mutual exclusivity
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
            replies: false, // disabled
            reviews: ['admin', 'subscriber'], // role based access
          },
        },
        reviewMedia: {
          maxFiles: 3,
          uploadCollection: 'media',
        },
        reviewModeration: true,
        usersCollectionSlug: 'users',
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
