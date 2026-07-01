import { registerPlugin } from '@capacitor/core'

export type BackgroundLocationPoint = {
  accuracy: number
  latitude: number
  longitude: number
  timestamp: number
}

type BackgroundLocationPlugin = {
  addListener(
    eventName: 'location',
    listenerFunc: (point: BackgroundLocationPoint) => void,
  ): Promise<{ remove: () => Promise<void> }>
  start(): Promise<{ status: string }>
  stop(): Promise<void>
}

export const BackgroundLocation =
  registerPlugin<BackgroundLocationPlugin>('BackgroundLocation')
