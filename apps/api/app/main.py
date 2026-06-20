import os
from functools import lru_cache
from math import asin, cos, radians, sin, sqrt
from pathlib import Path
from typing import Literal, Optional
from xml.etree import ElementTree
from zipfile import ZipFile

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

SEOUL_OPEN_DATA_BASE_URL = "http://openapi.seoul.go.kr:8088"
SEOUL_WATER_FOUNTAIN_SERVICE = "TbViewGisArisu"
SEOUL_OPEN_DATA_PAGE_SIZE = 1000
PROJECT_ROOT = Path(__file__).resolve().parents[3]
SEOUL_RESTROOM_XLSX_PATH = (
    PROJECT_ROOT / "data" / "raw" / "restrooms" / "seoul-public-restrooms.xlsx"
)
SEOUL_RESTROOM_DBF_PATH = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "restrooms"
    / "seoul-public-restrooms"
    / "Toilet_seoul.dbf"
)
XLSX_NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkg": "http://schemas.openxmlformats.org/package/2006/relationships",
}


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


def compact(value: object) -> str:
    return str(value or "").replace("\xa0", " ").strip()


def first_value(row: dict[str, str], *keys: str) -> str:
    for key in keys:
        value = compact(row.get(key))

        if value:
            return value

    return ""


def parse_float(value: object) -> Optional[float]:
    try:
        return float(compact(value))
    except ValueError:
        return None


def column_index(cell_reference: str) -> int:
    letters = ""

    for char in cell_reference:
        if not char.isalpha():
            break

        letters += char.upper()

    index = 0

    for letter in letters:
        index = index * 26 + ord(letter) - ord("A") + 1

    return index - 1


