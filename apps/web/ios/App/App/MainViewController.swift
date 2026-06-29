import Capacitor
import MapKit
import UIKit
import WebKit

final class PassthroughWebView: WKWebView {
    var interactiveRects: [CGRect] = []

    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        guard !interactiveRects.isEmpty else {
            return super.hitTest(point, with: event)
        }

        let touchSlop: CGFloat = 8
        let isInteractivePoint = interactiveRects.contains {
            $0.insetBy(dx: -touchSlop, dy: -touchSlop).contains(point)
        }

        return isInteractivePoint ? super.hitTest(point, with: event) : nil
    }
}

final class MainViewController: CAPBridgeViewController, MKMapViewDelegate {
    private let embeddedMapView = MKMapView()
    private var hasSetInitialEmbeddedRegion = false
    private var routePreviewMapView: MKMapView?

    override func capacitorDidLoad() {
        super.capacitorDidLoad()

        installEmbeddedMap()
        bridge?.registerPluginInstance(NativeMapPlugin())
    }

    func updateNativeMap(center: CLLocationCoordinate2D, facilities: [NativeMapFacility]) {
        if !hasSetInitialEmbeddedRegion {
            let region = MKCoordinateRegion(
                center: center,
                latitudinalMeters: 3000,
                longitudinalMeters: 3000
            )
            embeddedMapView.setRegion(region, animated: false)
            hasSetInitialEmbeddedRegion = true
        }

        let facilityAnnotations = embeddedMapView.annotations.compactMap {
            $0 as? FacilityAnnotation
        }
        embeddedMapView.removeAnnotations(facilityAnnotations)
        embeddedMapView.addAnnotations(
            facilities.map { FacilityAnnotation(facility: $0) }
        )
    }

    func recenterNativeMap(center: CLLocationCoordinate2D) {
        embeddedMapView.setCenter(center, animated: true)
        hasSetInitialEmbeddedRegion = true
    }

    func currentNativeMapBounds() -> (
        minLatitude: Double,
        maxLatitude: Double,
        minLongitude: Double,
        maxLongitude: Double
    ) {
        let region = embeddedMapView.region
        let halfLatitudeDelta = region.span.latitudeDelta / 2
        let halfLongitudeDelta = region.span.longitudeDelta / 2

        return (
            minLatitude: region.center.latitude - halfLatitudeDelta,
            maxLatitude: region.center.latitude + halfLatitudeDelta,
            minLongitude: region.center.longitude - halfLongitudeDelta,
            maxLongitude: region.center.longitude + halfLongitudeDelta
        )
    }

    func updateNativeTouchAreas(_ areas: [CGRect]) {
        (webView as? PassthroughWebView)?.interactiveRects = areas
    }

    func updateRoutePreview(
        frame: CGRect?,
        points: [CLLocationCoordinate2D],
        distanceM: Double
    ) {
        guard let frame = frame, frame.width > 0, frame.height > 0, !points.isEmpty else {
            removeRoutePreview()
            return
        }

        let mapView = routePreviewMapView ?? makeRoutePreviewMapView()
        routePreviewMapView = mapView
        mapView.frame = frame

        if mapView.superview == nil {
            view.addSubview(mapView)
        }

        mapView.removeOverlays(mapView.overlays)
        mapView.removeAnnotations(mapView.annotations)

        let firstPoint = points[0]
        let lastPoint = points[points.count - 1]
        let isStationary = distanceM <= 0 || points.count < 2 || firstPoint.distance(to: lastPoint) < 5

        if isStationary {
            let annotation = RoutePointAnnotation(coordinate: firstPoint, kind: "stationary")
            mapView.addAnnotation(annotation)
            mapView.setRegion(
                MKCoordinateRegion(
                    center: firstPoint,
                    latitudinalMeters: 220,
                    longitudinalMeters: 220
                ),
                animated: false
            )
            return
        }

        let polyline = MKPolyline(coordinates: points, count: points.count)
        mapView.addOverlay(polyline)
        mapView.addAnnotations([
            RoutePointAnnotation(coordinate: firstPoint, kind: "start"),
            RoutePointAnnotation(coordinate: lastPoint, kind: "end")
        ])
        mapView.setVisibleMapRect(
            polyline.boundingMapRect,
            edgePadding: UIEdgeInsets(top: 26, left: 26, bottom: 26, right: 26),
            animated: false
        )
    }

