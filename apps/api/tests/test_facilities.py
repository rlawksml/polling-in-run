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


def test_normalize_public_restroom_uses_common_facility_model() -> None:
    facility = main.normalize_public_restroom(
        {
            "NUM": "101",
            "SE": "공중화장실",
            "TOILET_NM": "서울광장 화장실",
            "LCTN_ROAD_NM_ADDR": "서울특별시 중구 세종대로 110",
            "LCTN_LOTNO_ADDR": "서울특별시 중구 태평로1가 31",
            "OPN_TIME": "상시",
            "OPN_TIME_DTL": "24시간",
            "LAT": "37.5658",
            "LON": "126.9773",
            "MNG_INST_NM": "서울특별시",
            "DATA_WRT_YMD": "20260410",
        }
    )

    assert facility is not None
    assert facility.id == "restroom-seoul-101"
    assert facility.source_id == "101"
    assert facility.type == "restroom"
    assert facility.name == "서울광장 화장실"
    assert facility.latitude == 37.5658
    assert facility.longitude == 126.9773
    assert facility.address == "서울특별시 중구 세종대로 110"
    assert facility.opening_hours == "상시 24시간"
    assert facility.source == "geomarket-restrooms"
    assert facility.details["SE"] == "공중화장실"


def test_normalize_public_restroom_accepts_truncated_dbf_columns() -> None:
    facility = main.normalize_public_restroom(
        {
            "NUM": "1",
            "SE": "개방화장실",
            "TOILET_NM": "강동구의회 화장실",
            "LCTN_ROAD_": "서울특별시 강동구 성내로 55",
            "LCTN_LOTNO": "서울특별시 강동구 성내동 541-1",
            "OPN_TIME": "정시",
            "OPN_TIME_D": "09:00~18:00",
            "LAT": "37.5286",
            "LON": "127.1264",
            "MNG_INST_N": "강동구의회사무국",
            "DATA_WRT_Y": "2024-01-29",
        }
    )

    assert facility is not None
    assert facility.id == "restroom-seoul-1"
    assert facility.name == "강동구의회 화장실"
    assert facility.address == "서울특별시 강동구 성내로 55"
    assert facility.opening_hours == "정시 09:00~18:00"
    assert facility.source == "geomarket-restrooms"
    assert facility.details["MNG_INST_N"] == "강동구의회사무국"


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
