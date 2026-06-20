import { useCallback, useEffect, useRef, useState } from 'react'
import type { Facility } from '../api/facilities'
import type { FacilityBounds } from '../api/facilities'
import type { CurrentLocation } from '../hooks/use-current-location'
import { getFacilityIconSvg } from '../lib/facility-icon-svg'
import { loadKakaoMaps } from '../lib/kakao-maps'

type KakaoMapProps = {
  facilities: Facility[]
  location: CurrentLocation | null
  onBoundsChange: (bounds: FacilityBounds) => void
  onRequestLocation: () => void
}

const SEOUL_CITY_HALL = {
  latitude: 37.5665,
  longitude: 126.978,
}

export function KakaoMap({
  facilities,
  location,
  onBoundsChange,
  onRequestLocation,
}: KakaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<KakaoMap | null>(null)
  const markerRef = useRef<kakao.maps.Marker | null>(null)
  const facilityOverlaysRef = useRef<kakao.maps.CustomOverlay[]>([])
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const selectedFacility =
    facilities.find((facility) => facility.id === selectedFacilityId) ?? null

  const emitBoundsChange = useCallback(() => {
    if (!mapRef.current) {
      return
    }

    const bounds = mapRef.current.getBounds()
    const southWest = bounds.getSouthWest()
    const northEast = bounds.getNorthEast()

    onBoundsChange({
      minLatitude: southWest.getLat(),
      maxLatitude: northEast.getLat(),
      minLongitude: southWest.getLng(),
      maxLongitude: northEast.getLng(),
    })
  }, [onBoundsChange])

  const moveToCurrentLocation = () => {
    if (!location || !mapRef.current || !window.kakao?.maps) {
      onRequestLocation()
      return
    }

    mapRef.current.panTo(
      new window.kakao.maps.LatLng(location.latitude, location.longitude),
    )
  }

  const showAllFacilities = () => {
    if (
      facilities.length === 0 ||
      !mapRef.current ||
      !window.kakao?.maps
    ) {
      return
    }

    const bounds = new window.kakao.maps.LatLngBounds()

    facilities.forEach((facility) => {
      bounds.extend(
        new window.kakao!.maps.LatLng(
          facility.latitude,
          facility.longitude,
        ),
      )
    })

    if (location) {
      bounds.extend(
        new window.kakao.maps.LatLng(location.latitude, location.longitude),
      )
    }

    mapRef.current.setBounds(bounds)
  }

  const changeZoom = (amount: number) => {
    if (!mapRef.current) {
      return
    }

    const nextLevel = Math.min(14, Math.max(1, mapRef.current.getLevel() + amount))
    mapRef.current.setLevel(nextLevel)
  }

  const openKakaoDirections = (facility: Facility) => {
    const destinationName = encodeURIComponent(facility.name)
    const destination = `${destinationName},${facility.latitude},${facility.longitude}`

    window.open(
      `https://map.kakao.com/link/to/${destination}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

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
        emitBoundsChange()
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
  }, [emitBoundsChange, location])

  useEffect(() => {
    if (!isReady || !mapRef.current || !window.kakao?.maps) {
      return
    }

    window.kakao.maps.event.addListener(
      mapRef.current,
      'idle',
      emitBoundsChange,
    )

    return () => {
      if (!mapRef.current || !window.kakao?.maps) {
        return
      }

      window.kakao.maps.event.removeListener(
        mapRef.current,
        'idle',
        emitBoundsChange,
      )
    }
  }, [emitBoundsChange, isReady])

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

  useEffect(() => {
    facilityOverlaysRef.current.forEach((overlay) => overlay.setMap(null))
    facilityOverlaysRef.current = []

    if (!isReady || !mapRef.current || !window.kakao?.maps) {
      return
    }

    facilityOverlaysRef.current = facilities.map((facility) => {
      const marker = document.createElement('button')
      marker.type = 'button'
      marker.className = `facility-marker ${facility.type}`
      marker.setAttribute('aria-label', facility.name)
      marker.innerHTML = getFacilityIconSvg(facility.type)
      marker.addEventListener('click', () => {
        setSelectedFacilityId(facility.id)
        mapRef.current?.panTo(
          new window.kakao!.maps.LatLng(
            facility.latitude,
            facility.longitude,
          ),
        )
      })

      return new window.kakao!.maps.CustomOverlay({
        map: mapRef.current!,
        position: new window.kakao!.maps.LatLng(
          facility.latitude,
          facility.longitude,
        ),
        content: marker,
        xAnchor: 0.5,
        yAnchor: 1,
        zIndex: 3,
      })
    })

    return () => {
      facilityOverlaysRef.current.forEach((overlay) => overlay.setMap(null))
      facilityOverlaysRef.current = []
    }
  }, [facilities, isReady])

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
      {isReady && !error && (
        <div className="map-controls" aria-label="지도 제어">
          <button type="button" onClick={moveToCurrentLocation} aria-label="현재 위치로 이동">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="4" fill="currentColor" />
              <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
            </svg>
          </button>
          <button
            type="button"
            onClick={showAllFacilities}
            aria-label="시설 전체 보기"
            disabled={facilities.length === 0}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 4H4v4M16 4h4v4M20 16v4h-4M8 20H4v-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              <circle cx="12" cy="12" r="2.5" fill="currentColor" />
            </svg>
          </button>
          <button type="button" onClick={() => changeZoom(-1)} aria-label="지도 확대">
            +
          </button>
          <button type="button" onClick={() => changeZoom(1)} aria-label="지도 축소">
            −
          </button>
        </div>
      )}
      {selectedFacility && (
        <aside className="facility-detail-card" aria-live="polite">
          <div>
            <p className="facility-detail-type">
              {selectedFacility.type === 'water' ? '음수대' : '화장실'}
              {selectedFacility.distance_m !== null
                ? ` · ${selectedFacility.distance_m.toLocaleString()}m`
                : ''}
            </p>
            <h2>{selectedFacility.name}</h2>
            <p>{selectedFacility.road_address ?? selectedFacility.address}</p>
            {selectedFacility.opening_hours && (
              <p className="facility-detail-meta">
                운영시간 {selectedFacility.opening_hours}
              </p>
            )}
          </div>
          <div className="facility-detail-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setSelectedFacilityId(null)}
            >
              닫기
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => openKakaoDirections(selectedFacility)}
            >
              길찾기
            </button>
          </div>
        </aside>
      )}
    </div>
  )
}
