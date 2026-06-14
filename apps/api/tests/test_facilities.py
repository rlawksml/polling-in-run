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
