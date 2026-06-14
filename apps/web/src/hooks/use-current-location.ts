import { useCallback, useEffect, useState } from 'react'

export type CurrentLocation = {
  latitude: number
  longitude: number
  accuracy: number
}

export type LocationStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'unsupported'

export function useCurrentLocation() {
  const [status, setStatus] = useState<LocationStatus>(() =>
    navigator.geolocation ? 'loading' : 'unsupported',
  )
  const [location, setLocation] = useState<CurrentLocation | null>(null)

  const readLocation = useCallback(() => {
    if (!navigator.geolocation) {
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        })
        setStatus('success')
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setStatus('denied')
          return
        }

        if (error.code === error.TIMEOUT) {
          setStatus('timeout')
          return
        }

        setStatus('unavailable')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15_000,
        timeout: 10_000,
      },
    )
  }, [])

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unsupported')
      return
    }

    setStatus('loading')
    readLocation()
  }, [readLocation])

  useEffect(() => {
    readLocation()
  }, [readLocation])

  return { location, requestLocation, status }
}
