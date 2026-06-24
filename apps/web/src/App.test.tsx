import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./components/KakaoMap', async () => {
  const React = await vi.importActual<typeof import('react')>('react')

  return {
    KakaoMap: ({
      facilities,
      onBoundsChange,
    }: {
      facilities: unknown[]
      onBoundsChange: (bounds: {
        maxLatitude: number
        maxLongitude: number
        minLatitude: number
        minLongitude: number
      }) => void
    }) => {
      React.useEffect(() => {
        onBoundsChange({
          maxLatitude: 37.58,
          maxLongitude: 127,
          minLatitude: 37.55,
          minLongitude: 126.96,
        })
      }, [onBoundsChange])

      return (
        <div aria-label="현재 위치와 주변 편의시설 지도">
          시설 {facilities.length}개
        </div>
      )
    },
  }
})

const facilityResponse = [
  {
    id: 'water-sample-1',
    type: 'water',
    name: '서울광장 음수대',
    latitude: 37.5658,
    longitude: 126.9773,
    address: '서울특별시 중구 세종대로 110',
    opening_hours: null,
    source: 'sample',
  },
  {
    id: 'restroom-sample-1',
    type: 'restroom',
    name: '서울도서관 화장실',
    latitude: 37.5661,
    longitude: 126.9779,
    address: '서울특별시 중구 세종대로 110',
    opening_hours: '09:00~21:00',
    source: 'sample',
  },
]

const localFacilityPayload = {
  count: facilityResponse.length,
  facilities: facilityResponse,
  generated_at: '2026-06-23T00:00:00.000Z',
}

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}

