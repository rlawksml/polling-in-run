from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_list_facilities_uses_a_common_model() -> None:
    response = client.get("/api/facilities")

    assert response.status_code == 200

    facilities = response.json()

    assert len(facilities) == 4
    assert {facility["type"] for facility in facilities} == {"water", "restroom"}
    assert all("latitude" in facility for facility in facilities)
    assert all("longitude" in facility for facility in facilities)
    assert all(facility["source"] == "sample" for facility in facilities)
    assert all(facility["distance_m"] is None for facility in facilities)


def test_list_facilities_filters_and_sorts_by_distance() -> None:
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


def test_list_facilities_requires_complete_location() -> None:
    response = client.get("/api/facilities", params={"latitude": 37.5665})

    assert response.status_code == 422
