import { useQuery } from '@tanstack/react-query'
import './App.css'
import { getHealth } from './api/health'

function App() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    retry: 1,
  })

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">POLLING IN RUN</p>
        <h1>달리는 동안 필요한 정보를, 가장 빠르게.</h1>
        <p className="hero-copy">
          가까운 음수대와 공중화장실을 확인하고 바로 러닝을 시작하는
          모바일 퍼스트 서비스입니다.
        </p>
      </section>

      <section className="status-card" aria-live="polite">
        <div>
          <p className="status-label">서비스 연결 상태</p>
          <h2>
            {health.isPending && '서버에 연결하는 중'}
            {health.isSuccess && '개발 환경 준비 완료'}
            {health.isError && '서버 연결을 확인해주세요'}
          </h2>
        </div>

        <span
          className={`status-dot ${
            health.isSuccess ? 'is-online' : health.isError ? 'is-error' : ''
          }`}
          aria-hidden="true"
        />

        {health.isSuccess && (
          <dl className="status-details">
            <div>
              <dt>API</dt>
              <dd>{health.data.service}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{health.data.version}</dd>
            </div>
          </dl>
        )}

        {health.isError && (
          <button type="button" onClick={() => health.refetch()}>
            다시 연결
          </button>
        )}
      </section>

      <section className="next-card">
        <p className="status-label">다음 개발 목표</p>
        <h2>현재 위치 중심 지도</h2>
        <p>사용자의 위치를 표시하고 주변 편의시설 데이터를 연결합니다.</p>
      </section>
    </main>
  )
}

export default App
