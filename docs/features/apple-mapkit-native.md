# Apple MapKit Native 구현 경로

## 목적

Capacitor iPhone 앱에서 Kakao Maps JavaScript SDK의 WebView origin 제약을 피하고, Apple 생태계에 맞는 네이티브 지도 경험을 제공한다.

## 결론

Polling In Run의 iPhone 지도 전략은 **Apple MapKit native 화면을 Capacitor에서 호출하는 방식**을 1차 구현 경로로 둔다.

처음부터 React 화면 안에 `MKMapView`를 끼워 넣기보다, 네이티브 지도 화면을 별도로 열고 닫는 방식이 더 안전하다.

```text
React Home
├─ local-first facilities.json 조회
├─ 현재 위치와 시설 목록 준비
└─ NativeMap.open(...)
   └─ iOS Swift 화면
      ├─ MKMapView
      ├─ 현재 위치
      ├─ 음수대/화장실 annotation
      └─ 외부 지도 앱 길찾기
```

## 왜 별도 네이티브 화면인가

### 장점

- Capacitor WebView와 native view layering 문제를 피할 수 있다.
- React 지도 영역과 Swift 지도 영역의 책임이 명확하다.
- 첫 구현에서 Xcode 디버깅 범위가 작다.
- local-first JSON으로 이미 정규화된 시설 데이터를 그대로 넘길 수 있다.

### 단점

- 홈 화면 안에 지도와 카드가 한 화면에 섞이는 UX는 바로 구현하기 어렵다.
- Swift 화면 UI를 별도로 만들어야 한다.
- React 상태와 native 화면 상태를 동기화하는 경계가 생긴다.

## 구현 단계

### 1단계. Native map screen MVP

목표는 iPhone 앱에서 네이티브 지도가 뜨고, 현재 위치와 일부 시설 마커가 보이는지 확인하는 것이다.

- Swift에 `NativeMapViewController`를 만든다.
- `MKMapView`를 전체 화면으로 배치한다.
- 현재 위치 표시를 켠다.
- React에서 넘긴 시설 배열을 `MKPointAnnotation`으로 표시한다.
- 닫기 버튼을 제공한다.
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

NativeMap.open({
  center: {
    latitude: number
    longitude: number
  },
  facilities: NativeMapFacility[]
})
```

Swift 쪽에서는 Capacitor plugin method `open`을 만들고, `CAPPluginCall`에서 `center`와 `facilities`를 읽어 `NativeMapViewController`를 present한다.

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

## Swift 초안

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

final class NativeMapViewController: UIViewController {
    private let mapView = MKMapView()
    private let center: CLLocationCoordinate2D
    private let facilities: [NativeMapFacility]

    init(center: CLLocationCoordinate2D, facilities: [NativeMapFacility]) {
        self.center = center
        self.facilities = facilities
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground

        mapView.frame = view.bounds
        mapView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        mapView.showsUserLocation = true
        view.addSubview(mapView)

        let region = MKCoordinateRegion(
            center: center,
            latitudinalMeters: 3000,
            longitudinalMeters: 3000
        )
        mapView.setRegion(region, animated: false)

        let annotations = facilities.map { facility in
            let annotation = MKPointAnnotation()
            annotation.title = facility.name
            annotation.subtitle = facility.address
            annotation.coordinate = CLLocationCoordinate2D(
                latitude: facility.latitude,
                longitude: facility.longitude
            )
            return annotation
        }
        mapView.addAnnotations(annotations)
    }
}
```

## JavaScript 연결 초안

```ts
import { registerPlugin } from '@capacitor/core'

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
```

## 현재 결정

- 웹 MVP는 Kakao Maps를 유지한다.
- iPhone 앱은 Apple MapKit native 화면을 별도로 열어 검증한다.
- 시설 데이터는 `facilities.json`에서 필터링한 결과만 native로 넘긴다.
- 내장 길찾기는 보류하고 외부 지도 앱 연동을 유지한다.

## 남은 확인

- Xcode에서 Capacitor plugin 파일을 프로젝트에 안전하게 추가하는 방법
- Swift 화면 present 방식
- annotation clustering 필요 여부
- native 화면과 React 화면 간 닫기/선택 이벤트 전달 필요 여부
- 실제 iPhone에서 로컬 JSON 필터링 후 native 전달 성능
