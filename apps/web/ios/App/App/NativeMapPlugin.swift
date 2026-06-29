import Foundation
import CoreGraphics
import CoreLocation
import Capacitor

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
        CAPPluginMethod(name: "showRoutePreview", returnType: CAPPluginReturnPromise)
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

    @objc func showRoutePreview(_ call: CAPPluginCall) {
        let pointPayloads = call.getArray("points", JSObject.self) ?? []
        let points = pointPayloads.compactMap(parseRoutePoint)
        let frame = call.getObject("frame").flatMap { parseFrame($0) }
        let distanceM = call.getDouble("distanceM") ?? 0

        DispatchQueue.main.async { [weak self] in
            guard
                let mainViewController = self?.bridge?.viewController as? MainViewController
            else {
                call.reject("MainViewController is not available")
                return
            }

            mainViewController.updateRoutePreview(
                frame: frame,
                points: points,
                distanceM: distanceM
            )
            call.resolve()
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

    private func parseFrame(_ payload: JSObject) -> CGRect? {
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
}
