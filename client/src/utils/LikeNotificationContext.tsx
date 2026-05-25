import { HubConnection, HubConnectionState } from '@microsoft/signalr'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createLikeNotificationConnection } from '../api/likeNotificationHub'
import { LikeCelebrationOverlay, CELEBRATION_DURATION_MS } from '../components/LikeCelebrationOverlay'
import { useAuth } from './useAuth'
import {
  LikeNotificationContext,
  MATERIAL_LIKED_EVENT,
} from './like-notification-context'

type LikeNotificationProviderProps = {
  children: ReactNode
  connect?: typeof createLikeNotificationConnection
}

export function LikeNotificationProvider({
  children,
  connect = createLikeNotificationConnection,
}: LikeNotificationProviderProps) {
  const { user } = useAuth()
  const [showCelebration, setShowCelebration] = useState(false)
  const connectionRef = useRef<HubConnection | null>(null)
  const hideTimeoutRef = useRef<number | null>(null)

  const triggerCelebration = useCallback(() => {
    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current)
    }

    setShowCelebration(true)
    hideTimeoutRef.current = window.setTimeout(() => {
      setShowCelebration(false)
      hideTimeoutRef.current = null
    }, CELEBRATION_DURATION_MS)
  }, [])

  useEffect(() => {
    if (!user) {
      if (hideTimeoutRef.current !== null) {
        window.clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }
      if (connectionRef.current) {
        void connectionRef.current.stop()
        connectionRef.current = null
      }
      return
    }

    const connection = connect()
    connectionRef.current = connection

    connection.on(MATERIAL_LIKED_EVENT, () => {
      triggerCelebration()
    })

    void connection
      .start()
      .catch(() => {
        // Silent reconnect/backoff is handled by automatic reconnect.
      })

    return () => {
      connection.off(MATERIAL_LIKED_EVENT)
      if (connection.state !== HubConnectionState.Disconnected) {
        void connection.stop()
      }
      connectionRef.current = null
    }
  }, [connect, triggerCelebration, user])

  useEffect(
    () => () => {
      if (hideTimeoutRef.current !== null) {
        window.clearTimeout(hideTimeoutRef.current)
      }
    },
    [],
  )

  return (
    <LikeNotificationContext.Provider value={{ showCelebration }}>
      {children}
      <LikeCelebrationOverlay visible={showCelebration && !!user} />
    </LikeNotificationContext.Provider>
  )
}
