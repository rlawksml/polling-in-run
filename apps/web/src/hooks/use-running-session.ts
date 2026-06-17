import { useCallback, useEffect, useMemo, useState } from 'react'

export type RunningStatus = 'idle' | 'running' | 'paused' | 'finished'

type RunningSession = {
  accumulatedMs: number
  distanceM: number
  startedAt: number | null
  status: RunningStatus
}

const initialSession: RunningSession = {
  accumulatedMs: 0,
  distanceM: 0,
  startedAt: null,
  status: 'idle',
}

export function formatElapsedTime(elapsedMs: number) {
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, '0'))
      .join(':')
  }

  return [minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}

export function formatDistance(distanceM: number) {
  return `${(distanceM / 1000).toFixed(2)} km`
}

export function formatPace(elapsedMs: number, distanceM: number) {
  if (distanceM <= 0) {
    return '--'
  }

  const paceMsPerKm = elapsedMs / (distanceM / 1000)

  return `${formatElapsedTime(paceMsPerKm)} /km`
}

export function useRunningSession() {
  const [session, setSession] = useState<RunningSession>(initialSession)
  const [now, setNow] = useState(() => Date.now())

  const elapsedMs = useMemo(() => {
    if (session.status !== 'running' || session.startedAt === null) {
      return session.accumulatedMs
    }

    return session.accumulatedMs + now - session.startedAt
  }, [now, session])

  useEffect(() => {
    if (session.status !== 'running') {
      return
    }

    const timerId = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [session.status])

  const start = useCallback(() => {
    const timestamp = Date.now()
    setNow(timestamp)
    setSession({
      accumulatedMs: 0,
      distanceM: 0,
      startedAt: timestamp,
      status: 'running',
    })
  }, [])

  const pause = useCallback(() => {
    setSession((current) => {
      if (current.status !== 'running' || current.startedAt === null) {
        return current
      }

      return {
        ...current,
        accumulatedMs: current.accumulatedMs + Date.now() - current.startedAt,
        startedAt: null,
        status: 'paused',
      }
    })
  }, [])

  const resume = useCallback(() => {
    const timestamp = Date.now()
    setNow(timestamp)
    setSession((current) => {
      if (current.status !== 'paused') {
        return current
      }

      return {
        ...current,
        startedAt: timestamp,
        status: 'running',
      }
    })
  }, [])

  const finish = useCallback(() => {
    setSession((current) => {
      if (current.status !== 'running' || current.startedAt === null) {
        if (current.status === 'paused') {
          return {
            ...current,
            status: 'finished',
          }
        }

        return current
      }

      return {
        ...current,
        accumulatedMs: current.accumulatedMs + Date.now() - current.startedAt,
        startedAt: null,
        status: 'finished',
      }
    })
  }, [])

  const reset = useCallback(() => {
    setSession(initialSession)
  }, [])

  return {
    distanceM: session.distanceM,
    elapsedMs,
    finish,
    pause,
    reset,
    resume,
    start,
    status: session.status,
  }
}
