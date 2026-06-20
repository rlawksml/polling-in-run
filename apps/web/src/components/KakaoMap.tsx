import { useCallback, useEffect, useRef, useState } from 'react'
import type { Facility } from '../api/facilities'
import type { FacilityBounds } from '../api/facilities'
import type { CurrentLocation } from '../hooks/use-current-location'
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

function createFacilityMarkerImage(type: Facility['type']) {
  const background = type === 'water' ? '#2563eb' : '#101828'
  const icon =
    type === 'water'
      ? '<path d="M18 4.2C15.7 7.6 12.2 10.8 12.2 15.4a5.8 5.8 0 0 0 11.6 0C23.8 10.8 20.3 7.6 18 4.2Z" fill="#fff"/><path d="M15.4 15.6c.2 1.5 1.2 2.4 2.8 2.7" fill="none" stroke="#2563eb" stroke-linecap="round" stroke-width="1.7"/>'
      : '<circle cx="13.5" cy="9" r="2.1" fill="#fff"/><circle cx="22.5" cy="9" r="2.1" fill="#fff"/><path d="M10.6 13.1c0-1 .8-1.8 1.8-1.8h2.2c1 0 1.8.8 1.8 1.8v4.8h-1.6V25h-2.6v-7.1h-1.6v-4.8Z" fill="#fff"/><path d="M19.6 13.1c0-1 .8-1.8 1.8-1.8h2.2c1 0 1.8.8 1.8 1.8v4.8h-1.6V25h-2.6v-7.1h-1.6v-4.8Z" fill="#fff"/><path d="M18 7v18" fill="none" stroke="#fff" stroke-width="1.2" opacity=".45"/>'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" fill="${background}" stroke="#fff" stroke-width="3"/>
      <g transform="translate(0 0)">${icon}</g>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
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
  const clustererRef = useRef<kakao.maps.MarkerClusterer | null>(null)
  const facilityMarkersRef = useRef<kakao.maps.Marker[]>([])
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
    clustererRef.current?.clear()
    facilityMarkersRef.current.forEach((marker) => marker.setMap(null))
    facilityMarkersRef.current = []

    if (!isReady || !mapRef.current || !window.kakao?.maps) {
      return
    }

    if (!clustererRef.current) {
      clustererRef.current = new window.kakao.maps.MarkerClusterer({
        map: mapRef.current,
        averageCenter: true,
        gridSize: 56,
        minClusterSize: 3,
        minLevel: 6,
        styles: [
          {
            width: '42px',
            height: '42px',
            border: '3px solid #fff',
            borderRadius: '50%',
            background: 'rgba(16, 24, 40, 0.88)',
            color: '#fff',
            fontWeight: '800',
            fontSize: '14px',
            lineHeight: '42px',
            textAlign: 'center',
            boxShadow: '0 10px 24px rgba(16, 24, 40, 0.28)',
          },
          {
            width: '48px',
            height: '48px',
            border: '3px solid #fff',
            borderRadius: '50%',
            background: 'rgba(37, 99, 235, 0.9)',
            color: '#fff',
            fontWeight: '800',
            fontSize: '15px',
            lineHeight: '48px',
            textAlign: 'center',
            boxShadow: '0 12px 28px rgba(37, 99, 235, 0.28)',
          },
        ],
      })
    }

    const markerImages = {
      restroom: new window.kakao.maps.MarkerImage(
        createFacilityMarkerImage('restroom'),
        new window.kakao.maps.Size(36, 36),
        { offset: new window.kakao.maps.Point(18, 36) },
      ),
      water: new window.kakao.maps.MarkerImage(
        createFacilityMarkerImage('water'),
        new window.kakao.maps.Size(36, 36),
        { offset: new window.kakao.maps.Point(18, 36) },
      ),
    }

    facilityMarkersRef.current = facilities.map((facility) => {
      const marker = new window.kakao!.maps.Marker({
        position: new window.kakao!.maps.LatLng(
          facility.latitude,
          facility.longitude,
        ),
        image: markerImages[facility.type],
        title: facility.name,
        clickable: true,
      })

      window.kakao!.maps.event.addListener(marker, 'click', () => {
        setSelectedFacilityId(facility.id)
        mapRef.current?.panTo(
          new window.kakao!.maps.LatLng(
            facility.latitude,
            facility.longitude,
          ),
        )
      })

      return marker
    })

    clustererRef.current.addMarkers(facilityMarkersRef.current)

    return () => {
      clustererRef.current?.clear()
      facilityMarkersRef.current.forEach((marker) => marker.setMap(null))
      facilityMarkersRef.current = []
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
