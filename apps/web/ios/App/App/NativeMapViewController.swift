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

final class FacilityAnnotation: NSObject, MKAnnotation {
    let facility: NativeMapFacility
    let coordinate: CLLocationCoordinate2D

    var title: String? {
        facility.name
    }

    var subtitle: String? {
        facility.address
    }

    init(facility: NativeMapFacility) {
        self.facility = facility
        self.coordinate = CLLocationCoordinate2D(
            latitude: facility.latitude,
            longitude: facility.longitude
        )
    }
}

final class NativeMapViewController: UIViewController, MKMapViewDelegate {
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
        configureMapView()
        configureCloseButton()
        showInitialRegion()
        showFacilityAnnotations()
    }

    private func configureMapView() {
        mapView.translatesAutoresizingMaskIntoConstraints = false
        mapView.delegate = self
        mapView.showsUserLocation = true
        view.addSubview(mapView)

        NSLayoutConstraint.activate([
            mapView.topAnchor.constraint(equalTo: view.topAnchor),
            mapView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            mapView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            mapView.leadingAnchor.constraint(equalTo: view.leadingAnchor)
        ])
    }

    private func configureCloseButton() {
        let button = UIButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.setTitle("닫기", for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 16, weight: .bold)
        button.backgroundColor = .systemBackground
        button.layer.cornerRadius = 18
        button.layer.shadowColor = UIColor.black.cgColor
        button.layer.shadowOpacity = 0.16
        button.layer.shadowRadius = 12
        button.layer.shadowOffset = CGSize(width: 0, height: 6)
        button.contentEdgeInsets = UIEdgeInsets(top: 10, left: 16, bottom: 10, right: 16)
        button.addTarget(self, action: #selector(closeMap), for: .touchUpInside)
        view.addSubview(button)

        NSLayoutConstraint.activate([
            button.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
            button.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16)
        ])
    }

    private func showInitialRegion() {
        let region = MKCoordinateRegion(
            center: center,
            latitudinalMeters: 3000,
            longitudinalMeters: 3000
        )
        mapView.setRegion(region, animated: false)
    }

    private func showFacilityAnnotations() {
        let annotations = facilities.map { facility in
            FacilityAnnotation(facility: facility)
        }

        mapView.addAnnotations(annotations)
    }

    @objc private func closeMap() {
        dismiss(animated: true)
    }

    func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
        guard let facilityAnnotation = annotation as? FacilityAnnotation else {
            return nil
        }

        let identifier = "FacilityAnnotation"
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
