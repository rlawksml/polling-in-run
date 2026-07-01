# Apple MapKit Native 구현 경로

## 목적

Capacitor iPhone 앱에서 Kakao Maps JavaScript SDK의 WebView origin 제약을 피하고, Apple 생태계에 맞는 네이티브 지도 경험을 제공한다.

## 결론

Polling In Run의 iPhone 지도 전략은 **홈 화면의 Kakao Maps 영역을 Apple MapKit native 배경 지도로 대체하는 방식**을 1차 구현 경로로 둔다.

처음 실험에서는 별도 네이티브 지도 화면을 열었지만, 실제 목표는 홈 화면에서 바로 지도를 보는 경험이다. 따라서 `MKMapView`를 Capacitor WebView 아래에 깔고 React UI를 overlay로 얹는다.

```text
iOS Home
├─ Swift MainViewController
│  └─ MKMapView background
└─ React WebView overlay
   ├─ local-first facilities.json 조회
   ├─ 현재 위치와 시설 목록 준비
   └─ NativeMap.sync(...)
      ├─ 현재 위치 중심 이동
      └─ 음수대/화장실 annotation 반영
```

## 왜 embedded native map인가

### 장점

- 홈 화면에서 카카오맵 에러 대신 Apple 지도 자체를 볼 수 있다.
- Kakao Maps JavaScript SDK가 Capacitor의 `capacitor://localhost` origin에서 도메인 검증 문제를 일으키는 상황을 피할 수 있다.
- iPhone local-first 프로토타입에서는 별도 지도 API 키와 billing 설정 없이 iOS 기본 지도 기능을 먼저 검증할 수 있다.
- 현재 위치, 지도 드래그, 핀치 줌, annotation 표시가 iOS 앱 환경과 자연스럽게 맞는다.
- React 지도 영역과 Swift 지도 영역의 책임이 명확하다.
- local-first JSON으로 이미 정규화된 시설 데이터를 그대로 넘길 수 있다.

### 단점

- WebView가 native map 위에 올라가므로 지도 드래그, 줌, annotation 터치 전달은 별도 처리가 필요하다.
- React 상태와 native map 상태를 동기화하는 경계가 생긴다.
- 웹과 iOS 앱에서 지도 구현이 갈라져 유지보수 비용이 늘어난다.

## 구현 단계

### 1단계. Embedded native map MVP

목표는 iPhone 홈 화면에서 카카오맵 대신 네이티브 Apple 지도가 보이고, 현재 위치와 일부 시설 마커가 보이는지 확인하는 것이다.

- Swift `MainViewController`에 `MKMapView`를 WebView 아래 배치한다.
- WebView 배경을 투명하게 만들어 React UI 아래로 지도가 보이게 한다.
- 현재 위치 표시를 켠다.
- React에서 넘긴 시설 배열을 annotation으로 표시한다.
- annotation 선택 시 시설명과 주소를 보여준다.

### 2단계. Capacitor plugin bridge

React에서 호출할 최소 API는 하나로 시작한다.

```ts
type NativeMapFacility = {
  id: string
  type: 'water' | 'restroom'
  name: string
  latitude: number
  longitude: number
  address: string
}

NativeMap.sync({
  center: {
    latitude: number
    longitude: number
  },
  facilities: NativeMapFacility[]
})
```

Swift 쪽에서는 Capacitor plugin method `sync`를 만들고, `CAPPluginCall`에서 `center`와 `facilities`를 읽어 `MainViewController`의 embedded `MKMapView`에 반영한다.

### 3단계. 시설 데이터 제한

처음부터 6,477건 전체를 native 화면에 넘기지 않는다.

- React에서 현재 지도 영역 또는 현재 위치 반경 기준으로 이미 필터링된 시설만 넘긴다.
- 1차 제한은 최대 100~300개 정도로 둔다.
- 성능이 괜찮으면 annotation clustering을 검토한다.

### 4단계. 길찾기

앱 내부 길찾기는 구현하지 않는다.

- annotation 상세에서 외부 Apple Maps URL 또는 Kakao Maps URL을 연다.
- 비용과 구현 범위를 줄인다.
- 나중에 앱 내부 route overlay가 필요해지면 MapKit directions를 검토한다.

## Swift 구조 초안

Xcode에서 Swift 파일을 추가할 때 아래 구조로 시작한다.

