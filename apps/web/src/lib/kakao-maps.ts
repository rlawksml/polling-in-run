const KAKAO_SDK_ID = 'kakao-maps-sdk'
const KAKAO_SDK_TIMEOUT_MS = 8000

let sdkPromise: Promise<typeof kakao.maps> | null = null

export function loadKakaoMaps(): Promise<typeof kakao.maps> {
  if (window.kakao?.maps) {
    return Promise.resolve(window.kakao.maps)
  }

  const appKey = import.meta.env.VITE_KAKAO_MAP_KEY

  if (!appKey) {
    return Promise.reject(
      new Error('VITE_KAKAO_MAP_KEY가 설정되지 않았습니다.'),
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
        new Error(
          '카카오맵 SDK 응답이 지연되고 있습니다. Kakao Developers의 Web 플랫폼 도메인에 현재 접속 주소가 등록되어 있는지 확인해주세요.',
        ),
      )
    }, KAKAO_SDK_TIMEOUT_MS)

    const handleLoad = () => {
      if (!window.kakao?.maps) {
        window.clearTimeout(timeoutId)
        reject(new Error('카카오맵 SDK를 초기화하지 못했습니다.'))
        return
      }

      window.kakao.maps.load(() => {
        window.clearTimeout(timeoutId)
        resolve(window.kakao!.maps)
      })
    }

    const handleError = () => {
      window.clearTimeout(timeoutId)
      reject(new Error('카카오맵 SDK를 불러오지 못했습니다.'))
    }

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true })
      existingScript.addEventListener('error', handleError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = KAKAO_SDK_ID
    script.async = true
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=clusterer`
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    document.head.appendChild(script)
  })

  sdkPromise = loadingPromise.catch((error: unknown) => {
    sdkPromise = null
    throw error
  })

  return sdkPromise
}
