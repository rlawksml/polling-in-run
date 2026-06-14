import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

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

  it('shows the API connection details', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'ok',
          service: 'polling-in-run-api',
          version: '0.1.0',
        }),
        { status: 200 },
      ),
    )

    renderApp()

    expect(screen.getByText('서버에 연결하는 중')).toBeInTheDocument()
    expect(await screen.findByText('개발 환경 준비 완료')).toBeInTheDocument()
    expect(screen.getByText('polling-in-run-api')).toBeInTheDocument()
  })

  it('shows a retry action when the API is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }))

    renderApp()

    expect(
      await screen.findByText('서버 연결을 확인해주세요', {}, { timeout: 2500 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 연결' })).toBeInTheDocument()
  })
})
