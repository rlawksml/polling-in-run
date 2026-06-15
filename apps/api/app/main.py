from math import asin, cos, radians, sin, sqrt
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


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
    opening_hours: Optional[str] = None
    source: str


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

    facilities = [
        FacilityResponse(**facility.model_dump())
        for facility in SAMPLE_FACILITIES
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
