type KakaoLatLng = {
  getLat: () => number
  getLng: () => number
}

type KakaoMap = {
  getBounds: () => kakao.maps.LatLngBounds
  getLevel: () => number
  panTo: (position: KakaoLatLng) => void
  setBounds: (bounds: kakao.maps.LatLngBounds) => void
  setLevel: (level: number) => void
}

declare namespace kakao.maps {
  class LatLng {
    constructor(latitude: number, longitude: number)
    getLat(): number
    getLng(): number
  }

  class Map {
    constructor(
      container: HTMLElement,
      options: {
        center: LatLng
        level: number
      },
    )
    getBounds(): LatLngBounds
    getLevel(): number
    panTo(position: LatLng): void
    setBounds(bounds: LatLngBounds): void
    setLevel(level: number): void
  }

  class LatLngBounds {
    constructor()
    extend(position: LatLng): void
    getNorthEast(): LatLng
    getSouthWest(): LatLng
  }

  class Marker {
    constructor(options: {
      clickable?: boolean
      image?: MarkerImage
      map?: Map
      position: LatLng
      title?: string
    })
    setMap(map: Map | null): void
    setPosition(position: LatLng): void
  }

  class MarkerImage {
    constructor(
      src: string,
      size: Size,
      options?: {
        offset?: Point
      },
    )
  }

  class Size {
    constructor(width: number, height: number)
  }

  class Point {
    constructor(x: number, y: number)
  }

  class MarkerClusterer {
    constructor(options: {
      averageCenter?: boolean
      disableClickZoom?: boolean
      gridSize?: number
      map: Map
      markers?: Marker[]
      minClusterSize?: number
      minLevel?: number
      styles?: Array<Record<string, string>>
    })
    addMarkers(markers: Marker[]): void
    clear(): void
  }

  class CustomOverlay {
    constructor(options: {
      map: Map
      position: LatLng
      content: HTMLElement
      xAnchor?: number
      yAnchor?: number
      zIndex?: number
    })
    setMap(map: Map | null): void
  }

  function load(callback: () => void): void

  namespace event {
    function addListener(
      target: Map | Marker | MarkerClusterer,
      type: string,
      callback: () => void,
    ): void
    function removeListener(
      target: Map | Marker | MarkerClusterer,
      type: string,
      callback: () => void,
    ): void
  }
}

interface Window {
  kakao?: {
    maps: typeof kakao.maps
  }
}
