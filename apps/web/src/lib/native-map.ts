import { registerPlugin } from '@capacitor/core'
import type { Facility } from '../api/facilities'

export type NativeMapFacility = Pick<
  Facility,
  'address' | 'id' | 'latitude' | 'longitude' | 'name' | 'type'
>

type NativeMapPlugin = {
  open(options: {
    center: {
      latitude: number
      longitude: number
    }
    facilities: NativeMapFacility[]
  }): Promise<void>
}

export const NativeMap = registerPlugin<NativeMapPlugin>('NativeMap')
