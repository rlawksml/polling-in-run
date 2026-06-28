import { registerPlugin } from '@capacitor/core'
import type { Facility } from '../api/facilities'

export type NativeMapFacility = Pick<
  Facility,
  'address' | 'id' | 'latitude' | 'longitude' | 'name' | 'type'
>

export type NativeMapTouchArea = {
  height: number
  width: number
  x: number
  y: number
}

export type NativeMapRoutePoint = {
  latitude: number
  longitude: number
}

export type NativeMapFrame = {
  height: number
  width: number
  x: number
  y: number
}

type NativeMapPlugin = {
  open(options: {
    center: {
      latitude: number
      longitude: number
    }
    facilities: NativeMapFacility[]
  }): Promise<void>
  recenter(options: {
    center: {
      latitude: number
      longitude: number
    }
  }): Promise<void>
  setTouchAreas(options: {
    areas: NativeMapTouchArea[]
  }): Promise<void>
  showRoutePreview(options: {
    distanceM: number
    frame: NativeMapFrame | null
    points: NativeMapRoutePoint[]
  }): Promise<void>
  sync(options: {
    center: {
      latitude: number
      longitude: number
    }
    facilities: NativeMapFacility[]
  }): Promise<void>
}

export const NativeMap = registerPlugin<NativeMapPlugin>('NativeMap')
