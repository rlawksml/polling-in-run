export type FacilityType = 'water' | 'restroom'

export type Facility = {
  id: string
  type: FacilityType
  name: string
  latitude: number
  longitude: number
  address: string
  source_id: string | null
  road_address: string | null
  opening_hours: string | null
  source: string
  details: Record<string, string>
  distance_m: number | null
}

export type FacilityBounds = {
  minLatitude: number
  maxLatitude: number
  minLongitude: number
  maxLongitude: number
}

type FacilityQuery = {
  bounds?: FacilityBounds | null
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

  if (query.bounds) {
    searchParams.set('min_lat', String(query.bounds.minLatitude))
    searchParams.set('max_lat', String(query.bounds.maxLatitude))
    searchParams.set('min_lng', String(query.bounds.minLongitude))
    searchParams.set('max_lng', String(query.bounds.maxLongitude))
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
