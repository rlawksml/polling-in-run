import { buildApiUrl } from './client'

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

type LocalFacilityPayload = {
  count: number
  facilities: Facility[]
  generated_at: string
}

const LOCAL_FACILITIES_URL = '/data/facilities.json'
const EARTH_RADIUS_M = 6371000

function toRadians(degrees: number) {
  return degrees * (Math.PI / 180)
}

function calculateDistanceM(
  originLatitude: number,
  originLongitude: number,
  destinationLatitude: number,
  destinationLongitude: number,
) {
  const latitudeDelta = toRadians(destinationLatitude - originLatitude)
  const longitudeDelta = toRadians(destinationLongitude - originLongitude)
  const originLatitudeRad = toRadians(originLatitude)
  const destinationLatitudeRad = toRadians(destinationLatitude)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitudeRad) *
      Math.cos(destinationLatitudeRad) *
      Math.sin(longitudeDelta / 2) ** 2

  return Math.round(EARTH_RADIUS_M * 2 * Math.asin(Math.sqrt(haversine)))
}

function isInsideBounds(facility: Facility, bounds?: FacilityBounds | null) {
  if (!bounds) {
    return true
  }

  return (
    bounds.minLatitude <= facility.latitude &&
    facility.latitude <= bounds.maxLatitude &&
    bounds.minLongitude <= facility.longitude &&
    facility.longitude <= bounds.maxLongitude
  )
}

function applyLocalFacilityQuery(facilities: Facility[], query: FacilityQuery) {
  const hasBounds = query.bounds !== undefined && query.bounds !== null
  const boundedFacilities = facilities.filter((facility) =>
    isInsideBounds(facility, query.bounds),
  )

  if (query.latitude === undefined || query.longitude === undefined) {
    return boundedFacilities
  }

  const facilitiesWithDistance = boundedFacilities
    .map((facility) => ({
      ...facility,
      distance_m: calculateDistanceM(
        query.latitude!,
        query.longitude!,
        facility.latitude,
        facility.longitude,
      ),
    }))
    .sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0))

  if (hasBounds) {
    return facilitiesWithDistance
  }

  const radiusM = query.radiusM ?? 3000

  return facilitiesWithDistance.filter((facility) => facility.distance_m <= radiusM)
}

async function getLocalFacilities(query: FacilityQuery) {
  const response = await fetch(LOCAL_FACILITIES_URL)

  if (!response.ok) {
    throw new Error(`Local facility request failed: ${response.status}`)
  }

  const payload = (await response.json()) as LocalFacilityPayload

  return applyLocalFacilityQuery(payload.facilities, query)
}

async function getApiFacilities(query: FacilityQuery) {
  const searchParams = new URLSearchParams()

  if (query.latitude !== undefined && query.longitude !== undefined) {
    searchParams.set('latitude', String(query.latitude))
    searchParams.set('longitude', String(query.longitude))

    if (!query.bounds) {
      searchParams.set('radius_m', String(query.radiusM ?? 3000))
    }
  }

  if (query.bounds) {
    searchParams.set('min_lat', String(query.bounds.minLatitude))
    searchParams.set('max_lat', String(query.bounds.maxLatitude))
    searchParams.set('min_lng', String(query.bounds.minLongitude))
    searchParams.set('max_lng', String(query.bounds.maxLongitude))
  }

  const queryString = searchParams.toString()
  const response = await fetch(
    buildApiUrl(`/api/facilities${queryString ? `?${queryString}` : ''}`),
  )

  if (!response.ok) {
    throw new Error(`Facility request failed: ${response.status}`)
  }

  return response.json() as Promise<Facility[]>
}

export async function getFacilities(
  query: FacilityQuery = {},
): Promise<Facility[]> {
  try {
    return await getLocalFacilities(query)
  } catch {
    return getApiFacilities(query)
  }
}