def read_shared_strings(workbook: ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in workbook.namelist():
        return []

    root = ElementTree.fromstring(workbook.read("xl/sharedStrings.xml"))
    strings = []

    for item in root.findall("main:si", XLSX_NS):
        parts = [
            text.text or ""
            for text in item.findall(".//main:t", XLSX_NS)
        ]
        strings.append("".join(parts))

    return strings


def first_worksheet_path(workbook: ZipFile) -> str:
    workbook_root = ElementTree.fromstring(workbook.read("xl/workbook.xml"))
    first_sheet = workbook_root.find("main:sheets/main:sheet", XLSX_NS)

    if first_sheet is None:
        raise ValueError("xlsx workbook has no sheets")

    relationship_id = first_sheet.attrib[
        "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
    ]
    relationships_root = ElementTree.fromstring(
        workbook.read("xl/_rels/workbook.xml.rels")
    )

    for relationship in relationships_root.findall("pkg:Relationship", XLSX_NS):
        if relationship.attrib.get("Id") == relationship_id:
            target = relationship.attrib["Target"].lstrip("/")
            return target if target.startswith("xl/") else f"xl/{target}"

    raise ValueError("xlsx first sheet relationship was not found")


def cell_text(cell: ElementTree.Element, shared_strings: list[str]) -> str:
    value = cell.find("main:v", XLSX_NS)

    if cell.attrib.get("t") == "inlineStr":
        return "".join(
            text.text or ""
            for text in cell.findall(".//main:t", XLSX_NS)
        )

    if value is None or value.text is None:
        return ""

    if cell.attrib.get("t") == "s":
        index = int(value.text)
        return shared_strings[index] if index < len(shared_strings) else ""

    return value.text


def read_xlsx_rows(path: Path) -> list[dict[str, str]]:
    with ZipFile(path) as workbook:
        shared_strings = read_shared_strings(workbook)
        sheet_path = first_worksheet_path(workbook)
        sheet_root = ElementTree.fromstring(workbook.read(sheet_path))

    rows = []

    for row in sheet_root.findall(".//main:sheetData/main:row", XLSX_NS):
        values: dict[int, str] = {}

        for cell in row.findall("main:c", XLSX_NS):
            reference = cell.attrib.get("r", "")
            values[column_index(reference)] = compact(
                cell_text(cell, shared_strings)
            )

        if values:
            rows.append(values)

    if not rows:
        return []

    headers = {
        index: value
        for index, value in rows[0].items()
        if value
    }

    return [
        {
            header: row.get(index, "")
            for index, header in headers.items()
        }
        for row in rows[1:]
    ]


def read_dbf_rows(path: Path) -> list[dict[str, str]]:
    data = path.read_bytes()
    record_count = int.from_bytes(data[4:8], byteorder="little")
    header_length = int.from_bytes(data[8:10], byteorder="little")
    record_length = int.from_bytes(data[10:12], byteorder="little")
    fields = []
    offset = 1
    cursor = 32

    while data[cursor] != 0x0D:
        descriptor = data[cursor:cursor + 32]
        name = (
            descriptor[:11]
            .split(b"\x00", 1)[0]
            .decode("ascii", errors="ignore")
        )
        length = descriptor[16]
        fields.append((name, length, offset))
        offset += length
        cursor += 32

    rows = []

    for index in range(record_count):
        start = header_length + index * record_length
        record = data[start:start + record_length]

        if not record or record[0:1] == b"*":
            continue

        row = {
            name: compact(
                record[field_offset:field_offset + length].decode(
                    "utf-8",
                    errors="replace",
                )
            )
            for name, length, field_offset in fields
        }

        rows.append(row)

    return rows


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


def normalize_public_restroom(row: dict[str, str]) -> Optional[Facility]:
    latitude = parse_float(first_value(row, "LAT", "LATITUDE"))
    longitude = parse_float(first_value(row, "LON", "LONGITUDE"))

    if latitude is None or longitude is None:
        return None

    if not (37.0 <= latitude <= 38.0 and 126.0 <= longitude <= 128.0):
        return None

    source_id = first_value(row, "NUM", "PNU")
    name = first_value(row, "TOILET_NM")
    road_address = first_value(
        row,
        "LCTN_ROAD_NM_ADDR",
        "LCTN_ROAD_",
        "ADDRESS",
    ) or None
    lot_address = first_value(
        row,
        "LCTN_LOTNO_ADDR",
        "LCTN_LOTNO",
        "ADDRESS1",
    )
    address = road_address or lot_address

    if not name or not address:
        return None

    opening_time = first_value(row, "OPN_TIME")
    opening_time_detail = first_value(row, "OPN_TIME_DTL", "OPN_TIME_D")
    opening_values = []

    for value in [opening_time, opening_time_detail]:
        if value and value not in opening_values:
            opening_values.append(value)

    opening_hours = " ".join(opening_values) or None

    details = {
        key: value
        for key in [
            "SE",
            "BSS",
            "MNG_INST_NM",
            "MNG_INST_N",
            "TEL",
            "OWNR_SE",
            "PRCS_SE",
            "SAFE_FCLT_SE",
            "SAFE_FCLT_",
            "BELL_INSTL_YN",
            "BELL_INSTL",
            "CCTV_YN",
            "DIAPER_YN",
            "DATA_WRT_YMD",
            "DATA_WRT_Y",
        ]
        if (value := first_value(row, key))
    }

    return Facility(
        id=f"restroom-seoul-{source_id or name}",
        source_id=source_id or None,
        type="restroom",
        name=name,
        latitude=latitude,
        longitude=longitude,
        address=address,
        road_address=road_address,
        opening_hours=opening_hours,
        source="geomarket-restrooms",
        details=details,
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


@lru_cache(maxsize=1)
def load_seoul_public_restrooms() -> list[Facility]:
    if SEOUL_RESTROOM_DBF_PATH.exists():
        rows = read_dbf_rows(SEOUL_RESTROOM_DBF_PATH)
    elif SEOUL_RESTROOM_XLSX_PATH.exists():
        rows = read_xlsx_rows(SEOUL_RESTROOM_XLSX_PATH)
    else:
        return []

    return [
        facility
        for row in rows
        if (facility := normalize_public_restroom(row)) is not None
    ]


def load_facilities() -> list[Facility]:
    water_facilities = load_seoul_water_fountains()
    restroom_facilities = load_seoul_public_restrooms()

    if not water_facilities and not restroom_facilities:
        return SAMPLE_FACILITIES

    sample_water_facilities = [
        facility for facility in SAMPLE_FACILITIES if facility.type == "water"
    ]
    sample_restroom_facilities = [
        facility for facility in SAMPLE_FACILITIES if facility.type == "restroom"
    ]

    return [
        *(water_facilities or sample_water_facilities),
        *(restroom_facilities or sample_restroom_facilities),
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


def is_inside_bounds(
    facility: FacilityResponse,
    min_latitude: Optional[float],
    max_latitude: Optional[float],
    min_longitude: Optional[float],
    max_longitude: Optional[float],
) -> bool:
    if (
        min_latitude is None
        or max_latitude is None
        or min_longitude is None
        or max_longitude is None
    ):
        return True

    return (
        min_latitude <= facility.latitude <= max_latitude
        and min_longitude <= facility.longitude <= max_longitude
    )


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
    min_latitude: Optional[float] = Query(default=None, ge=-90, le=90, alias="min_lat"),
    max_latitude: Optional[float] = Query(default=None, ge=-90, le=90, alias="max_lat"),
    min_longitude: Optional[float] = Query(
        default=None,
        ge=-180,
        le=180,
        alias="min_lng",
    ),
    max_longitude: Optional[float] = Query(
        default=None,
        ge=-180,
        le=180,
        alias="max_lng",
    ),
) -> list[FacilityResponse]:
    if (latitude is None) != (longitude is None):
        raise HTTPException(
            status_code=422,
            detail="latitude and longitude must be provided together",
        )

    bounds_values = [
        min_latitude,
        max_latitude,
        min_longitude,
        max_longitude,
    ]

    if any(value is not None for value in bounds_values) and not all(
        value is not None for value in bounds_values
    ):
        raise HTTPException(
            status_code=422,
            detail="min_lat, max_lat, min_lng, and max_lng must be provided together",
        )

    if (
        min_latitude is not None
        and max_latitude is not None
        and min_latitude > max_latitude
    ):
        raise HTTPException(
            status_code=422,
            detail="min_lat must be less than or equal to max_lat",
        )

    if (
        min_longitude is not None
        and max_longitude is not None
        and min_longitude > max_longitude
    ):
        raise HTTPException(
            status_code=422,
            detail="min_lng must be less than or equal to max_lng",
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
    bounded_facilities = [
        facility
        for facility in facilities
        if is_inside_bounds(
            facility,
            min_latitude,
            max_latitude,
            min_longitude,
            max_longitude,
        )
    ]

    if latitude is None or longitude is None:
        return bounded_facilities

    nearby_facilities = []

    for facility in bounded_facilities:
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
