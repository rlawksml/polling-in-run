import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  getFacilities,
  type FacilityBounds,
  type FacilityType,
} from './api/facilities'
import { FacilityIcon } from './components/FacilityIcon'
import { KakaoMap } from './components/KakaoMap'
import { Button } from './components/ui/button'
import { useCurrentLocation } from './hooks/use-current-location'
import {
  formatDistance,
  formatElapsedTime,
  formatPace,
  useRunningSession,
} from './hooks/use-running-session'
import './App.css'

const locationMessages = {
  idle: '현재 위치를 준비하고 있어요.',
  loading: '현재 위치를 확인하고 있어요.',
  success: '현재 위치를 중심으로 지도를 보여드려요.',
  denied: '위치 권한이 꺼져 있어요. 브라우저 설정에서 허용해주세요.',
  unavailable: '현재 위치를 가져올 수 없어요. 잠시 후 다시 시도해주세요.',
  timeout: '위치 확인 시간이 오래 걸리고 있어요. 다시 시도해주세요.',
  unsupported: '이 브라우저는 위치 기능을 지원하지 않아요.',
}

function App() {
  const { location, requestLocation, status } = useCurrentLocation()
  const running = useRunningSession()
  const [mapBounds, setMapBounds] = useState<FacilityBounds | null>(null)
  const facilities = useQuery({
    queryKey: [
      'facilities',
      location?.latitude,
      location?.longitude,
      mapBounds,
    ],
    queryFn: () =>
      getFacilities({
        bounds: mapBounds,
        latitude: location?.latitude,
        longitude: location?.longitude,
      }),
    enabled: status !== 'loading' && mapBounds !== null,
  })
  const [visibleTypes, setVisibleTypes] = useState<FacilityType[]>([
    'water',
    'restroom',
  ])
  const hasLocationError = [
    'denied',
    'unavailable',
    'timeout',
    'unsupported',
  ].includes(status)
  const visibleFacilities = (facilities.data ?? []).filter((facility) =>
    visibleTypes.includes(facility.type),
  )
  const isRunningSessionActive = running.status !== 'idle'

  const toggleFacilityType = (type: FacilityType) => {
    setVisibleTypes((current) =>
      current.includes(type)
        ? current.filter((currentType) => currentType !== type)
        : [...current, type],
    )
  }

  return (
    <main className="app-shell">
      <KakaoMap
        facilities={visibleFacilities}
        location={location}
        onBoundsChange={setMapBounds}
        onRequestLocation={requestLocation}
      />

      {!isRunningSessionActive && (
        <header className="top-bar">
          <div>
            <p className="eyebrow">POLLING IN RUN</p>
            <h1>달리기 좋은 순간이에요.</h1>
          </div>
          <Button className="profile-button" type="button" aria-label="마이 페이지">
            MY
          </Button>
        </header>
      )}

      {!isRunningSessionActive && (
        <section className="facility-filter" aria-label="편의시설 필터">
          <Button
            variant="outline"
            className={visibleTypes.includes('water') ? 'is-active' : ''}
            type="button"
            aria-pressed={visibleTypes.includes('water')}
            onClick={() => toggleFacilityType('water')}
          >
            <span className="facility-icon water" aria-hidden="true">
              <FacilityIcon type="water" />
            </span>
            음수대
          </Button>
          <Button
            variant="outline"
            className={visibleTypes.includes('restroom') ? 'is-active' : ''}
            type="button"
            aria-pressed={visibleTypes.includes('restroom')}
            onClick={() => toggleFacilityType('restroom')}
          >
            <span className="facility-icon restroom" aria-hidden="true">
              <FacilityIcon type="restroom" />
            </span>
            화장실
          </Button>
        </section>
      )}

      {!isRunningSessionActive && (
        <div className="facility-status" aria-live="polite">
          {facilities.isPending && '시설 정보를 불러오는 중'}
          {facilities.isSuccess && `현재 영역 시설 ${visibleFacilities.length}곳 표시 중`}
          {facilities.isError && '시설 정보를 불러오지 못했어요'}
        </div>
      )}

      {!isRunningSessionActive && (
        <section className={`location-card ${hasLocationError ? 'is-error' : ''}`}>
          <div>
            <p className="location-label">현재 위치</p>
            <p>{locationMessages[status]}</p>
            {location && (
              <span className="accuracy">
                약 {Math.round(location.accuracy)}m 정확도
              </span>
            )}
          </div>
          {hasLocationError && status !== 'unsupported' && (
            <Button type="button" onClick={requestLocation}>
              다시 시도
            </Button>
          )}
        </section>
      )}

      {isRunningSessionActive && (
        <section className="running-panel" aria-label="러닝 진행">
          <div>
            <p className="running-eyebrow">
              {running.status === 'running' && '러닝 진행 중'}
              {running.status === 'paused' && '러닝 일시정지'}
              {running.status === 'finished' && '러닝 완료'}
            </p>
            <h1>
              {running.status === 'finished'
                ? '오늘의 러닝을 저장할까요?'
                : '호흡을 편하게 유지해요.'}
            </h1>
          </div>

          <dl className="running-metrics">
            <div>
              <dt>시간</dt>
              <dd>{formatElapsedTime(running.elapsedMs)}</dd>
            </div>
            <div>
              <dt>거리</dt>
              <dd>{formatDistance(running.distanceM)}</dd>
            </div>
            <div>
              <dt>평균 페이스</dt>
              <dd>{formatPace(running.elapsedMs, running.distanceM)}</dd>
            </div>
          </dl>

          {running.status !== 'finished' && (
            <p className="running-note">
              {running.trackingStatus === 'tracking' &&
                `화면이 켜진 동안 GPS 포인트 ${running.routePointCount}개를 기록하고 있어요.`}
              {running.trackingStatus === 'paused' &&
                `위치 추적을 잠시 멈췄어요. 현재 ${running.routePointCount}개 포인트가 있어요.`}
              {running.trackingStatus === 'unsupported' &&
                '이 브라우저에서는 실시간 위치 추적을 사용할 수 없어요.'}
              {running.trackingStatus === 'error' &&
                '위치 추적 중 오류가 발생했어요. 위치 권한과 GPS 상태를 확인해주세요.'}
              {running.trackingStatus === 'idle' &&
                '화면이 켜진 상태에서 위치 추적을 준비하고 있어요.'}
              {running.trackingError && (
                <span className="running-warning">{running.trackingError}</span>
              )}
            </p>
          )}

          <div className="running-actions">
            {running.status === 'running' && (
              <Button type="button" className="secondary-action" onClick={running.pause}>
                일시정지
              </Button>
            )}
            {running.status === 'paused' && (
              <Button type="button" className="secondary-action" onClick={running.resume}>
                재개
              </Button>
            )}
            {running.status !== 'finished' && (
              <Button type="button" className="danger-action" onClick={running.finish}>
                종료
              </Button>
            )}
            {running.status === 'finished' && (
              <>
                <Button type="button" className="secondary-action" onClick={running.reset}>
                  홈으로
                </Button>
                <Button type="button" className="primary-action" onClick={running.reset}>
                  기록 저장
                </Button>
              </>
            )}
          </div>
        </section>
      )}

      {!isRunningSessionActive && (
        <Button className="start-button" type="button" onClick={running.start}>
          러닝 시작
        </Button>
      )}

      {!isRunningSessionActive && (
        <nav className="bottom-nav" aria-label="주요 메뉴">
          <Button variant="ghost" className="is-active" type="button">
            홈
          </Button>
          <Button variant="ghost" type="button">기록</Button>
          <Button variant="ghost" type="button">마이</Button>
        </nav>
      )}
    </main>
  )
}

export default App
