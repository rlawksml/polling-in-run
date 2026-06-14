const KAKAO_SDK_ID = 'kakao-maps-sdk'

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

    const handleLoad = () => {
      if (!window.kakao?.maps) {
        reject(new Error('카카오맵 SDK를 초기화하지 못했습니다.'))
        return
      }

      window.kakao.maps.load(() => resolve(window.kakao!.maps))
    }

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true })
      existingScript.addEventListener(
        'error',
        () => reject(new Error('카카오맵 SDK를 불러오지 못했습니다.')),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.id = KAKAO_SDK_ID
    script.async = true
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener(
      'error',
      () => reject(new Error('카카오맵 SDK를 불러오지 못했습니다.')),
      { once: true },
    )
    document.head.appendChild(script)
  })

  sdkPromise = loadingPromise.catch((error: unknown) => {
    sdkPromise = null
    throw error
  })

  return sdkPromise
}
