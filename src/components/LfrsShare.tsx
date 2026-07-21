'use client'

import React, { useEffect, useState } from 'react'

import styles from './styles/lfrs.module.css'

// ── Platform definitions ────────────────────────────────────────────────────────

const platforms = [
  {
    id: 'facebook',
    label: 'Facebook',
    color: '#1877f2',
    buildUrl: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    id: 'twitter',
    label: 'Twitter',
    color: '#000000',
    buildUrl: (url: string, title?: string) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}${title ? `&text=${encodeURIComponent(title)}` : ''}`,
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    color: '#25d366',
    buildUrl: (url: string, title?: string) =>
      `https://wa.me/?text=${encodeURIComponent(title ? `${title} ${url}` : url)}`,
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
  {
    id: 'telegram',
    label: 'Telegram',
    color: '#0088cc',
    buildUrl: (url: string, title?: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}${title ? `&text=${encodeURIComponent(title)}` : ''}`,
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    color: '#0a66c2',
    buildUrl: (url: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    Icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
] as const

type PlatformId = (typeof platforms)[number]['id']

// ── Copy icon ───────────────────────────────────────────────────────────────────

const CopyIcon = ({ copied }: { copied: boolean }) => (
  copied
    ? (
      <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
    : (
      <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <rect height="13" rx="2" ry="2" width="13" x="9" y="9" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    )
)

const ShareIcon = () => (
  <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
    <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
  </svg>
)

// ── Props ───────────────────────────────────────────────────────────────────────

export interface LfrsShareProps {
  /** The base path of the REST API (defaults to '/api') */
  apiBase?: string
  /** Optional CSS class name for the share trigger button (or container wrapper) */
  className?: string
  /** Optional CSS class name for the share trigger button */
  buttonClassName?: string
  /** Optional inline styles for the share trigger button */
  buttonStyle?: React.CSSProperties
  /** Optional CSS class name for the outer container wrapper */
  containerClassName?: string
  /** Optional inline styles for the outer container wrapper */
  containerStyle?: React.CSSProperties
  /** Optional CSS class name for the copy link button */
  copyButtonClassName?: string
  /** Optional inline styles for the copy link button */
  copyButtonStyle?: React.CSSProperties
  /** Optional CSS class name for the copy link row container */
  copyRowClassName?: string
  /** Optional inline styles for the copy link row container */
  copyRowStyle?: React.CSSProperties
  /** Callback when the user is not authenticated and tries to share (optional) */
  onAuthError?: () => void
  /** Callback fired after a share is successfully recorded */
  onShared?: (platform: string, sharesCount: number) => void
  /** Optional CSS class name for the share dropdown panel */
  panelClassName?: string
  /** Optional inline styles for the share dropdown panel */
  panelStyle?: React.CSSProperties
  /** Optional CSS class name for individual platform share buttons */
  platformButtonClassName?: string
  /** Optional inline styles for individual platform share buttons */
  platformButtonStyle?: React.CSSProperties
  /** Optional inline styles for the share trigger button (or container wrapper) */
  style?: React.CSSProperties
  /** The slug of the Payload CMS collection for the target document */
  targetCollection: string
  /** The unique ID of the target document */
  targetDoc: string
  /** The title of the document (used in share text for Twitter/Telegram/WhatsApp) */
  title?: string
  /** The URL to share. Defaults to window.location.href */
  url?: string
}

/**
 * `LfrsShare` is a share button that opens a platform picker panel.
 *
 * **Component Purpose:**
 * - Tracks share events per platform via POST /api/lfrs/share.
 * - Opens share windows for Facebook, Twitter, WhatsApp, Telegram, LinkedIn.
 * - Provides a "Copy Link" option with visual feedback.
 * - Auto-fetches sharesEnabled and sharesCount from the status endpoint.
 *
 * **User Interaction:**
 * - Clicking the button opens an inline share panel.
 * - Clicking a platform opens the share window and records the share server-side.
 * - Copy Link copies to clipboard and records as platform 'web'.
 *
 * **Customization:**
 * - Supports custom CSS classes and inline styles for all elements: container, trigger button, dropdown panel, platform buttons, and copy button.
 */
export const LfrsShare: React.FC<LfrsShareProps> = ({
  apiBase = '/api',
  buttonClassName = '',
  buttonStyle,
  className = '',
  containerClassName = '',
  containerStyle,
  copyButtonClassName = '',
  copyButtonStyle,
  copyRowClassName = '',
  copyRowStyle,
  onAuthError,
  onShared,
  panelClassName = '',
  panelStyle,
  platformButtonClassName = '',
  platformButtonStyle,
  style,
  targetCollection,
  targetDoc,
  title,
  url: urlProp,
}) => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<PlatformId | 'web' | null>(null)
  const [copied, setCopied] = useState(false)
  const [sharesCount, setSharesCount] = useState(0)
  const [sharesEnabled, setSharesEnabled] = useState(true)

  const url = urlProp ?? (typeof window !== 'undefined' ? window.location.href : '')

  // Fetch initial status (sharesEnabled + sharesCount)
  useEffect(() => {
    fetch(`${apiBase}/lfrs/status?collection=${targetCollection}&id=${targetDoc}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (typeof data.sharesEnabled === 'boolean') setSharesEnabled(data.sharesEnabled)
          if (typeof data.sharesCount === 'number') setSharesCount(data.sharesCount)
        }
      })
      .catch(() => {})
  }, [apiBase, targetCollection, targetDoc])

  if (!sharesEnabled) return null

  // ── Track a share server-side ─────────────────────────────────────────────
  const trackShare = async (platform: PlatformId | 'web') => {
    try {
      setLoading(platform)
      const res = await fetch(`${apiBase}/lfrs/share`, {
        body: JSON.stringify({ id: targetDoc, collection: targetCollection, platform, url }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (res.status === 401 && onAuthError) {
        onAuthError()
        return
      }

      if (res.ok) {
        const data = await res.json()
        const newCount = data.sharesCount ?? sharesCount + 1
        setSharesCount(newCount)
        onShared?.(platform, newCount)
      }
    } catch {
      // Non-critical: share UI still works even if tracking fails
    } finally {
      setLoading(null)
    }
  }

  // ── Open a platform share window ──────────────────────────────────────────
  const handlePlatformShare = async (platform: (typeof platforms)[number]) => {
    const shareUrl = platform.buildUrl(url, title)
    window.open(shareUrl, '_blank', 'width=600,height=500,noopener,noreferrer')
    await trackShare(platform.id)
  }

  // ── Copy link to clipboard ────────────────────────────────────────────────
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      await trackShare('web')
    } catch {
      // Clipboard API not available
    }
  }

  const triggerClassName = [
    styles.toggleButton,
    open ? styles.shareActive : '',
    className,
    buttonClassName,
  ]
    .filter(Boolean)
    .join(' ')

  const triggerStyle = { ...style, ...buttonStyle }

  const containerClasses = [styles.shareContainer, containerClassName].filter(Boolean).join(' ')

  return (
    <div className={containerClasses} style={{ position: 'relative', display: 'inline-block', ...containerStyle }}>
      {/* Trigger button */}
      <button
        aria-expanded={open}
        aria-haspopup="true"
        className={triggerClassName}
        onClick={() => setOpen((prev) => !prev)}
        style={triggerStyle}
        title="Share"
        type="button"
      >
        <ShareIcon />
        <span>
          {sharesCount > 0 ? `Share · ${sharesCount}` : 'Share'}
        </span>
      </button>

      {/* Share panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            aria-hidden="true"
            className={styles.shareBackdrop}
            onClick={() => setOpen(false)}
            onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
            role="presentation"
            style={{
              bottom: 0,
              left: 0,
              position: 'fixed',
              right: 0,
              top: 0,
              zIndex: 998,
            }}
          />
          {/* Panel */}
          <div
            role="dialog"
            aria-label="Share options"
            className={`${styles.sharePanel} ${panelClassName}`.trim()}
            style={{
              background: 'var(--lfrs-bg, #ffffff)',
              border: '1px solid var(--lfrs-border, #e0e0e0)',
              borderRadius: 'var(--lfrs-radius, 6px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              left: 0,
              minWidth: 260,
              padding: '12px',
              position: 'absolute',
              top: 'calc(100% + 6px)',
              zIndex: 999,
              ...panelStyle,
            }}
          >
            {/* Platform buttons */}
            <div
              className={styles.sharePlatforms}
              style={{
                display: 'grid',
                gap: '8px',
                gridTemplateColumns: 'repeat(3, 1fr)',
                marginBottom: '10px',
              }}
            >
              {platforms.map((platform) => (
                <button
                  disabled={loading === platform.id}
                  key={platform.id}
                  onClick={() => handlePlatformShare(platform)}
                  className={`${styles.sharePlatformButton} ${platformButtonClassName}`.trim()}
                  style={{
                    alignItems: 'center',
                    background: 'transparent',
                    border: '1px solid var(--lfrs-border, #e0e0e0)',
                    borderRadius: 'var(--lfrs-radius, 6px)',
                    color: platform.color,
                    cursor: loading === platform.id ? 'wait' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    fontSize: '11px',
                    fontWeight: 500,
                    gap: '4px',
                    opacity: loading === platform.id ? 0.6 : 1,
                    padding: '8px 4px',
                    transition: 'background 0.15s ease',
                    ...platformButtonStyle,
                  }}
                  title={`Share on ${platform.label}`}
                  type="button"
                >
                  <span className={styles.sharePlatformIcon} style={{ display: 'block', height: 22, width: 22 }}>
                    <platform.Icon />
                  </span>
                  {platform.label}
                </button>
              ))}
            </div>

            {/* Copy link row */}
            <div
              className={`${styles.shareCopyRow} ${copyRowClassName}`.trim()}
              style={{
                alignItems: 'center',
                background: 'var(--lfrs-bg-muted, #f5f5f5)',
                borderRadius: 'var(--lfrs-radius, 6px)',
                display: 'flex',
                gap: '8px',
                padding: '6px 8px',
                ...copyRowStyle,
              }}
            >
              <span
                className={styles.shareCopyUrl}
                style={{
                  color: 'var(--lfrs-text-muted, #666666)',
                  flex: 1,
                  fontSize: '12px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {url}
              </span>
              <button
                disabled={loading === 'web'}
                onClick={handleCopy}
                className={`${styles.shareCopyButton} ${copied ? styles.shareCopyButtonCopied : ''} ${copyButtonClassName}`.trim()}
                style={{
                  alignItems: 'center',
                  background: copied ? 'var(--lfrs-like-active, #0066cc)' : 'var(--lfrs-primary, #000000)',
                  border: 'none',
                  borderRadius: 'calc(var(--lfrs-radius, 6px) - 2px)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  flexShrink: 0,
                  gap: '4px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 500,
                  transition: 'background 0.2s ease',
                  ...copyButtonStyle,
                }}
                title={copied ? 'Copied!' : 'Copy link'}
                type="button"
              >
                <span className={styles.shareCopyIcon} style={{ display: 'block', height: 14, width: 14 }}>
                  <CopyIcon copied={copied} />
                </span>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

