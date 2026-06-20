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
    expect(screen.getByText('오늘의 러닝을 저장할까요?')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '홈으로' }))
    expect(screen.getByRole('button', { name: '러닝 시작' })).toBeInTheDocument()
  })
})