    private func installEmbeddedMap() {
        guard let webView = webView else {
            return
        }

        let containerView = UIView(frame: webView.frame)
        containerView.autoresizingMask = [.flexibleWidth, .flexibleHeight]

        embeddedMapView.translatesAutoresizingMaskIntoConstraints = false
        embeddedMapView.delegate = self
        embeddedMapView.showsUserLocation = true
        containerView.addSubview(embeddedMapView)

        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        containerView.addSubview(webView)

        view = containerView

        NSLayoutConstraint.activate([
            embeddedMapView.topAnchor.constraint(equalTo: containerView.topAnchor),
            embeddedMapView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
            embeddedMapView.bottomAnchor.constraint(equalTo: containerView.bottomAnchor),
            embeddedMapView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
            webView.topAnchor.constraint(equalTo: containerView.topAnchor),
            webView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: containerView.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor)
        ])
    }

    private func makeRoutePreviewMapView() -> MKMapView {
        let mapView = MKMapView()
        mapView.delegate = self
        mapView.isUserInteractionEnabled = false
        mapView.showsUserLocation = false
        mapView.layer.cornerRadius = 14
        mapView.layer.masksToBounds = true
        mapView.mapType = .standard
        return mapView
    }

    private func removeRoutePreview() {
        routePreviewMapView?.removeFromSuperview()
        routePreviewMapView = nil
    }

    override func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
        PassthroughWebView(frame: frame, configuration: configuration)
    }

    func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
        if let routePointAnnotation = annotation as? RoutePointAnnotation {
            let identifier = "RoutePointAnnotation"
            let annotationView = mapView.dequeueReusableAnnotationView(
                withIdentifier: identifier
            ) as? MKMarkerAnnotationView ?? MKMarkerAnnotationView(
                annotation: annotation,
                reuseIdentifier: identifier
            )

            annotationView.annotation = annotation
            annotationView.canShowCallout = false
            annotationView.clusteringIdentifier = nil

            switch routePointAnnotation.kind {
            case "start":
                annotationView.markerTintColor = UIColor.systemGreen
                annotationView.glyphText = "출"
            case "end":
                annotationView.markerTintColor = UIColor.systemOrange
                annotationView.glyphText = "도"
            default:
                annotationView.markerTintColor = UIColor.systemBlue
                annotationView.glyphText = "•"
            }

            return annotationView
        }

        guard let facilityAnnotation = annotation as? FacilityAnnotation else {
            return nil
        }

        let identifier = "EmbeddedFacilityAnnotation"
        let annotationView = mapView.dequeueReusableAnnotationView(
            withIdentifier: identifier
        ) as? MKMarkerAnnotationView ?? MKMarkerAnnotationView(
            annotation: annotation,
            reuseIdentifier: identifier
        )

        annotationView.annotation = annotation
        annotationView.canShowCallout = true
        annotationView.clusteringIdentifier = "facility"
        annotationView.markerTintColor = facilityAnnotation.facility.type == "water"
            ? UIColor.systemBlue
            : UIColor.darkGray
        annotationView.glyphText = facilityAnnotation.facility.type == "water" ? "물" : "WC"

        return annotationView
    }

    func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
        guard let polyline = overlay as? MKPolyline else {
            return MKOverlayRenderer(overlay: overlay)
        }

        let renderer = MKPolylineRenderer(polyline: polyline)
        renderer.strokeColor = UIColor.systemBlue
        renderer.lineWidth = 5
        renderer.lineCap = .round
        renderer.lineJoin = .round

        return renderer
    }
}

private extension CLLocationCoordinate2D {
    func distance(to coordinate: CLLocationCoordinate2D) -> CLLocationDistance {
        CLLocation(latitude: latitude, longitude: longitude).distance(
            from: CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        )
    }
}
