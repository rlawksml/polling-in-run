const KAKAO_SDK_ID = 'kakao-maps-sdk'
const KAKAO_SDK_TIMEOUT_MS = 8000

let sdkPromise: Promise<typeof kakao.maps> | null = null

function getKakaoMapDebugContext() {
  return `현재 앱 주소: ${window.location.origin || window.location.href}`
}

function isKakaoMapsReady() {
  const maps = window.kakao?.maps

  return Boolean(maps?.LatLng && maps.Map && maps.LatLngBounds)
}

function canLoadKakaoMaps() {
  return typeof window.kakao?.maps?.load === 'function'
}

function createKakaoMapError(message: string) {
  return new Error(`${message} ${getKakaoMapDebugContext()}`)
}

export function loadKakaoMaps(): Promise<typeof kakao.maps> {
  if (isKakaoMapsReady()) {
    return Promise.resolve(window.kakao!.maps)
  }

  const appKey = import.meta.env.VITE_KAKAO_MAP_KEY

  if (!appKey) {
    return Promise.reject(
      createKakaoMapError('VITE_KAKAO_MAP_KEY가 설정되지 않았습니다.'),
    )
  }

  if (sdkPromise) {
    return sdkPromise
  }

  const loadingPromise = new Promise<typeof kakao.maps>((resolve, reject) => {
    const existingScript = document.getElementById(
      KAKAO_SDK_ID,
    ) as HTMLScriptElement | null
    const timeoutId = window.setTimeout(() => {
      reject(
        createKakaoMapError(
          '카카오맵 SDK 응답이 지연되고 있습니다. Kakao Developers의 Web 플랫폼 도메인에 현재 접속 주소가 등록되어 있는지 확인해주세요.',
        ),
      )
    }, KAKAO_SDK_TIMEOUT_MS)

    const resolveWhenReady = () => {
      if (isKakaoMapsReady()) {
        window.clearTimeout(timeoutId)
        resolve(window.kakao!.maps)
        return
      }

      if (!canLoadKakaoMaps()) {
        window.clearTimeout(timeoutId)
        reject(createKakaoMapError('카카오맵 SDK를 초기화하지 못했습니다.'))
        return
      }

      window.kakao!.maps.load(() => {
        if (isKakaoMapsReady()) {
          window.clearTimeout(timeoutId)
          resolve(window.kakao!.maps)
          return
        }

        window.clearTimeout(timeoutId)
        reject(
          createKakaoMapError(
            '카카오맵 SDK는 로드됐지만 지도 생성자가 준비되지 않았습니다.',
          ),
        )
      })
    }

    const handleError = () => {
      window.clearTimeout(timeoutId)
      reject(createKakaoMapError('카카오맵 SDK를 불러오지 못했습니다.'))
    }

    if (existingScript) {
      if (isKakaoMapsReady() || canLoadKakaoMaps()) {
        resolveWhenReady()
        return
      }

      existingScript.addEventListener('load', resolveWhenReady, { once: true })
      existingScript.addEventListener('error', handleError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = KAKAO_SDK_ID
    script.async = true
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=clusterer`
    script.addEventListener('load', resolveWhenReady, { once: true })
    script.addEventListener('error', handleError, { once: true })
    document.head.appendChild(script)
  })

  sdkPromise = loadingPromise.catch((error: unknown) => {
    sdkPromise = null
    throw error
  })

  return sdkPromise
}
