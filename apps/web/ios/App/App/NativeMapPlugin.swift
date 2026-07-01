import Foundation
import CoreGraphics
import CoreLocation
import MapKit
import UIKit
import Capacitor

@objc(BackgroundLocationPlugin)
public class BackgroundLocationPlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    public let identifier = "BackgroundLocationPlugin"
    public let jsName = "BackgroundLocation"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]

    private let locationManager = CLLocationManager()
    private var isTracking = false

    public override func load() {
        locationManager.delegate = self
        locationManager.activityType = .fitness
        locationManager.desiredAccuracy = kCLLocationAccuracyBestForNavigation
        locationManager.distanceFilter = 1
        locationManager.pausesLocationUpdatesAutomatically = false
    }

    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                call.reject("BackgroundLocation plugin is not available")
                return
            }

            guard CLLocationManager.locationServicesEnabled() else {
                call.resolve(["status": "denied"])
                return
            }

            self.isTracking = true
            let status = self.authorizationStatus()

            if status == .notDetermined {
                self.locationManager.requestAlwaysAuthorization()
                call.resolve(["status": "requesting"])
                return
            }

            if status == .authorizedWhenInUse {
                self.locationManager.requestAlwaysAuthorization()
            }

            guard status == .authorizedAlways || status == .authorizedWhenInUse else {
                call.resolve(["status": "denied"])
                return
            }

            self.startUpdatingLocation()
            call.resolve([
                "status": status == .authorizedAlways ? "tracking" : "tracking-limited"
            ])
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.isTracking = false
            self?.locationManager.stopUpdatingLocation()
            call.resolve()
        }
    }

    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        guard isTracking else {
            return
        }

        let status = authorizationStatus()

        if status == .authorizedAlways || status == .authorizedWhenInUse {
            startUpdatingLocation()
        }
    }

    public func locationManager(
        _ manager: CLLocationManager,
        didUpdateLocations locations: [CLLocation]
    ) {
        locations
            .filter { $0.horizontalAccuracy >= 0 }
            .forEach { location in
                notifyListeners("location", data: [
                    "accuracy": location.horizontalAccuracy,
                    "latitude": location.coordinate.latitude,
                    "longitude": location.coordinate.longitude,
                    "timestamp": location.timestamp.timeIntervalSince1970 * 1000
                ])
            }
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        notifyListeners("error", data: [
            "message": error.localizedDescription
        ])
    }

    private func startUpdatingLocation() {
        if Bundle.main.object(forInfoDictionaryKey: "UIBackgroundModes") != nil {
            locationManager.allowsBackgroundLocationUpdates = true
            locationManager.showsBackgroundLocationIndicator = true
        }

        locationManager.startUpdatingLocation()
    }

    private func authorizationStatus() -> CLAuthorizationStatus {
        if #available(iOS 14.0, *) {
            return locationManager.authorizationStatus
        }

        return CLLocationManager.authorizationStatus()
    }
}

