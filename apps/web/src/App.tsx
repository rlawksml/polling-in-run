import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getFacilities, type FacilityType } from './api/facilities'
import { KakaoMap } from './components/KakaoMap'
import { useCurrentLocation } from './hooks/use-current-location'
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
  const facilities = useQuery({
    queryKey: ['facilities'],
    queryFn: getFacilities,
  })
  const [visibleTypes, setVisibleTypes] = useState<FacilityType[]>([
    'water',
    'restroom',
  ])
  const { location, requestLocation, status } = useCurrentLocation()
  const hasLocationError = [
    'denied',
    'unavailable',
    'timeout',
    'unsupported',
  ].includes(status)
  const visibleFacilities = (facilities.data ?? []).filter((facility) =>
    visibleTypes.includes(facility.type),
  )

  const toggleFacilityType = (type: FacilityType) => {
    setVisibleTypes((current) =>
      current.includes(type)
        ? current.filter((currentType) => currentType !== type)
        : [...current, type],
    )
  }

  return (
    <main className="app-shell">
      <KakaoMap facilities={visibleFacilities} location={location} />

      <header className="top-bar">
        <div>
          <p className="eyebrow">POLLING IN RUN</p>
          <h1>달리기 좋은 순간이에요.</h1>
        </div>
        <button className="profile-button" type="button" aria-label="마이 페이지">
          MY
        </button>
      </header>

      <section className="facility-filter" aria-label="편의시설 필터">
        <button
          className={visibleTypes.includes('water') ? 'is-active' : ''}
          type="button"
          aria-pressed={visibleTypes.includes('water')}
          onClick={() => toggleFacilityType('water')}
        >
          <span className="facility-icon water" aria-hidden="true">
            W
          </span>
          음수대
        </button>
        <button
          className={visibleTypes.includes('restroom') ? 'is-active' : ''}
          type="button"
          aria-pressed={visibleTypes.includes('restroom')}
          onClick={() => toggleFacilityType('restroom')}
        >
          <span className="facility-icon restroom" aria-hidden="true">
            R
          </span>
          화장실
        </button>
      </section>

      <div className="facility-status" aria-live="polite">
        {facilities.isPending && '시설 정보를 불러오는 중'}
        {facilities.isSuccess && `샘플 시설 ${visibleFacilities.length}곳 표시 중`}
        {facilities.isError && '시설 정보를 불러오지 못했어요'}
      </div>

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
          <button type="button" onClick={requestLocation}>
            다시 시도
          </button>
        )}
      </section>

      <button className="start-button" type="button">
        러닝 시작
      </button>

      <nav className="bottom-nav" aria-label="주요 메뉴">
        <button className="is-active" type="button">
          홈
        </button>
        <button type="button">기록</button>
        <button type="button">마이</button>
      </nav>
    </main>
  )
}

export default App
