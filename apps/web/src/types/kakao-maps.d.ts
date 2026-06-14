type KakaoLatLng = {
  getLat: () => number
  getLng: () => number
}

type KakaoMap = {
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
    getLevel(): number
    panTo(position: LatLng): void
    setBounds(bounds: LatLngBounds): void
    setLevel(level: number): void
  }

  class LatLngBounds {
    constructor()
    extend(position: LatLng): void
  }

  class Marker {
    constructor(options: {
      map: Map
      position: LatLng
    })
    setMap(map: Map | null): void
    setPosition(position: LatLng): void
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
}

interface Window {
  kakao?: {
    maps: typeof kakao.maps
  }
}
