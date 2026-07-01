import { Capacitor } from '@capacitor/core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BackgroundLocation } from '../lib/background-location'

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
const MIN_DISTANCE_ACCUMULATION_M = 0.75
const MIN_ROUTE_POINT_DISTANCE_M = 0.15
const ROUTE_SAMPLING_INTERVAL_MS = 1000
const EARTH_RADIUS_M = 6371000

function getTrackingStartState(): Pick<
  RunningSession,
  'trackingError' | 'trackingStatus'
> {
  if (!Capacitor.isNativePlatform() && !navigator.geolocation?.watchPosition) {
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

function appendRoutePoint(
  current: RunningSession,
  nextPoint: RunLocationPoint,
): RunningSession {
  const lastPoint = current.routePoints[current.routePoints.length - 1]

  if (!lastPoint) {
    return {
      ...current,
      routePoints: [nextPoint],
      trackingError: null,
    }
  }

  const distanceFromLastPoint = calculateDistanceM(lastPoint, nextPoint)

  if (distanceFromLastPoint < MIN_ROUTE_POINT_DISTANCE_M) {
    return {
      ...current,
      trackingError: null,
    }
  }

  return {
    ...current,
    distanceM:
      distanceFromLastPoint >= MIN_DISTANCE_ACCUMULATION_M
        ? current.distanceM + distanceFromLastPoint
        : current.distanceM,
    routePoints: [...current.routePoints, nextPoint],
    trackingError: null,
  }
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

    if (session.trackingStatus === 'unsupported') {
      return
    }

    const handleLocationPoint = (point: RunLocationPoint) => {
      if (point.accuracy > MAX_TRACKING_ACCURACY_M) {
        setSession((current) => ({
          ...current,
          trackingError: `GPS 정확도가 낮아 이번 좌표는 제외했어요. (${Math.round(
            point.accuracy,
          )}m)`,
        }))
        return
      }

      setSession((current) => appendRoutePoint(current, point))
    }

    if (Capacitor.isNativePlatform()) {
      let isDisposed = false
      let removeNativeListener: (() => Promise<void>) | null = null

      void BackgroundLocation.addListener('location', handleLocationPoint)
        .then((listener) => {
          if (isDisposed) {
            void listener.remove()
            return
          }

          removeNativeListener = () => listener.remove()
        })
        .catch((error) => {
          setSession((current) => ({
            ...current,
            trackingError:
              error instanceof Error
                ? error.message
                : '네이티브 위치 이벤트를 연결하지 못했어요.',
            trackingStatus: 'error',
          }))
        })

      void BackgroundLocation.start().then(({ status }) => {
        if (status === 'denied') {
          setSession((current) => ({
            ...current,
            trackingError:
              'iPhone 위치 권한이 꺼져 있어요. 설정에서 항상 허용을 확인해주세요.',
            trackingStatus: 'error',
          }))
        }
      }).catch((error) => {
        setSession((current) => ({
          ...current,
          trackingError:
            error instanceof Error
              ? error.message
              : '백그라운드 위치 추적을 시작하지 못했어요.',
          trackingStatus: 'error',
        }))
      })

      return () => {
        isDisposed = true
        void removeNativeListener?.()
        void BackgroundLocation.stop().catch(() => undefined)
      }
    }

    if (!navigator.geolocation?.watchPosition) {
      return
    }

    const handlePosition = ({ coords, timestamp }: GeolocationPosition) => {
      handleLocationPoint({
        accuracy: coords.accuracy,
        latitude: coords.latitude,
        longitude: coords.longitude,
        timestamp,
      })
    }

    const watchId = navigator.geolocation.watchPosition(
      handlePosition,
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
        maximumAge: 0,
        timeout: 10000,
      },
    )
    const samplingTimerId = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        handlePosition,
        () => undefined,
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 8000,
        },
      )
    }, ROUTE_SAMPLING_INTERVAL_MS)

    return () => {
      navigator.geolocation.clearWatch(watchId)
      window.clearInterval(samplingTimerId)
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
