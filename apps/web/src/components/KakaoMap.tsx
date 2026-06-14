import { useEffect, useRef, useState } from 'react'
import type { CurrentLocation } from '../hooks/use-current-location'
import { loadKakaoMaps } from '../lib/kakao-maps'

type KakaoMapProps = {
  location: CurrentLocation | null
}

const SEOUL_CITY_HALL = {
  latitude: 37.5665,
  longitude: 126.978,
}

export function KakaoMap({ location }: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<KakaoMap | null>(null)
  const markerRef = useRef<kakao.maps.Marker | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    loadKakaoMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current || mapRef.current) {
          return
        }

        const initialPosition = new maps.LatLng(
          location?.latitude ?? SEOUL_CITY_HALL.latitude,
          location?.longitude ?? SEOUL_CITY_HALL.longitude,
        )

        mapRef.current = new maps.Map(containerRef.current, {
          center: initialPosition,
          level: location ? 4 : 7,
        })
        setIsReady(true)
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : '카카오맵을 불러오지 못했습니다.',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [location])

  useEffect(() => {
    if (!location || !mapRef.current || !window.kakao?.maps) {
      return
    }

    const position = new window.kakao.maps.LatLng(
      location.latitude,
      location.longitude,
    )

    if (!markerRef.current) {
      markerRef.current = new window.kakao.maps.Marker({
        map: mapRef.current,
        position,
      })
    } else {
      markerRef.current.setPosition(position)
    }

    mapRef.current.panTo(position)
  }, [isReady, location])

  return (
    <div className="map-area">
      <div
        ref={containerRef}
        className="map-canvas"
        aria-label="현재 위치와 주변 편의시설 지도"
      />
      {!isReady && !error && (
        <div className="map-message" role="status">
          지도를 불러오는 중
        </div>
      )}
      {error && (
        <div className="map-message is-error" role="alert">
          <strong>지도를 표시할 수 없습니다.</strong>
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
