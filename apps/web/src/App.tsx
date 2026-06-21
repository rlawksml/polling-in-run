import { useQuery } from '@tanstack/react-query'
import type { FormEvent } from 'react'
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

const RUN_RECORDS_STORAGE_KEY = 'polling-in-run.records.v1'

type AppTab = 'home' | 'records' | 'my'
type AuthMode = 'login' | 'signup'

type RunRecord = {
  distanceM: number
  elapsedMs: number
  id: string
  memo: string
  pace: string
  routePointCount: number
  savedAt: string
}

function readRunRecords(): RunRecord[] {
  try {
    const rawRecords = window.localStorage.getItem(RUN_RECORDS_STORAGE_KEY)

    return rawRecords ? JSON.parse(rawRecords) : []
  } catch {
    return []
  }
}

function validateAuthForm(
  mode: AuthMode,
  userId: string,
  password: string,
  passwordConfirm: string,
): string | null {
  if (userId.trim().length < 4) {
    return 'ID는 4자 이상 입력해주세요.'
  }

  if (password.length < 8) {
    return '비밀번호는 8자 이상 입력해주세요.'
  }

  if (mode === 'signup' && password !== passwordConfirm) {
    return '비밀번호 확인이 일치하지 않아요.'
  }

  return null
}

function App() {
  const { location, requestLocation, status } = useCurrentLocation()
  const running = useRunningSession()
  const [mapBounds, setMapBounds] = useState<FacilityBounds | null>(null)
  const [runMemo, setRunMemo] = useState('')
  const [recordSaveMessage, setRecordSaveMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<AppTab>('home')
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authUserId, setAuthUserId] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState('')
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [runRecords, setRunRecords] = useState<RunRecord[]>(() =>
    readRunRecords(),
  )
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)
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
  const selectedRecord =
    runRecords.find((record) => record.id === selectedRecordId) ?? null
  const authTitle = authMode === 'login' ? '로그인' : '회원가입'

  const toggleFacilityType = (type: FacilityType) => {
    setVisibleTypes((current) =>
      current.includes(type)
        ? current.filter((currentType) => currentType !== type)
        : [...current, type],
    )
  }

  const resetRunningResult = () => {
    setRunMemo('')
    setRecordSaveMessage(null)
    running.reset()
  }

  const saveRunningRecord = () => {
    try {
    const record = {
        distanceM: Math.round(running.distanceM),
        elapsedMs: running.elapsedMs,
        id: `run-${Date.now()}`,
        memo: runMemo.trim(),
        pace: formatPace(running.elapsedMs, running.distanceM),
        routePointCount: running.routePointCount,
        savedAt: new Date().toISOString(),
      }
      const records = readRunRecords()
      const nextRecords = [record, ...records]

      window.localStorage.setItem(
        RUN_RECORDS_STORAGE_KEY,
        JSON.stringify(nextRecords),
      )
      setRunRecords(nextRecords)
      setSelectedRecordId(record.id)
      setRecordSaveMessage('기록을 로컬에 저장했어요. 하단 기록 탭에서 다시 볼 수 있어요.')
    } catch {
      setRecordSaveMessage('기록 저장에 실패했어요. 작성한 메모는 화면에 그대로 남아 있어요.')
    }
  }

  const submitAuthForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationMessage = validateAuthForm(
      authMode,
      authUserId,
      authPassword,
      authPasswordConfirm,
    )

    if (validationMessage) {
      setAuthMessage(validationMessage)
      return
    }

    setAuthMessage(
      authMode === 'login'
        ? 'Supabase Auth 연결 후 이 ID로 로그인을 시도할 예정이에요.'
        : 'Supabase Auth 연결 후 이 ID로 회원가입을 처리할 예정이에요.',
    )
  }

  const switchAuthMode = (mode: AuthMode) => {
    setAuthMode(mode)
    setAuthPassword('')
    setAuthPasswordConfirm('')
    setAuthMessage(null)
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
          <Button
            className="profile-button"
            type="button"
            aria-label="마이 페이지"
            onClick={() => setActiveTab('my')}
          >
            MY
          </Button>
        </header>
      )}

      {!isRunningSessionActive && activeTab === 'home' && (
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

      {!isRunningSessionActive && activeTab === 'home' && (
        <div className="facility-status" aria-live="polite">
          {facilities.isPending && '시설 정보를 불러오는 중'}
          {facilities.isSuccess && `현재 영역 시설 ${visibleFacilities.length}곳 표시 중`}
          {facilities.isError && '시설 정보를 불러오지 못했어요'}
        </div>
      )}

      {!isRunningSessionActive && activeTab === 'home' && (
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

      {!isRunningSessionActive && activeTab === 'records' && (
        <section className="records-panel" aria-label="러닝 기록">
          <div>
            <p className="eyebrow">RECORDS</p>
            <h1>저장한 러닝 기록</h1>
          </div>

          {runRecords.length === 0 && (
            <div className="records-empty">
              <strong>아직 저장한 기록이 없어요.</strong>
              <span>러닝을 종료한 뒤 메모와 함께 첫 기록을 남겨보세요.</span>
            </div>
          )}

          {runRecords.length > 0 && (
            <div className="records-layout">
              <div className="record-list" aria-label="러닝 기록 목록">
                {runRecords.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    className={record.id === selectedRecordId ? 'is-selected' : ''}
                    onClick={() => setSelectedRecordId(record.id)}
                  >
                    <span>{new Date(record.savedAt).toLocaleDateString('ko-KR')}</span>
                    <strong>{formatDistance(record.distanceM)}</strong>
                    <small>{formatElapsedTime(record.elapsedMs)} · {record.pace}</small>
                  </button>
                ))}
              </div>

              {selectedRecord && (
                <article className="record-detail" aria-label="러닝 기록 상세">
                  <p className="result-label">기록 상세</p>
                  <h2>{formatDistance(selectedRecord.distanceM)}</h2>
                  <dl>
                    <div>
                      <dt>시간</dt>
                      <dd>{formatElapsedTime(selectedRecord.elapsedMs)}</dd>
                    </div>
                    <div>
                      <dt>평균 페이스</dt>
                      <dd>{selectedRecord.pace}</dd>
                    </div>
                    <div>
                      <dt>GPS 포인트</dt>
                      <dd>{selectedRecord.routePointCount}개</dd>
                    </div>
                  </dl>
                  <p>{selectedRecord.memo || '남긴 메모가 없어요.'}</p>
                </article>
              )}
            </div>
          )}
        </section>
      )}

      {!isRunningSessionActive && activeTab === 'my' && (
        <section className="my-panel" aria-label="마이 페이지">
          <div>
            <p className="eyebrow">MY PAGE</p>
            <h1>ID/PW로 기록을 이어갈 준비</h1>
            <p>
              지금은 Supabase Auth 연결 전 단계라 비밀번호를 저장하지 않고,
              입력 화면과 검증 흐름만 먼저 확인해요.
            </p>
          </div>

          <div className="auth-mode-switch" aria-label="인증 모드 선택">
            <Button
              type="button"
              variant="ghost"
              className={authMode === 'login' ? 'is-active' : ''}
              aria-pressed={authMode === 'login'}
              onClick={() => switchAuthMode('login')}
            >
              로그인
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={authMode === 'signup' ? 'is-active' : ''}
              aria-pressed={authMode === 'signup'}
              onClick={() => switchAuthMode('signup')}
            >
              회원가입
            </Button>
          </div>

          <form className="auth-form" onSubmit={submitAuthForm}>
            <h2>{authTitle}</h2>
            <label>
              <span>ID</span>
              <input
                value={authUserId}
                onChange={(event) => setAuthUserId(event.target.value)}
                autoComplete="username"
                placeholder="runner-id"
              />
            </label>
            <label>
              <span>비밀번호</span>
              <input
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                autoComplete={
                  authMode === 'login' ? 'current-password' : 'new-password'
                }
                type="password"
                placeholder="8자 이상"
              />
            </label>
            {authMode === 'signup' && (
              <label>
                <span>비밀번호 확인</span>
                <input
                  value={authPasswordConfirm}
                  onChange={(event) => setAuthPasswordConfirm(event.target.value)}
                  autoComplete="new-password"
                  type="password"
                  placeholder="비밀번호를 한 번 더 입력"
                />
              </label>
            )}
            <p className="auth-help">
              비밀번호 찾기, 이메일 인증, 소셜 로그인은 MVP 범위에서 제외해요.
            </p>
            {authMessage && (
              <p className="auth-message" role="status">
                {authMessage}
              </p>
            )}
            <Button type="submit" className="auth-submit">
              {authTitle}
            </Button>
          </form>
        </section>
      )}

      {isRunningSessionActive && (
        <section
          className={`running-panel ${running.status === 'finished' ? 'is-result' : ''}`}
          aria-label={running.status === 'finished' ? '러닝 결과' : '러닝 진행'}
        >
          <div>
            <p className="running-eyebrow">
              {running.status === 'running' && '러닝 진행 중'}
              {running.status === 'paused' && '러닝 일시정지'}
              {running.status === 'finished' && '러닝 완료'}
            </p>
            <h1>
              {running.status === 'finished'
                ? '러닝 결과를 확인해요.'
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

          {running.status === 'finished' && (
            <section className="running-result-summary" aria-label="러닝 결과 요약">
              <div>
                <p className="result-label">오늘의 러닝 결과</p>
                <h2>저장하기 전에 기록을 확인해요.</h2>
              </div>
              <p>
                GPS 포인트 {running.routePointCount}개를 기반으로 거리와 평균 페이스를
                계산했어요. 오늘의 느낌을 짧게 남겨둘 수 있어요.
              </p>
            </section>
          )}

          {running.status === 'finished' && (
            <label className="running-memo-field">
              <span>러닝 메모</span>
              <textarea
                value={runMemo}
                onChange={(event) => setRunMemo(event.target.value)}
                placeholder="오늘의 러닝 느낌, 기억하고 싶은 장소를 적어보세요."
                rows={3}
              />
            </label>
          )}

          {recordSaveMessage && (
            <p className="running-save-message" role="status">
              {recordSaveMessage}
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
                <Button type="button" className="secondary-action" onClick={resetRunningResult}>
                  홈으로
                </Button>
                <Button type="button" className="primary-action" onClick={saveRunningRecord}>
                  기록 저장
                </Button>
              </>
            )}
          </div>
        </section>
      )}

      {!isRunningSessionActive && activeTab === 'home' && (
        <Button className="start-button" type="button" onClick={running.start}>
          러닝 시작
        </Button>
      )}

      {!isRunningSessionActive && (
        <nav className="bottom-nav" aria-label="주요 메뉴">
          <Button
            variant="ghost"
            className={activeTab === 'home' ? 'is-active' : ''}
            type="button"
            onClick={() => setActiveTab('home')}
          >
            홈
          </Button>
          <Button
            variant="ghost"
            className={activeTab === 'records' ? 'is-active' : ''}
            type="button"
            onClick={() => setActiveTab('records')}
          >
            기록
          </Button>
          <Button
            variant="ghost"
            className={activeTab === 'my' ? 'is-active' : ''}
            type="button"
            onClick={() => setActiveTab('my')}
          >
            마이
          </Button>
        </nav>
      )}
    </main>
  )
}

export default App