@objc(NativeMapPlugin)
public class NativeMapPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeMapPlugin"
    public let jsName = "NativeMap"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getBounds", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "recenter", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setTouchAreas", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "createRouteSnapshot", returnType: CAPPluginReturnPromise)
    ]

    @objc func open(_ call: CAPPluginCall) {
        guard let payload = parseMapPayload(call) else {
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                call.reject("NativeMap plugin is not available")
                return
            }

            let mapViewController = NativeMapViewController(
                center: payload.center,
                facilities: payload.facilities
            )
            mapViewController.modalPresentationStyle = .fullScreen
            self.bridge?.viewController?.present(mapViewController, animated: true) {
                call.resolve()
            }
        }
    }

    @objc func sync(_ call: CAPPluginCall) {
        guard let payload = parseMapPayload(call) else {
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard
                let mainViewController = self?.bridge?.viewController as? MainViewController
            else {
                call.reject("MainViewController is not available")
                return
            }

            mainViewController.updateNativeMap(
                center: payload.center,
                facilities: payload.facilities
            )
            call.resolve()
        }
    }

    @objc func recenter(_ call: CAPPluginCall) {
        guard let center = parseCenter(call) else {
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard
                let mainViewController = self?.bridge?.viewController as? MainViewController
            else {
                call.reject("MainViewController is not available")
                return
            }

            mainViewController.recenterNativeMap(center: center)
            call.resolve()
        }
    }

    @objc func getBounds(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard
                let mainViewController = self?.bridge?.viewController as? MainViewController
            else {
                call.reject("MainViewController is not available")
                return
            }

            let bounds = mainViewController.currentNativeMapBounds()
            call.resolve([
                "minLatitude": bounds.minLatitude,
                "maxLatitude": bounds.maxLatitude,
                "minLongitude": bounds.minLongitude,
                "maxLongitude": bounds.maxLongitude
            ])
        }
    }

    @objc func setTouchAreas(_ call: CAPPluginCall) {
        let areaPayloads = call.getArray("areas", JSObject.self) ?? []
        let areas = areaPayloads.compactMap(parseTouchArea)

        DispatchQueue.main.async { [weak self] in
            guard
                let mainViewController = self?.bridge?.viewController as? MainViewController
            else {
                call.reject("MainViewController is not available")
                return
            }

            mainViewController.updateNativeTouchAreas(areas)
            call.resolve()
        }
    }

    @objc func createRouteSnapshot(_ call: CAPPluginCall) {
        let pointPayloads = call.getArray("points", JSObject.self) ?? []
        let points = pointPayloads.compactMap(parseRoutePoint)
        let width = max(call.getDouble("width") ?? 480, 240)
        let height = max(call.getDouble("height") ?? 240, 160)
        let distanceM = call.getDouble("distanceM") ?? 0

        guard !points.isEmpty else {
            call.reject("points are required")
            return
        }

        let options = makeRouteSnapshotOptions(
            points: points,
            distanceM: distanceM,
            size: CGSize(width: width, height: height)
        )

        MKMapSnapshotter(options: options).start { [weak self] snapshot, error in
            guard let self = self else {
                call.reject("NativeMap plugin is not available")
                return
            }

            guard let snapshot = snapshot, error == nil else {
                call.reject(error?.localizedDescription ?? "Failed to create route snapshot")
                return
            }

            let image = self.drawRouteSnapshot(
                snapshot: snapshot,
                points: points,
                distanceM: distanceM
            )

            guard let imageData = image.jpegData(compressionQuality: 0.72) else {
                call.reject("Failed to encode route snapshot")
                return
            }

            call.resolve([
                "imageDataUrl": "data:image/jpeg;base64,\(imageData.base64EncodedString())"
            ])
        }
    }

    private func parseMapPayload(_ call: CAPPluginCall) -> (
        center: CLLocationCoordinate2D,
        facilities: [NativeMapFacility]
    )? {
        guard let center = parseCenter(call) else {
            return nil
        }

        let facilityPayloads = call.getArray("facilities", JSObject.self) ?? []
        let facilities = facilityPayloads.compactMap(parseFacility)

        return (center, facilities)
    }

    private func parseCenter(_ call: CAPPluginCall) -> CLLocationCoordinate2D? {
        guard let centerPayload = call.getObject("center") else {
            call.reject("center is required")
            return nil
        }

        guard
            let latitude = centerPayload["latitude"] as? Double,
            let longitude = centerPayload["longitude"] as? Double
        else {
            call.reject("center.latitude and center.longitude are required")
            return nil
        }

        return CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    private func parseFacility(_ payload: JSObject) -> NativeMapFacility? {
        guard
            let id = payload["id"] as? String,
            let type = payload["type"] as? String,
            let name = payload["name"] as? String,
            let latitude = payload["latitude"] as? Double,
            let longitude = payload["longitude"] as? Double
        else {
            return nil
        }

        return NativeMapFacility(
            id: id,
            type: type,
            name: name,
            latitude: latitude,
            longitude: longitude,
            address: payload["address"] as? String ?? ""
        )
    }

    private func parseTouchArea(_ payload: JSObject) -> CGRect? {
        guard
            let x = payload["x"] as? Double,
            let y = payload["y"] as? Double,
            let width = payload["width"] as? Double,
            let height = payload["height"] as? Double
        else {
            return nil
        }

        return CGRect(x: x, y: y, width: width, height: height)
    }

    private func parseRoutePoint(_ payload: JSObject) -> CLLocationCoordinate2D? {
        guard
            let latitude = payload["latitude"] as? Double,
            let longitude = payload["longitude"] as? Double
        else {
            return nil
        }

        return CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    private func makeRouteSnapshotOptions(
        points: [CLLocationCoordinate2D],
        distanceM: Double,
        size: CGSize
    ) -> MKMapSnapshotter.Options {
        let options = MKMapSnapshotter.Options()
        options.size = size
        options.scale = min(UIScreen.main.scale, 2)
        options.mapType = .standard
        options.traitCollection = UITraitCollection(userInterfaceStyle: .light)

        let isStationary = isStationaryRoute(points: points, distanceM: distanceM)

        if isStationary, let firstPoint = points.first {
            options.region = MKCoordinateRegion(
                center: firstPoint,
                latitudinalMeters: 260,
                longitudinalMeters: 260
            )
            return options
        }

        let polyline = MKPolyline(coordinates: points, count: points.count)
        let mapRect = polyline.boundingMapRect
        let paddedMapRect = mapRect.insetBy(
            dx: -max(mapRect.width * 0.22, 120),
            dy: -max(mapRect.height * 0.22, 120)
        )
        options.mapRect = paddedMapRect

        return options
    }

    private func drawRouteSnapshot(
        snapshot: MKMapSnapshotter.Snapshot,
        points: [CLLocationCoordinate2D],
        distanceM: Double
    ) -> UIImage {
        let isStationary = isStationaryRoute(points: points, distanceM: distanceM)
        let renderer = UIGraphicsImageRenderer(size: snapshot.image.size)

        return renderer.image { _ in
            snapshot.image.draw(at: .zero)

            guard let firstPoint = points.first else {
                return
            }

            if !isStationary && points.count > 1 {
                drawRouteLine(snapshot: snapshot, points: points)
                drawKilometerLabels(snapshot: snapshot, points: points)
            }

            drawRouteMarker(
                at: snapshot.point(for: firstPoint),
                fillColor: isStationary ? UIColor.systemBlue : UIColor.systemGreen,
                text: isStationary ? "●" : ""
            )

            if !isStationary, let lastPoint = points.last {
                drawRouteMarker(
                    at: snapshot.point(for: lastPoint),
                    fillColor: UIColor.systemRed,
                    text: ""
                )
            }
        }
    }

    private func drawRouteLine(
        snapshot: MKMapSnapshotter.Snapshot,
        points: [CLLocationCoordinate2D]
    ) {
        let underlayPath = UIBezierPath()
        let routePath = UIBezierPath()
        let firstRoutePoint = snapshot.point(for: points[0])

        underlayPath.move(to: firstRoutePoint)
        routePath.move(to: firstRoutePoint)

        points.dropFirst().forEach { coordinate in
            let point = snapshot.point(for: coordinate)
            underlayPath.addLine(to: point)
            routePath.addLine(to: point)
        }

        underlayPath.lineWidth = 11
        underlayPath.lineCapStyle = .round
        underlayPath.lineJoinStyle = .round
        UIColor.white.withAlphaComponent(0.78).setStroke()
        underlayPath.stroke()

        routePath.lineWidth = 7
        routePath.lineCapStyle = .round
        routePath.lineJoinStyle = .round
        UIColor.systemYellow.setStroke()
        routePath.stroke()
    }

    private func drawKilometerLabels(
        snapshot: MKMapSnapshotter.Snapshot,
        points: [CLLocationCoordinate2D]
    ) {
        var nextKilometer = 1000.0
        var accumulatedDistance = 0.0

        for index in 1..<points.count {
            let previousPoint = points[index - 1]
            let currentPoint = points[index]
            let segmentDistance = previousPoint.distance(to: currentPoint)

            while accumulatedDistance + segmentDistance >= nextKilometer {
                let ratio = (nextKilometer - accumulatedDistance) / max(segmentDistance, 1)
                let coordinate = CLLocationCoordinate2D(
                    latitude: previousPoint.latitude + (currentPoint.latitude - previousPoint.latitude) * ratio,
                    longitude: previousPoint.longitude + (currentPoint.longitude - previousPoint.longitude) * ratio
                )
                drawDistanceLabel(
                    text: "\(Int(nextKilometer / 1000)) km",
                    at: snapshot.point(for: coordinate)
                )
                nextKilometer += 1000
            }

            accumulatedDistance += segmentDistance
        }
    }

    private func drawDistanceLabel(text: String, at point: CGPoint) {
        let attributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 15, weight: .bold),
            .foregroundColor: UIColor.black
        ]
        let textSize = text.size(withAttributes: attributes)
        let labelRect = CGRect(
            x: point.x - textSize.width / 2 - 10,
            y: point.y - textSize.height / 2 - 6,
            width: textSize.width + 20,
            height: textSize.height + 12
        )

        UIColor.white.withAlphaComponent(0.94).setFill()
        UIBezierPath(roundedRect: labelRect, cornerRadius: labelRect.height / 2).fill()
        text.draw(
            at: CGPoint(x: labelRect.minX + 10, y: labelRect.minY + 6),
            withAttributes: attributes
        )
    }

    private func drawRouteMarker(at point: CGPoint, fillColor: UIColor, text: String) {
        let radius: CGFloat = 11
        let rect = CGRect(
            x: point.x - radius,
            y: point.y - radius,
            width: radius * 2,
            height: radius * 2
        )

        UIColor.white.setFill()
        UIBezierPath(ovalIn: rect.insetBy(dx: -3, dy: -3)).fill()
        fillColor.setFill()
        UIBezierPath(ovalIn: rect).fill()

        guard !text.isEmpty else {
            return
        }

        let attributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 10, weight: .bold),
            .foregroundColor: UIColor.white
        ]
        let textSize = text.size(withAttributes: attributes)
        text.draw(
            at: CGPoint(
                x: point.x - textSize.width / 2,
                y: point.y - textSize.height / 2
            ),
            withAttributes: attributes
        )
    }

    private func isStationaryRoute(
        points: [CLLocationCoordinate2D],
        distanceM: Double
    ) -> Bool {
        guard let firstPoint = points.first, let lastPoint = points.last else {
            return true
        }

        return distanceM <= 0 || points.count < 2 || firstPoint.distance(to: lastPoint) < 5
    }
}

private extension CLLocationCoordinate2D {
    func distance(to coordinate: CLLocationCoordinate2D) -> CLLocationDistance {
        CLLocation(latitude: latitude, longitude: longitude).distance(
            from: CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        )
    }
}
