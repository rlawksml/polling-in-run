import json
from datetime import datetime, timezone
from pathlib import Path

from app.main import FacilityResponse, load_facilities


PROJECT_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_PATH = PROJECT_ROOT / "apps" / "web" / "public" / "data" / "facilities.json"


def main() -> None:
    facilities = [
        FacilityResponse(**facility.model_dump()).model_dump()
        for facility in load_facilities()
    ]
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "count": len(facilities),
        "facilities": facilities,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Exported {len(facilities)} facilities to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
