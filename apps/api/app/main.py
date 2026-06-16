import os
from functools import lru_cache
from math import asin, cos, radians, sin, sqrt
from pathlib import Path
from typing import Literal, Optional

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

SEOUL_OPEN_DATA_BASE_URL = "http://openapi.seoul.go.kr:8088"
SEOUL_WATER_FOUNTAIN_SERVICE = "TbViewGisArisu"
SEOUL_OPEN_DATA_PAGE_SIZE = 1000


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str


class Facility(BaseModel):
    id: str
    type: Literal["water", "restroom"]
    name: str
    latitude: float
    longitude: float
    address: str
    source_id: Optional[str] = None
    road_address: Optional[str] = None
    opening_hours: Optional[str] = None
    source: str
    details: dict[str, str] = Field(default_factory=dict)


class FacilityResponse(Facility):
    distance_m: Optional[int] = None


SAMPLE_FACILITIES = [
    Facility(
        id="water-sample-1",
        type="water",
        name="경희궁 샘플 음수대",
        latitude=37.5715,
        longitude=126.9686,
        address="서울특별시 종로구 새문안로",
        source="sample",
    ),
    Facility(
        id="water-sample-2",
        type="water",
        name="남산공원 샘플 음수대",
        latitude=37.5565,
        longitude=126.986,
        address="서울특별시 중구 남산공원길",
        source="sample",
    ),
    Facility(
        id="restroom-sample-1",
        type="restroom",
        name="서울도서관 화장실",
        latitude=37.5661,
        longitude=126.9779,
        address="서울특별시 중구 세종대로 110",
        opening_hours="09:00~21:00",
        source="sample",
    ),
    Facility(
        id="restroom-sample-2",
        type="restroom",
        name="청계천 공중화장실",
        latitude=37.5687,
        longitude=126.9912,
        address="서울특별시 종로구 청계천로",
        opening_hours="24시간",
        source="sample",
    ),
]


def get_api_env_value(key: str) -> Optional[str]:
    value = os.getenv(key)

    if value:
        return value.strip().strip('"').strip("'")

    env_path = Path(__file__).resolve().parents[1] / ".env"

    if not env_path.exists():
        return None

    for line in env_path.read_text(encoding="utf-8").splitlines():
        if not line.startswith(f"{key}="):
            continue

        return line.split("=", 1)[1].strip().strip('"').strip("'")

    return None


def build_water_fountain_url(api_key: str, start: int, end: int) -> str:
    return (
        f"{SEOUL_OPEN_DATA_BASE_URL}/{api_key}/json/"
        f"{SEOUL_WATER_FOUNTAIN_SERVICE}/{start}/{end}/"
    )


def to_detail_map(row: dict[str, str]) -> dict[str, str]:
    details = {}

    for index in range(1, 21):
        name = row.get(f"CN_DTL_NM_{index}", "").strip()
        value = row.get(f"CN_DTL_VL_{index}", "").strip()

        if name and value:
            details[name] = value

    return details


def normalize_water_fountain(row: dict[str, str]) -> Optional[Facility]:
    try:
        latitude = float(row["YCRD"])
        longitude = float(row["XCRD"])
    except (KeyError, TypeError, ValueError):
        return None

    if not (37.0 <= latitude <= 38.0 and 126.0 <= longitude <= 128.0):
        return None

    source_id = row.get("CN_ID", "").strip()
    park_name = row.get("CN_PARK_NM", "").strip()
    road_address = row.get("ROAD_NM_ADDR", "").strip() or None
    lot_address = row.get("LOTNO_ADDR", "").strip()

    if not source_id or not park_name:
        return None

    return Facility(
        id=f"water-seoul-{source_id}",
        source_id=source_id,
        type="water",
        name=f"{park_name} 음수대",
        latitude=latitude,
        longitude=longitude,
        address=road_address or lot_address,
        road_address=road_address,
        source="seoul-open-data",
        details=to_detail_map(row),
    )


