import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./components/KakaoMap', () => ({
  KakaoMap: () => <div aria-label="현재 위치와 주변 편의시설 지도" />,
}))

describe('App', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('shows the current location and running actions', async () => {
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

    render(<App />)

    expect(await screen.findByText('현재 위치를 중심으로 지도를 보여드려요.')).toBeInTheDocument()
    expect(screen.getByText('약 12m 정확도')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '러닝 시작' })).toBeInTheDocument()
  })

  it('lets the user retry after denying location permission', async () => {
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

    render(<App />)

    expect(await screen.findByText(/위치 권한이 꺼져 있어요/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(getCurrentPosition).toHaveBeenCalledTimes(2)
  })
})
