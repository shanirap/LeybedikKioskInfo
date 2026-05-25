import { createContext } from 'react'

export type LikeNotificationContextValue = {
  showCelebration: boolean
}

export const LikeNotificationContext = createContext<LikeNotificationContextValue | null>(null)

export const MATERIAL_LIKED_EVENT = 'MaterialLiked'
