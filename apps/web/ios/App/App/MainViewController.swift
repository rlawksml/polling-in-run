import Capacitor
import MapKit
import UIKit

final class MainViewController: CAPBridgeViewController, MKMapViewDelegate {
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

        let facilityAnnotations = embeddedMapView.annotations.compactMap {
            $0 as? FacilityAnnotation
        }
        embeddedMapView.removeAnnotations(facilityAnnotations)
        embeddedMapView.addAnnotations(
            facilities.map { FacilityAnnotation(facility: $0) }
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

    func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
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
}
