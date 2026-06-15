export type FacilityType = 'water' | 'restroom'

export type Facility = {
  id: string
  type: FacilityType
  name: string
  latitude: number
  longitude: number
  address: string
  opening_hours: string | null
  source: string
  distance_m: number | null
}

type FacilityQuery = {
  latitude?: number
  longitude?: number
  radiusM?: number
}

export async function getFacilities(
  query: FacilityQuery = {},
): Promise<Facility[]> {
  const searchParams = new URLSearchParams()

  if (query.latitude !== undefined && query.longitude !== undefined) {
    searchParams.set('latitude', String(query.latitude))
    searchParams.set('longitude', String(query.longitude))
    searchParams.set('radius_m', String(query.radiusM ?? 3000))
  }

  const queryString = searchParams.toString()
  const response = await fetch(
    `/api/facilities${queryString ? `?${queryString}` : ''}`,
  )

  if (!response.ok) {
    throw new Error(`Facility request failed: ${response.status}`)
  }

  return response.json() as Promise<Facility[]>
}
