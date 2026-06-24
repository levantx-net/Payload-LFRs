import configPromise from '@payload-config'
import { headers } from 'next/headers'
import Link from 'next/link'
import { getPayload } from 'payload'

import { LfrsFavourite } from '../components/LfrsWithRedirects'

export default async function FavsPage() {
  const payload = await getPayload({ config: configPromise })

  const { user } = await payload.auth({ headers: await headers() })

  let postIds: string[] = []

  if (user) {
    const serverURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
    const res = await fetch(`${serverURL}/api/lfrs/user-favourites?collection=posts&userId=${user.id}`, {
      headers: await headers(),
    })
    
    if (res.ok) {
      const data = await res.json()
      postIds = data.ids
    }
  }

  let posts: any[] = []
  if (postIds.length > 0) {
    const postsRes = await payload.find({
      collection: 'posts',
      limit: 100,
      where: {
        id: { in: postIds },
      },
    })
    posts = postsRes.docs
  }

  return (
    <div>
      <h1 className="page-title">{user ? 'My Favs' : 'All Favourited Posts'}</h1>
      <div className="grid">
        {posts.map((post) => (
          <div className="card" key={post.id}>
            <div
              className="card-header"
              style={{ alignItems: 'center', display: 'flex', gap: '1rem' }}
            >
              <div className="card-fav-wrapper">
                <LfrsFavourite
                  initialFavourited={true}
                  targetCollection="posts"
                  targetDoc={post.id as string}
                />
              </div>
              <Link href={`/posts/${post.id}`}>
                <h2 className="card-title">{post.title}</h2>
              </Link>
            </div>
            <p className="text-muted" style={{ marginTop: '0.5rem' }}>
              This is a short description for post: {post.title}
            </p>
            <Link
              className="nav-link"
              href={`/posts/${post.id}`}
              style={{ display: 'inline-block', marginTop: 'auto', paddingTop: '1rem' }}
            >
              Read more &rarr;
            </Link>
          </div>
        ))}
        {posts.length === 0 && <p className="text-muted">No favourite posts found.</p>}
      </div>
    </div>
  )
}
