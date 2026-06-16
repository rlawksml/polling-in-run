from fastapi.testclient import TestClient

from app import main


client = TestClient(main.app)


def test_normalize_water_fountain_uses_common_facility_model() -> None:
    facility = main.normalize_water_fountain(
        {
            "CN_ID": "용산구-신계역사공원-1",
            "CN_PARK_NM": "신계역사공원",
            "LOTNO_ADDR": "서울특별시 용산구 신계동 55",
            "ROAD_NM_ADDR": "서울특별시 용산구 청파로 139-25",
            "XCRD": "126.9661111",
            "YCRD": "37.53527778",
            "CN_DTL_NM_1": "상세위치",
            "CN_DTL_VL_1": "공원 내 위치",
        }
    )

    assert facility is not None
    assert facility.id == "water-seoul-용산구-신계역사공원-1"
    assert facility.source_id == "용산구-신계역사공원-1"
    assert facility.type == "water"
    assert facility.name == "신계역사공원 음수대"
    assert facility.latitude == 37.53527778
    assert facility.longitude == 126.9661111
    assert facility.address == "서울특별시 용산구 청파로 139-25"
    assert facility.source == "seoul-open-data"
    assert facility.details == {"상세위치": "공원 내 위치"}


def use_sample_facilities(monkeypatch) -> None:
    monkeypatch.setattr(main, "load_facilities", lambda: main.SAMPLE_FACILITIES)


def test_list_facilities_uses_a_common_model(monkeypatch) -> None:
    use_sample_facilities(monkeypatch)

    response = client.get("/api/facilities")

    assert response.status_code == 200

    facilities = response.json()

    assert len(facilities) == 4
    assert {facility["type"] for facility in facilities} == {"water", "restroom"}
    assert all("latitude" in facility for facility in facilities)
    assert all("longitude" in facility for facility in facilities)
    assert all(facility["source"] == "sample" for facility in facilities)
    assert all(facility["distance_m"] is None for facility in facilities)


def test_list_facilities_filters_and_sorts_by_distance(monkeypatch) -> None:
    use_sample_facilities(monkeypatch)

    response = client.get(
        "/api/facilities",
        params={
            "latitude": 37.5665,
            "longitude": 126.9780,
            "radius_m": 2000,
            "type": "restroom",
        },
    )

    assert response.status_code == 200

    facilities = response.json()

    assert [facility["type"] for facility in facilities] == [
        "restroom",
        "restroom",
    ]
    assert facilities[0]["distance_m"] <= facilities[1]["distance_m"]
    assert all(facility["distance_m"] <= 2000 for facility in facilities)


def test_list_facilities_requires_complete_location(monkeypatch) -> None:
    use_sample_facilities(monkeypatch)

    response = client.get("/api/facilities", params={"latitude": 37.5665})

    assert response.status_code == 422
