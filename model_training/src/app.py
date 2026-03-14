from __future__ import annotations

import asyncio
import hashlib
from pathlib import Path

import pandas as pd
import xgboost as xgb
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Camp Triage Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PatientVitals(BaseModel):
    Name: str = Field(min_length=1, max_length=120)
    Age: float = Field(gt=0, le=130)
    Gender: str = Field(min_length=1, max_length=50)
    Weight_kg: float = Field(gt=0, le=500)
    Height_cm: float = Field(gt=0, le=300)
    radiation_dose_mSv: float = Field(ge=0, le=20000)
    hours_since_exposure: float = Field(ge=0, le=20000)
    diagnosis: str = Field(min_length=1, max_length=120)


class AccessCodeRequest(BaseModel):
    code: str = Field(min_length=1, max_length=64)


class AccessCodeResponse(BaseModel):
    ok: bool
    message: str


GENDER_ENCODING = {
    "male": 0,
    "female": 1,
    "other": 2,
    "non-binary": 2,
    "nonbinary": 2,
}

DIAGNOSIS_ENCODING = {
    "burn": 0,
    "fracture": 1,
    "radiation_sickness": 2,
    "dehydration": 3,
    "infection": 4,
    "trauma": 5,
}

ACCESS_CODE = "6969"

HOURGLASS_FRAMES = [
    "╔════════════╗",
    "║\\          /║",
    "║ \\        / ║",
    "║  \\      /  ║",
    "║   \\    /   ║",
    "║   /####\\   ║",
    "║  /######\\  ║",
    "║ /########\\ ║",
    "║/##########\\║",
    "╚════════════╝",
]


def _hash_name(name: str) -> str:
    return hashlib.sha256(name.encode("utf-8")).hexdigest()[:8]


def _hash_name_numeric(name_hash: str) -> float:
    return float(int(name_hash, 16) % 1_000_000)


def _encode_with_fallback(raw_value: str, mapping: dict[str, int]) -> int:
    key = raw_value.strip().lower()
    if key in mapping:
        return mapping[key]

    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()
    return len(mapping) + (int(digest[:8], 16) % 1000)


def _resolve_model_path() -> Path:
    # Always use model/camp_triage_model.json relative to project root
    project_root = Path(__file__).resolve().parents[2]
    model_path = project_root / "model" / "camp_triage_model.json"
    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found at {model_path}")
    return model_path

MODEL_PATH = _resolve_model_path()
MODEL = xgb.XGBRegressor()
MODEL.load_model(MODEL_PATH)
MODEL_FEATURES = MODEL.get_booster().feature_names or []


def _build_feature_frame(vitals: PatientVitals, survivor_id_hashed: str) -> pd.DataFrame:
    encoded_gender = _encode_with_fallback(vitals.Gender, GENDER_ENCODING)
    encoded_diagnosis = _encode_with_fallback(vitals.diagnosis, DIAGNOSIS_ENCODING)
    survivor_numeric = _hash_name_numeric(survivor_id_hashed)

    # Base values we can derive from current frontend inputs.
    base_features: dict[str, float] = {
        "Age": float(vitals.Age),
        "Gender": float(encoded_gender),
        "Weight_kg": float(vitals.Weight_kg),
        "Height_cm": float(vitals.Height_cm),
        "radiation_dose_mSv": float(vitals.radiation_dose_mSv),
        "hours_since_exposure": float(vitals.hours_since_exposure),
        "diagnosis": float(encoded_diagnosis),
        "age": float(vitals.Age),
        "gender": float(encoded_gender),
        "Survivor_ID_Hashed": survivor_numeric,
        # Conservative defaults for additional model-required medical indicators.
        "fever": 0.0,
        "cough": 0.0,
        "fatigue": 0.0,
        "headache": 0.0,
        "muscle_pain": 0.0,
        "nausea": 0.0,
        "vomiting": 0.0,
        "diarrhea": 0.0,
        "skin_rash": 0.0,
        "loss_smell": 0.0,
        "loss_taste": 0.0,
        "systolic_bp": 120.0,
        "diastolic_bp": 80.0,
        "heart_rate": 75.0,
        "temperature_c": 36.9,
        "oxygen_saturation": 98.0,
        "wbc_count": 7.0,
        "hemoglobin": 14.0,
        "platelet_count": 250.0,
        "crp_level": 3.0,
        "glucose_level": 95.0,
    }

    if MODEL_FEATURES:
        ordered_row = {name: float(base_features.get(name, 0.0)) for name in MODEL_FEATURES}
    else:
        ordered_row = base_features

    return pd.DataFrame([ordered_row])


async def _print_hourglass_with_exact_delay() -> None:
    for line in HOURGLASS_FRAMES:
        print(line, flush=True)
        await asyncio.sleep(1)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": str(MODEL_PATH)}


@app.post("/verify-access-code", response_model=AccessCodeResponse)
def verify_access_code(payload: AccessCodeRequest) -> AccessCodeResponse:
    if payload.code.strip() == ACCESS_CODE:
        return AccessCodeResponse(ok=True, message="Access granted")
    return AccessCodeResponse(ok=False, message="Invalid access code")


@app.post("/predict")
async def predict(vitals: PatientVitals) -> dict[str, float | str]:
    survivor_id_hashed = _hash_name(vitals.Name)

    await _print_hourglass_with_exact_delay()

    feature_frame = _build_feature_frame(vitals, survivor_id_hashed)

    try:
        prediction = float(MODEL.predict(feature_frame)[0])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc

    return {
        "Survivor_ID_Hashed": survivor_id_hashed,
        "caloric_need_24hr": round(prediction, 2),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
