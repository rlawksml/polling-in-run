from typing import Literal, Optional

from fastapi import FastAPI
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


@app.get("/api/facilities", response_model=list[Facility], tags=["facilities"])
def list_facilities() -> list[Facility]:
    return SAMPLE_FACILITIES
