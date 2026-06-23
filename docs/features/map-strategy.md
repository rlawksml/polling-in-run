# 지도 전략

## 배경

웹 MVP에서는 Kakao Maps JavaScript SDK로 지도, 현재 위치, 시설 마커, 클러스터링, 외부 길찾기를 구현했다.

하지만 Capacitor 정적 iPhone 앱은 기본적으로 `capacitor://localhost` origin에서 실행된다. Kakao Maps JavaScript SDK는 Web 플랫폼 도메인 검증을 사용하므로 이 origin에서 안정적으로 동작하지 않았다. 개발용으로 Vite 서버 URL을 직접 로드하면 우회할 수 있지만, 이것은 실사용 앱 전략이 아니라 디버깅 전략이다.

따라서 local-first iPhone prototype에서는 iPhone 앱에 맞는 지도 전략을 다시 선택해야 한다.

## 판단 기준

- 내 iPhone에서만 안정적으로 동작할 것
- 운영 비용과 계정 관리를 최소화할 것
- 현재 위치와 시설 마커 표시가 가능할 것
- 길찾기는 앱 내부 구현보다 외부 지도 앱 연동을 우선할 것
- React WebView 구현 부담과 native 구현 부담을 분리해서 볼 것

## 후보 비교

| 후보 | 장점 | 단점 | 판단 |
|---|---|---|---|
| Apple MapKit native | iPhone 앱과 가장 자연스럽고, 위치 권한·마커·지도 UX가 Apple 생태계와 잘 맞는다. | React WebView 안에 바로 넣기 어렵고 Capacitor native bridge 또는 Swift 구현이 필요하다. | 1차 후보 |
| Apple MapKit JS | Apple Maps를 웹 기술로 사용할 수 있고 무료 일일 한도가 크다. | JWT 인증과 Apple Developer Program 기반 설정이 필요하고, WebView 통합 검증이 필요하다. | 보조 후보 |
| Google Maps SDK for iOS | 문서와 기능이 풍부하고 마커·폴리라인·지도 제어가 안정적이다. | Google Cloud 프로젝트와 billing 설정이 필요하다. 리소스 최소화 방향과 덜 맞는다. | 보류 |
| Leaflet + OpenStreetMap | React/WebView와 잘 맞고 구현이 빠르다. | 공개 OSM 타일 정책을 지켜야 하며, iPhone 앱다운 위치 권한·지도 경험은 약하다. | 실험 후보 |
| 외부 지도 앱 연동 | 비용과 구현 부담이 가장 적고 길찾기 책임을 줄인다. | 앱 안의 지도 경험은 약해진다. | 단기 유지 |

## 결정

현재 결정은 다음과 같다.

1. 웹 MVP는 당분간 Kakao Maps JavaScript SDK를 유지한다.
2. iPhone local-first 앱의 1차 지도 후보는 Apple MapKit native로 둔다.
3. 앱 내부 길찾기는 구현하지 않고 Apple Maps, Kakao Maps, Google Maps 같은 외부 지도 앱 연동을 우선한다.
4. Google Maps SDK for iOS는 기능은 좋지만 billing/API key 관리가 필요하므로 현재 MVP에서는 보류한다.
5. Leaflet + OpenStreetMap은 빠른 WebView 실험 후보로 남기되, 공개 타일 정책과 앱 품질을 확인한 뒤 사용한다.

## 구현 경로

- Capacitor에서 Apple MapKit native 화면을 별도로 열어 붙이는 경로를 1차 구현안으로 둔다.
- React는 local-first `facilities.json`에서 현재 위치와 지도 영역 기준으로 시설을 필터링한다.
- Native Map 화면에는 현재 위치와 제한된 시설 배열만 넘긴다.
- 처음부터 WebView 안에 native map을 끼워 넣지 않고, Swift `UIViewController`를 present하는 방식으로 시작한다.

상세 구현 경로는 [`Apple MapKit Native 구현 경로`](./apple-mapkit-native.md)에 정리한다.

## 다음 작업

- Xcode에서 `NativeMap` Capacitor plugin 파일을 안전하게 추가한다.
- Swift `NativeMapViewController`에서 `MKMapView`와 annotation 표시를 검증한다.
- native bridge가 과하면 단기적으로 외부 지도 앱 연동과 시설 리스트/카드 중심 UX를 유지한다.
- 시설 데이터 local-first JSON 구조는 완료했으므로 지도 제공자가 바뀌어도 마커 데이터 모델은 유지한다.

## 근거

- Apple은 MapKit으로 앱에 Apple Maps를 로드하고 annotation, overlay, search, directions 등을 제공한다고 설명한다.
- Apple MapKit JS는 웹에서 interactive maps를 제공하며, Apple Developer Program membership 기준 무료 일일 한도를 제공한다.
- Google Maps SDK for iOS는 Google Cloud billing account와 SDK 활성화가 필요하다.
- OpenStreetMap 공개 타일은 무료 CDN이 아니므로 앱에서 사용할 때 정책과 부하 제한을 지켜야 한다.