describe('App', () => {
  afterEach(() => {
    cleanup()
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('shows a full loading screen while the app is preparing location', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise<Response>(() => undefined),
    )
    const getCurrentPosition = vi.fn()

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    })

    renderApp()

    expect(screen.getByLabelText('앱 로딩 화면')).toHaveTextContent(
      '달릴 준비를 하고 있어요.',
    )
  })

  it('shows a map data skeleton while facilities are loading', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise<Response>(() => undefined),
    )
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          accuracy: 12.4,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: 37.5665,
          longitude: 126.978,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      })
    })

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    })

    renderApp()

    expect(await screen.findByLabelText('지도 데이터 로딩 상태')).toHaveTextContent(
      '주변 시설을 불러오고 있어요.',
    )
  })

  it('shows the current location and running actions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(localFacilityPayload), { status: 200 }),
    )
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          accuracy: 12.4,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: 37.5665,
          longitude: 126.978,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      })
    })

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    })

    renderApp()

    expect(await screen.findByText('현재 위치를 중심으로 지도를 보여드려요.')).toBeInTheDocument()
    expect(await screen.findByText('현재 영역 시설 2곳 표시 중')).toBeInTheDocument()
    expect(screen.getByText('시설 2개')).toBeInTheDocument()
    expect(screen.getByText('약 12m 정확도')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '러닝 시작' })).toBeInTheDocument()
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/data/facilities.json')
  })

  it('lets the user retry after denying location permission', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(localFacilityPayload), { status: 200 }),
    )
    const getCurrentPosition = vi.fn(
      (_success: PositionCallback, error: PositionErrorCallback) => {
        error({
          code: 1,
          message: 'denied',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        })
      },
    )

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    })

    renderApp()

    expect(await screen.findByText(/위치 권한이 꺼져 있어요/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(getCurrentPosition).toHaveBeenCalledTimes(2)
  })

  it('filters facilities by type', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(localFacilityPayload), { status: 200 }),
    )

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    })

    renderApp()

    expect(await screen.findByText('현재 영역 시설 2곳 표시 중')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '음수대' }))
    expect(screen.getByText('현재 영역 시설 1곳 표시 중')).toBeInTheDocument()
  })

  it('moves through the first running session flow', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(localFacilityPayload), { status: 200 }),
    )
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: 37.5665,
          longitude: 126.978,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: 1000,
        toJSON: () => ({}),
      })
    })
    const watchPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          accuracy: 12,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: 37.5665,
          longitude: 126.978,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: 1000,
        toJSON: () => ({}),
      })
      success({
        coords: {
          accuracy: 12,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: 37.5675,
          longitude: 126.978,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: 2000,
        toJSON: () => ({}),
      })

      return 24
    })

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: { clearWatch: vi.fn(), getCurrentPosition, watchPosition },
    })

    renderApp()

    fireEvent.click(screen.getByRole('button', { name: '러닝 시작' }))

    expect(screen.getByText('러닝 진행 중')).toBeInTheDocument()
    expect(screen.getByText('0.11 km')).toBeInTheDocument()
    expect(screen.getByText('00:00 /km')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '일시정지' }))
    expect(screen.getByText('러닝 일시정지')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '재개' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '재개' }))
    expect(screen.getByText('러닝 진행 중')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '종료' }))
    expect(screen.getByText('러닝 완료')).toBeInTheDocument()
    expect(screen.getByText('러닝 결과를 확인해요.')).toBeInTheDocument()
    expect(screen.getByText('오늘의 러닝 결과')).toBeInTheDocument()
    expect(screen.getByText('저장하기 전에 기록을 확인해요.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('러닝 메모'), {
      target: { value: '가볍게 달린 날' },
    })
    fireEvent.click(screen.getByRole('button', { name: '기록 저장' }))

    expect(screen.getByText('저장한 러닝 기록')).toBeInTheDocument()
    expect(screen.getByLabelText('러닝 기록 상세')).toHaveTextContent(
      '가볍게 달린 날',
    )
    expect(window.localStorage.getItem('polling-in-run.records.v1')).toContain(
      '가볍게 달린 날',
    )
  })

  it('blocks zero-distance running records', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(localFacilityPayload), { status: 200 }),
    )

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    })

    renderApp()

    fireEvent.click(screen.getByRole('button', { name: '러닝 시작' }))
    fireEvent.click(screen.getByRole('button', { name: '종료' }))
    fireEvent.change(screen.getByLabelText('러닝 메모'), {
      target: { value: '움직이지 않은 기록' },
    })
    fireEvent.click(screen.getByRole('button', { name: '기록 저장' }))

    expect(screen.getByText(/0km 러닝은 기록으로 저장하지 않아요/)).toBeInTheDocument()
    expect(window.localStorage.getItem('polling-in-run.records.v1')).toBeNull()
  })

  it('opens and deletes a local running record without signing in', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(localFacilityPayload), { status: 200 }),
    )

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    })
    window.localStorage.setItem(
      'polling-in-run.records.v1',
      JSON.stringify([
        {
          distanceM: 1200,
          elapsedMs: 360000,
          id: 'run-1',
          memo: '삭제할 기록',
          pace: '5:00 /km',
          routePointCount: 12,
          savedAt: '2026-06-21T00:00:00.000Z',
        },
      ]),
    )

    renderApp()

    fireEvent.click(screen.getByRole('button', { name: '기록' }))

    expect(screen.getByText('저장한 러닝 기록')).toBeInTheDocument()
    expect(screen.getByLabelText('러닝 기록 상세')).toHaveTextContent('삭제할 기록')

    fireEvent.click(screen.getByRole('button', { name: '기록 삭제' }))

    expect(screen.getByText('아직 저장한 기록이 없어요.')).toBeInTheDocument()
    await waitFor(() =>
      expect(
        window.localStorage.getItem('polling-in-run.records.v1'),
      ).toBe('[]'),
    )
  })

  it('filters, sorts, and previews routes on Records page', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(localFacilityPayload), { status: 200 }),
    )

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    })
    window.localStorage.setItem(
      'polling-in-run.records.v1',
      JSON.stringify([
        {
          distanceM: 1200,
          elapsedMs: 360000,
          id: 'run-1',
          memo: '한강 다리 옆',
          pace: '5:00 /km',
          routePointCount: 3,
          routePoints: [
            {
              accuracy: 10,
              latitude: 37.5665,
              longitude: 126.978,
              timestamp: 1000,
            },
            {
              accuracy: 10,
              latitude: 37.567,
              longitude: 126.979,
              timestamp: 2000,
            },
            {
              accuracy: 10,
              latitude: 37.568,
              longitude: 126.98,
              timestamp: 3000,
            },
          ],
          savedAt: '2026-06-21T00:00:00.000Z',
        },
        {
          distanceM: 3200,
          elapsedMs: 1500000,
          id: 'run-2',
          memo: '',
          pace: '7:49 /km',
          routePointCount: 0,
          savedAt: '2026-05-12T00:00:00.000Z',
        },
      ]),
    )

    renderApp()

    fireEvent.click(screen.getByRole('button', { name: '기록' }))

    expect(screen.getByLabelText('러닝 경로 간단 시각화')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '메모 있음' }))

    expect(screen.getByText('한강 다리 옆')).toBeInTheDocument()
    expect(screen.queryByText('3.20 km')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '전체' }))
    fireEvent.change(screen.getByLabelText('월별 기록 필터'), {
      target: { value: '2026-05' },
    })

    expect(screen.getAllByText('3.20 km').length).toBeGreaterThan(0)
    expect(screen.queryByText('1.20 km')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('월별 기록 필터'), {
      target: { value: 'all' },
    })
    fireEvent.change(screen.getByLabelText('러닝 기록 정렬'), {
      target: { value: 'distance' },
    })

    const recordList = screen.getByLabelText('러닝 기록 목록')
    const firstRecord = within(recordList).getAllByRole('button')[0]

    expect(firstRecord).toHaveTextContent('3.20 km')
  })

  it('tracks running location points while the screen is active', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(localFacilityPayload), { status: 200 }),
    )
    const clearWatch = vi.fn()
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: 37.5665,
          longitude: 126.978,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: 1000,
        toJSON: () => ({}),
      })
    })
    const watchPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          accuracy: 12,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: 37.5665,
          longitude: 126.978,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: 1000,
        toJSON: () => ({}),
      })
      success({
        coords: {
          accuracy: 12,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: 37.5675,
          longitude: 126.978,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: 2000,
        toJSON: () => ({}),
      })

      return 24
    })

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: { clearWatch, getCurrentPosition, watchPosition },
    })

    renderApp()

    fireEvent.click(screen.getByRole('button', { name: '러닝 시작' }))

    expect(watchPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      },
    )
    expect(
      await screen.findByText('화면이 켜진 동안 GPS 포인트 2개를 기록하고 있어요.'),
    ).toBeInTheDocument()
    expect(await screen.findByText('0.11 km')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '일시정지' }))

    expect(clearWatch).toHaveBeenCalledWith(24)
    expect(
      screen.getByText('위치 추적을 잠시 멈췄어요. 현재 2개 포인트가 있어요.'),
    ).toBeInTheDocument()
  })

  it('shows local profile, record summary, and settings on My page', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(localFacilityPayload), { status: 200 }),
    )

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    })
    window.localStorage.setItem(
      'polling-in-run.records.v1',
      JSON.stringify([
        {
          distanceM: 1200,
          elapsedMs: 360000,
          id: 'run-1',
          memo: '요약용 기록',
          pace: '5:00 /km',
          routePointCount: 12,
          savedAt: '2026-06-21T00:00:00.000Z',
        },
        {
          distanceM: 3000,
          elapsedMs: 1200000,
          id: 'run-2',
          memo: '긴 기록',
          pace: '6:40 /km',
          routePointCount: 30,
          savedAt: '2026-06-05T00:00:00.000Z',
        },
      ]),
    )

    renderApp()

    fireEvent.click(screen.getByRole('button', { name: '마이' }))

    expect(screen.getByText('내 iPhone에 저장하는 러닝 노트')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Solo Runner' })).toBeInTheDocument()
    expect(screen.getByText('총 러닝 횟수')).toBeInTheDocument()
    expect(screen.getByText('2개')).toBeInTheDocument()
    expect(screen.getByText('총 뛴 거리')).toBeInTheDocument()
    expect(screen.getAllByText('4.20 km').length).toBeGreaterThan(0)
    expect(screen.getByText('최장 러닝')).toBeInTheDocument()
    expect(screen.getByText('3.00 km')).toBeInTheDocument()
    expect(screen.getByText('목표 설정과 진행률')).toBeInTheDocument()
    expect(screen.getByText('D3 최근 4개월 거리')).toBeInTheDocument()
    expect(screen.getByText('D3 목표 대비 비교')).toBeInTheDocument()
    expect(screen.getByText('이번 달 러닝 날짜')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('주간 목표'), {
      target: { value: '15' },
    })

    expect(window.localStorage.getItem('polling-in-run.goals.v1')).toContain(
      '"weeklyDistanceKm":15',
    )
    expect(screen.getByText('지도 전략')).toBeInTheDocument()
    expect(screen.getByText('적용됨')).toBeInTheDocument()
    expect(screen.getByText('시설 데이터')).toBeInTheDocument()
    expect(screen.getByText('1차 완료')).toBeInTheDocument()
    expect(screen.getByText('로그인과 동기화')).toBeInTheDocument()
  })
})
