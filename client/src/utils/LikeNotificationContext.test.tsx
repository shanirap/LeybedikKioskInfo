import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HubConnectionState } from '@microsoft/signalr'
import { CELEBRATION_DURATION_MS } from '../components/LikeCelebrationOverlay'
import { MATERIAL_LIKED_EVENT } from './like-notification-context'
import { LikeNotificationProvider } from './LikeNotificationContext'
import { teacherUser } from '../test/fixtures'
import { useAuth } from './useAuth'

vi.mock('./useAuth', () => ({
  useAuth: vi.fn(),
}))

type MockConnection = {
  on: ReturnType<typeof vi.fn>
  off: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  state: HubConnectionState
  trigger: (event: string) => void
}

function createMockConnection(): MockConnection {
  const handlers = new Map<string, () => void>()
  const connection: MockConnection = {
    on: vi.fn((event: string, handler: () => void) => {
      handlers.set(event, handler)
    }),
    off: vi.fn((event: string) => {
      handlers.delete(event)
    }),
    start: vi.fn().mockImplementation(async () => {
      connection.state = HubConnectionState.Connected
    }),
    stop: vi.fn().mockImplementation(async () => {
      connection.state = HubConnectionState.Disconnected
    }),
    state: HubConnectionState.Disconnected,
    trigger(event: string) {
      handlers.get(event)?.()
    },
  }

  return connection
}

describe('LikeNotificationProvider', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: teacherUser,
      login: vi.fn(),
      logout: vi.fn(),
    })
  })

  it('shows the celebration overlay when a MaterialLiked event arrives', async () => {
    const connection = createMockConnection()

    render(
      <LikeNotificationProvider connect={() => connection as never}>
        <div>page content</div>
      </LikeNotificationProvider>,
    )

    expect(screen.queryByText('👍')).not.toBeInTheDocument()

    act(() => {
      connection.trigger(MATERIAL_LIKED_EVENT)
    })

    expect(await screen.findByText('👍')).toBeInTheDocument()
    expect(connection.on).toHaveBeenCalledWith(MATERIAL_LIKED_EVENT, expect.any(Function))
    expect(connection.start).toHaveBeenCalled()
  })

  it('disconnects when the user logs out', async () => {
    const connection = createMockConnection()
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <LikeNotificationProvider connect={() => connection as never}>
        <div>page content</div>
      </LikeNotificationProvider>,
    )

    await waitFor(() => expect(connection.start).not.toHaveBeenCalled())
  })

  it('auto-dismisses the celebration overlay after the configured duration', async () => {
    vi.useFakeTimers()
    const connection = createMockConnection()

    render(
      <LikeNotificationProvider connect={() => connection as never}>
        <div>page content</div>
      </LikeNotificationProvider>,
    )

    act(() => {
      connection.trigger(MATERIAL_LIKED_EVENT)
    })

    expect(screen.getByText('👍')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(CELEBRATION_DURATION_MS)
    })

    expect(screen.queryByText('👍')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('stops the hub connection when unmounted', async () => {
    const connection = createMockConnection()

    const { unmount } = render(
      <LikeNotificationProvider connect={() => connection as never}>
        <div>page content</div>
      </LikeNotificationProvider>,
    )

    await waitFor(() => expect(connection.start).toHaveBeenCalled())

    unmount()

    expect(connection.off).toHaveBeenCalledWith(MATERIAL_LIKED_EVENT)
    expect(connection.stop).toHaveBeenCalled()
  })
})
