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
    private var routePreviewImageView: UIImageView?
    private var routePreviewSnapshotRequestId = 0

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

        let imageView = routePreviewImageView ?? makeRoutePreviewImageView()
        routePreviewImageView = imageView
        imageView.frame = frame

        if imageView.superview == nil {
            view.addSubview(imageView)
        }

        routePreviewSnapshotRequestId += 1
        let requestId = routePreviewSnapshotRequestId
        let firstPoint = points[0]
        let lastPoint = points[points.count - 1]
        let isStationary = distanceM <= 0 || points.count < 2 || firstPoint.distance(to: lastPoint) < 5
        let options = MKMapSnapshotter.Options()
        options.size = frame.size
        options.scale = UIScreen.main.scale
        options.mapType = .standard
        options.traitCollection = UITraitCollection(userInterfaceStyle: .light)

        if isStationary {
            options.region = MKCoordinateRegion(
                center: firstPoint,
                latitudinalMeters: 220,
                longitudinalMeters: 220
            )
        } else {
            let polyline = MKPolyline(coordinates: points, count: points.count)
            let mapRect = polyline.boundingMapRect
            let paddedMapRect = mapRect.insetBy(
                dx: -max(mapRect.width * 0.22, 80),
                dy: -max(mapRect.height * 0.22, 80)
            )
            options.mapRect = paddedMapRect
        }

        MKMapSnapshotter(options: options).start { [weak self] snapshot, error in
            guard
                let self = self,
                requestId == self.routePreviewSnapshotRequestId,
                let snapshot = snapshot,
                error == nil
            else {
                return
            }

            let image = self.drawRoutePreviewImage(
                snapshot: snapshot,
                points: points,
                isStationary: isStationary
            )

            DispatchQueue.main.async { [weak self] in
                guard requestId == self?.routePreviewSnapshotRequestId else {
                    return
                }

                self?.routePreviewImageView?.image = image
            }
        }
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

    private func makeRoutePreviewImageView() -> UIImageView {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFill
        imageView.isUserInteractionEnabled = false
        imageView.clipsToBounds = true
        imageView.layer.cornerRadius = 14
        imageView.backgroundColor = UIColor.secondarySystemBackground
        return imageView
    }

    private func drawRoutePreviewImage(
        snapshot: MKMapSnapshotter.Snapshot,
        points: [CLLocationCoordinate2D],
        isStationary: Bool
    ) -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: snapshot.image.size)

        return renderer.image { context in
            snapshot.image.draw(at: .zero)

            guard let firstPoint = points.first else {
                return
            }

            if !isStationary && points.count > 1 {
                let routePath = UIBezierPath()
                let firstRoutePoint = snapshot.point(for: firstPoint)
                routePath.move(to: firstRoutePoint)

                points.dropFirst().forEach { coordinate in
                    routePath.addLine(to: snapshot.point(for: coordinate))
                }

                routePath.lineWidth = 5
                routePath.lineCapStyle = .round
                routePath.lineJoinStyle = .round
                UIColor.systemBlue.setStroke()
                routePath.stroke()
            }

            drawRouteMarker(
                at: snapshot.point(for: firstPoint),
                fillColor: isStationary ? UIColor.systemBlue : UIColor.systemGreen
            )

            if !isStationary, let lastPoint = points.last {
                drawRouteMarker(at: snapshot.point(for: lastPoint), fillColor: UIColor.systemOrange)
            }
        }
    }

    private func drawRouteMarker(at point: CGPoint, fillColor: UIColor) {
        let radius: CGFloat = 7
        let rect = CGRect(
            x: point.x - radius,
            y: point.y - radius,
            width: radius * 2,
            height: radius * 2
        )

        UIColor.white.setFill()
        UIBezierPath(ovalIn: rect.insetBy(dx: -2, dy: -2)).fill()
        fillColor.setFill()
        UIBezierPath(ovalIn: rect).fill()
    }

    private func removeRoutePreview() {
        routePreviewSnapshotRequestId += 1
        routePreviewImageView?.removeFromSuperview()
        routePreviewImageView = nil
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
