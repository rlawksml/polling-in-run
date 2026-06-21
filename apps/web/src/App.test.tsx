import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

  it('shows the current location and running actions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(facilityResponse), { status: 200 }),
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
    expect(fetch).toHaveBeenCalledWith(
      '/api/facilities?latitude=37.5665&longitude=126.978&radius_m=3000&min_lat=37.55&max_lat=37.58&min_lng=126.96&max_lng=127',
    )
  })

  it('lets the user retry after denying location permission', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(facilityResponse), { status: 200 }),
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
      new Response(JSON.stringify(facilityResponse), { status: 200 }),
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
      new Response(JSON.stringify(facilityResponse), { status: 200 }),
    )

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    })

    renderApp()

    fireEvent.click(screen.getByRole('button', { name: '러닝 시작' }))

    expect(screen.getByText('러닝 진행 중')).toBeInTheDocument()
    expect(screen.getByText('0.00 km')).toBeInTheDocument()
    expect(screen.getByText('--')).toBeInTheDocument()

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

    expect(screen.getByText(/기록을 로컬에 저장했어요/)).toBeInTheDocument()
    expect(window.localStorage.getItem('polling-in-run.records.v1')).toContain(
      '가볍게 달린 날',
    )

    fireEvent.click(screen.getByRole('button', { name: '홈으로' }))
    expect(screen.getByRole('button', { name: '러닝 시작' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '기록' }))

    expect(screen.getByText('저장한 러닝 기록')).toBeInTheDocument()
    expect(screen.getByLabelText('러닝 기록 목록')).toHaveTextContent('0.00 km')
    expect(screen.getByLabelText('러닝 기록 상세')).toHaveTextContent('가볍게 달린 날')
  })

  it('tracks running location points while the screen is active', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(facilityResponse), { status: 200 }),
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

  it('shows the auth form shell and validates inputs on My page', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(facilityResponse), { status: 200 }),
    )

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    })

    renderApp()

    fireEvent.click(screen.getByRole('button', { name: '마이' }))

    expect(screen.getByText('ID/PW로 기록을 이어갈 준비')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '로그인' })).toBeInTheDocument()
    expect(screen.getByText(/비밀번호 찾기, 이메일 인증, 소셜 로그인/)).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: '로그인' })[1])
    expect(screen.getByText('ID는 4자 이상 입력해주세요.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('ID'), {
      target: { value: 'runner' },
    })
    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: '1234567' },
    })
    fireEvent.click(screen.getAllByRole('button', { name: '로그인' })[1])
    expect(screen.getByText('비밀번호는 8자 이상 입력해주세요.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('비밀번호'), {
      target: { value: '12345678' },
    })
    fireEvent.click(screen.getAllByRole('button', { name: '회원가입' })[0])
    expect(screen.getByRole('heading', { name: '회원가입' })).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호 확인')).toBeInTheDocument()
  })
})