def fetch_seoul_water_fountain_page(
    api_key: str,
    start: int,
    end: int,
) -> tuple[int, list[dict[str, str]]]:
    response = httpx.get(
        build_water_fountain_url(api_key, start, end),
        timeout=10,
    )
    response.raise_for_status()
    payload = response.json()

    if SEOUL_WATER_FOUNTAIN_SERVICE not in payload:
        result = payload.get("RESULT", {})
        code = result.get("CODE", "UNKNOWN")
        message = result.get("MESSAGE", "서울 열린데이터광장 응답 형식 오류")
        raise RuntimeError(f"{code}: {message}")

    data = payload[SEOUL_WATER_FOUNTAIN_SERVICE]
    result = data.get("RESULT", {})

    if result.get("CODE") != "INFO-000":
        raise RuntimeError(
            f"{result.get('CODE', 'UNKNOWN')}: {result.get('MESSAGE', '')}"
        )

    return int(data.get("list_total_count", 0)), data.get("row", [])


@lru_cache(maxsize=1)
def load_seoul_water_fountains() -> list[Facility]:
    api_key = get_api_env_value("SEOUL_OPEN_DATA_API_KEY")

    if not api_key:
        return []

    total_count, rows = fetch_seoul_water_fountain_page(
        api_key,
        1,
        SEOUL_OPEN_DATA_PAGE_SIZE,
    )

    for start in range(
        SEOUL_OPEN_DATA_PAGE_SIZE + 1,
        total_count + 1,
        SEOUL_OPEN_DATA_PAGE_SIZE,
    ):
        end = min(start + SEOUL_OPEN_DATA_PAGE_SIZE - 1, total_count)
        _, page_rows = fetch_seoul_water_fountain_page(api_key, start, end)
        rows.extend(page_rows)

    facilities = [
        facility
        for row in rows
        if (facility := normalize_water_fountain(row)) is not None
    ]

    return facilities


def load_facilities() -> list[Facility]:
    water_facilities = load_seoul_water_fountains()

    if not water_facilities:
        return SAMPLE_FACILITIES

    sample_restrooms = [
        facility for facility in SAMPLE_FACILITIES if facility.type == "restroom"
    ]

    return [*water_facilities, *sample_restrooms]


app = FastAPI(title="Polling In Run API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse, tags=["system"])
def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="polling-in-run-api",
        version=app.version,
    )


def calculate_distance_m(
    origin_latitude: float,
    origin_longitude: float,
    destination_latitude: float,
    destination_longitude: float,
) -> int:
    earth_radius_m = 6_371_000
    latitude_delta = radians(destination_latitude - origin_latitude)
    longitude_delta = radians(destination_longitude - origin_longitude)
    origin_latitude_rad = radians(origin_latitude)
    destination_latitude_rad = radians(destination_latitude)

    haversine = (
        sin(latitude_delta / 2) ** 2
        + cos(origin_latitude_rad)
        * cos(destination_latitude_rad)
        * sin(longitude_delta / 2) ** 2
    )

    return round(earth_radius_m * 2 * asin(sqrt(haversine)))


@app.get(
    "/api/facilities",
    response_model=list[FacilityResponse],
    tags=["facilities"],
)
def list_facilities(
    latitude: Optional[float] = Query(default=None, ge=-90, le=90),
    longitude: Optional[float] = Query(default=None, ge=-180, le=180),
    radius_m: int = Query(default=3000, ge=100, le=50000),
    facility_types: Optional[str] = Query(default=None, alias="type"),
) -> list[FacilityResponse]:
    if (latitude is None) != (longitude is None):
        raise HTTPException(
            status_code=422,
            detail="latitude and longitude must be provided together",
        )

    selected_types = (
        {item.strip() for item in facility_types.split(",")}
        if facility_types
        else {"water", "restroom"}
    )
    invalid_types = selected_types - {"water", "restroom"}

    if invalid_types:
        raise HTTPException(
            status_code=422,
            detail=f"unsupported facility type: {sorted(invalid_types)[0]}",
        )

    try:
        source_facilities = load_facilities()
    except (httpx.HTTPError, RuntimeError) as error:
        raise HTTPException(
            status_code=502,
            detail=f"facility source request failed: {error}",
        ) from error

    facilities = [
        FacilityResponse(**facility.model_dump())
        for facility in source_facilities
        if facility.type in selected_types
    ]

    if latitude is None or longitude is None:
        return facilities

    nearby_facilities = []

    for facility in facilities:
        distance_m = calculate_distance_m(
            latitude,
            longitude,
            facility.latitude,
            facility.longitude,
        )

        if distance_m <= radius_m:
            nearby_facilities.append(
                facility.model_copy(update={"distance_m": distance_m})
            )

    return sorted(
        nearby_facilities,
        key=lambda facility: facility.distance_m or 0,
    )
