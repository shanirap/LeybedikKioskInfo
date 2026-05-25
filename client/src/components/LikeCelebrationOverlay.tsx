type LikeCelebrationOverlayProps = {
  visible: boolean
}

const CELEBRATION_DURATION_MS = 2500

export function LikeCelebrationOverlay({ visible }: LikeCelebrationOverlayProps) {
  if (!visible) return null

  return (
    <div className="like-celebration-overlay" aria-live="assertive" role="status">
      <span className="visually-hidden">מישהו סימן לייק לחומר שהעלית</span>
      <span className="like-celebration-icon" aria-hidden="true">
        👍
      </span>
    </div>
  )
}

export { CELEBRATION_DURATION_MS }