```swift
import UIKit
import MapKit

struct NativeMapFacility {
    let id: String
    let type: String
    let name: String
    let latitude: Double
    let longitude: Double
    let address: String
}

final class MainViewController: CAPBridgeViewController {
    private let embeddedMapView = MKMapView()

    override func capacitorDidLoad() {
        super.capacitorDidLoad()

        installEmbeddedMap()
        bridge?.registerPluginInstance(NativeMapPlugin())
    }

    func updateNativeMap(center: CLLocationCoordinate2D, facilities: [NativeMapFacility]) {
        let region = MKCoordinateRegion(
            center: center,
            latitudinalMeters: 3000,
            longitudinalMeters: 3000
        )
        embeddedMapView.setRegion(region, animated: false)

        // Existing facility annotations are replaced by the latest React state.
        embeddedMapView.addAnnotations(facilities.map { FacilityAnnotation(facility: $0) })
    }
}
```

## JavaScript 연결 초안

```ts
import { registerPlugin } from '@capacitor/core'

type NativeMapPlugin = {
  sync(options: {
    center: {
      latitude: number
      longitude: number
    }
    facilities: NativeMapFacility[]
  }): Promise<void>
}

export const NativeMap = registerPlugin<NativeMapPlugin>('NativeMap')
```

## 현재 결정

- 웹 MVP는 Kakao Maps를 유지한다.
- iPhone 앱은 Apple MapKit native 지도를 홈 화면 배경으로 깔아 검증한다.
- 시설 데이터는 `facilities.json`에서 필터링한 결과만 native로 넘긴다.
- 내장 길찾기는 보류하고 외부 지도 앱 연동을 유지한다.

## 구현 상태

- `NativeMapPlugin.swift`를 추가해 React에서 `NativeMap.sync(...)`을 호출할 수 있게 했다.
- 별도 `NativeMapViewController`는 초기 실험용으로 남아 있지만, 홈 화면 지도 대체의 핵심은 `MainViewController`의 embedded `MKMapView`다.
- `MainViewController.swift`에서 `CAPBridgeViewController.capacitorDidLoad()` 시점에 `NativeMapPlugin`을 명시 등록한다.
- `MainViewController.swift`에서 `MKMapView`를 WebView 아래에 깔고, React의 `NativeMap.sync(...)` 호출로 현재 위치와 시설 annotation을 동기화한다.
- embedded native map은 현재 위치 표시와 음수대/화장실 annotation을 제공한다.
- 현재 위치 annotation은 기본 파란 점 대신 `figure.run.circle.fill` SF Symbol을 사용해 러닝 중 내 위치를 더 명확하게 표시한다.
- React 홈 화면에서는 iOS native platform일 때 KakaoMap 컴포넌트를 렌더링하지 않고 Apple MapKit 배경 지도를 사용한다.
- React는 현재 표시 중인 시설을 최대 300개까지만 native 화면으로 넘긴다.
- React는 `NativeMap.setTouchAreas(...)`로 버튼, 카드, 탭바의 viewport 좌표를 Swift에 넘긴다.
- Swift `PassthroughWebView`는 해당 좌표 안에서는 WebView 터치를 유지하고, 그 밖의 영역은 embedded `MKMapView`가 드래그와 핀치 줌을 받을 수 있게 넘긴다.
- 기록 상세에서는 React가 저장된 GPS 포인트를 `NativeMap.createRouteSnapshot(...)`으로 넘긴다.
- Swift는 `MKMapSnapshotter`로 Apple 지도 이미지를 만들고, 저장된 GPS 경로와 시작·종료 마커, km 라벨을 그린 PNG data URL을 React로 반환한다.
- React는 이 이미지를 카드 내부 `img`로 표시하므로 native view가 기록 콘텐츠 밖으로 빠져나가지 않는다.
- Xcode simulator build 기준으로 Swift 컴파일과 앱 빌드를 통과했다.

## 남은 확인

- 실제 iPhone 홈 화면에서 Apple MapKit 지도가 카카오맵 대신 보이는지 확인한다.
- 위치 권한 허용 후 현재 위치 표시가 자연스러운지 확인한다.
- annotation 개수가 많을 때 실기기 성능이 괜찮은지 확인하고 clustering 필요 여부를 결정한다.
- 홈 화면의 빈 지도 영역에서 드래그, 핀치 줌, annotation 터치가 자연스럽게 동작하는지 확인한다.
- WebView overlay와 native map을 함께 쓰는 방식이 계속 불안정하면 주요 홈 UI까지 native overlay로 옮길지 결정한다.
