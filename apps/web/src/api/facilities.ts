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
}

export async function getFacilities(): Promise<Facility[]> {
  const response = await fetch('/api/facilities')

  if (!response.ok) {
    throw new Error(`Facility request failed: ${response.status}`)
  }

  return response.json() as Promise<Facility[]>
}
