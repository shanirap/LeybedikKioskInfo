import type { ReactNode } from 'react'

export type MaterialCardBadge = {
  label: string
  className?: string
}

type MaterialCardProps = {
  kicker?: string
  title: string
  badges: MaterialCardBadge[]
  description?: string
  metaItems?: string[]
  stats?: ReactNode
  alert?: ReactNode
  footer?: ReactNode
  footerNote?: ReactNode
}

export function MaterialCard({
  kicker,
  title,
  badges,
  description,
  metaItems,
  stats,
  alert,
  footer,
  footerNote,
}: MaterialCardProps) {
  const hasDetails = Boolean((metaItems && metaItems.length > 0) || stats || alert)

  return (
    <article className="card library-card material-card">
      <div className="card-header material-card-header">
        {kicker && <span className="card-kicker">{kicker}</span>}
        <h2>{title}</h2>
        {badges.length > 0 && (
          <div className="badge-row">
            {badges.map((badge) => (
              <span
                key={badge.label}
                className={['badge badge-compact', badge.className].filter(Boolean).join(' ')}
              >
                {badge.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {description && <p className="card-description">{description}</p>}

      {hasDetails && (
        <details className="material-details">
          <summary className="material-details-summary">פרטים נוספים</summary>
          <div className="material-details-body">
            {metaItems && metaItems.length > 0 && (
              <div className="material-meta meta-grid">
                {metaItems.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            )}
            {stats}
            {alert}
          </div>
        </details>
      )}

      {(footer || footerNote) && (
        <div className="card-footer">
          {footer}
          {footerNote}
        </div>
      )}
    </article>
  )
}

type MaterialCardFooterProps = {
  primary?: ReactNode
  tools?: ReactNode
}

export function MaterialCardFooter({ primary, tools }: MaterialCardFooterProps) {
  if (!primary && !tools) return null

  return (
    <div className="card-footer-actions">
      {primary && <div className="card-footer-primary">{primary}</div>}
      {tools && <div className="card-footer-tools">{tools}</div>}
    </div>
  )
}
