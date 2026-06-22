import { buildApiUrl } from './client'

export type HealthResponse = {
  status: 'ok'
  service: string
  version: string
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(buildApiUrl('/api/health'))

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`)
  }

  return response.json() as Promise<HealthResponse>
}
