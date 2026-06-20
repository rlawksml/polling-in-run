import { useCallback, useEffect, useMemo, useState } from 'react'

export type RunningStatus = 'idle' | 'running' | 'paused' | 'finished'
export type RunTrackingStatus =
  | 'idle'
  | 'tracking'
  | 'paused'
  | 'unsupported'
  | 'error'

export type RunLocationPoint = {
  accuracy: number
  latitude: number
  longitude: number
  timestamp: number
}

type RunningSession = {
  accumulatedMs: number
  distanceM: number
  routePoints: RunLocationPoint[]
  startedAt: number | null
  status: RunningStatus
  trackingError: string | null
  trackingStatus: RunTrackingStatus
}

const initialSession: RunningSession = {
  accumulatedMs: 0,
  distanceM: 0,
  routePoints: [],
  startedAt: null,
  status: 'idle',
  trackingError: null,
  trackingStatus: 'idle',
}

const MAX_TRACKING_ACCURACY_M = 80
const EARTH_RADIUS_M = 6371000

function getTrackingStartState(): Pick<
  RunningSession,
  'trackingError' | 'trackingStatus'
> {
  if (!navigator.geolocation?.watchPosition) {
    return {
      trackingError: '이 브라우저는 실시간 위치 추적을 지원하지 않아요.',
      trackingStatus: 'unsupported',
    }
  }

  return {
    trackingError: null,
    trackingStatus: 'tracking',
  }
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

function toRadians(degrees: number) {
  return degrees * (Math.PI / 180)
}

export function calculateDistanceM(
  from: Pick<RunLocationPoint, 'latitude' | 'longitude'>,
  to: Pick<RunLocationPoint, 'latitude' | 'longitude'>,
) {
  const latitudeDelta = toRadians(to.latitude - from.latitude)
  const longitudeDelta = toRadians(to.longitude - from.longitude)
  const fromLatitude = toRadians(from.latitude)
  const toLatitude = toRadians(to.latitude)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2

  return EARTH_RADIUS_M * 2 * Math.asin(Math.sqrt(haversine))
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

  useEffect(() => {
    if (session.status !== 'running') {
      return
    }

    if (
      !navigator.geolocation?.watchPosition ||
      session.trackingStatus === 'unsupported'
    ) {
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      ({ coords, timestamp }) => {
        if (coords.accuracy > MAX_TRACKING_ACCURACY_M) {
          setSession((current) => ({
            ...current,
            trackingError: `GPS 정확도가 낮아 이번 좌표는 제외했어요. (${Math.round(
              coords.accuracy,
            )}m)`,
          }))
          return
        }

        const nextPoint = {
          accuracy: coords.accuracy,
          latitude: coords.latitude,
          longitude: coords.longitude,
          timestamp,
        }

        setSession((current) => ({
          ...current,
          distanceM:
            current.routePoints.length > 0
              ? current.distanceM +
                calculateDistanceM(
                  current.routePoints[current.routePoints.length - 1],
                  nextPoint,
                )
              : current.distanceM,
          routePoints: [...current.routePoints, nextPoint],
          trackingError: null,
        }))
      },
      (error) => {
        setSession((current) => ({
          ...current,
          trackingError:
            error.message || '러닝 위치를 추적하는 중 오류가 발생했어요.',
          trackingStatus: 'error',
        }))
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      },
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [session.status, session.trackingStatus])

  const start = useCallback(() => {
    const timestamp = Date.now()
    setNow(timestamp)
    setSession({
      accumulatedMs: 0,
      distanceM: 0,
      routePoints: [],
      startedAt: timestamp,
      status: 'running',
      ...getTrackingStartState(),
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
        trackingStatus: 'paused',
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
        ...getTrackingStartState(),
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
            trackingStatus: 'idle',
          }
        }

        return current
      }

      return {
        ...current,
        accumulatedMs: current.accumulatedMs + Date.now() - current.startedAt,
        startedAt: null,
        status: 'finished',
        trackingStatus: 'idle',
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
    routePointCount: session.routePoints.length,
    routePoints: session.routePoints,
    start,
    status: session.status,
    trackingError: session.trackingError,
    trackingStatus: session.trackingStatus,
  }
}
