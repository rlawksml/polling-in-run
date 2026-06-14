type KakaoLatLng = {
  getLat: () => number
  getLng: () => number
}

type KakaoMap = {
  panTo: (position: KakaoLatLng) => void
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
    panTo(position: LatLng): void
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
