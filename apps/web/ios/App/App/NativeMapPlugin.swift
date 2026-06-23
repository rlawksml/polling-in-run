import Foundation
import CoreLocation
import Capacitor

@objc(NativeMapPlugin)
public class NativeMapPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeMapPlugin"
    public let jsName = "NativeMap"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise)
    ]

    @objc func open(_ call: CAPPluginCall) {
        guard let centerPayload = call.getObject("center") else {
            call.reject("center is required")
            return
        }

        guard
            let latitude = centerPayload["latitude"] as? Double,
            let longitude = centerPayload["longitude"] as? Double
        else {
            call.reject("center.latitude and center.longitude are required")
            return
        }

        let facilityPayloads = call.getArray("facilities", JSObject.self) ?? []
        let facilities = facilityPayloads.compactMap(parseFacility)
        let center = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)

        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                call.reject("NativeMap plugin is not available")
                return
            }

            let mapViewController = NativeMapViewController(
                center: center,
                facilities: facilities
            )
            mapViewController.modalPresentationStyle = .fullScreen
            self.bridge?.viewController?.present(mapViewController, animated: true) {
                call.resolve()
            }
        }
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
}
