from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import os

# إنشاء التطبيق + تفعيل CORS
app = FastAPI(title="Hospital Waiting Time API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# تحميل الموديل
rf_model = joblib.load("waiting_time_model.joblib")

templates = Jinja2Templates(directory="templates")

# --------- API بسيط (JSON) ---------
class WaitingTimeRequest(BaseModel):
    day_of_week: int
    month: int
    hour: int
    days_between_schedule_and_visit: int
    sex_encoded: int
    age: float


class AppointmentCreate(BaseModel):
    patient_name: str
    day_of_week: int
    month: int
    hour: int
    days_between_schedule_and_visit: int
    sex_encoded: int
    age: float


CSV_PATH = "appointments.csv"


def load_appointments():
    if os.path.exists(CSV_PATH):
        return pd.read_csv(CSV_PATH)
    else:
        cols = [
            "id",
            "patient_name",
            "day_of_week",
            "month",
            "hour",
            "days_between_schedule_and_visit",
            "sex_encoded",
            "age",
            "predicted_waiting_time",
        ]
        return pd.DataFrame(columns=cols)


@app.post("/api/appointments")
def create_appointment(appointment: AppointmentCreate):
    df = load_appointments()

    # generate new id
    if len(df) == 0:
        new_id = 1
    else:
        new_id = int(df["id"].max()) + 1

    # الأساس على الساعة الحالية
    base_features = {
        "day_of_week": appointment.day_of_week,
        "month": appointment.month,
        "hour": appointment.hour,
        "days_between_schedule_and_visit": appointment.days_between_schedule_and_visit,
        "sex_encoded": appointment.sex_encoded,
        "age": appointment.age,
    }

    base_df = pd.DataFrame([base_features])
    current_wait = float(rf_model.predict(base_df)[0])

    # أفضل ساعة في نطاق ساعتين قبل وبعد (داخل ساعات العمل 8..17)
    start_hour = max(8, appointment.hour - 2)
    end_hour = min(17, appointment.hour + 2)

    best_hour = appointment.hour
    best_wait = current_wait

    for h in range(start_hour, end_hour + 1):
        if h == appointment.hour:
            continue
        test_features = base_features.copy()
        test_features["hour"] = h
        test_df = pd.DataFrame([test_features])
        pred = float(rf_model.predict(test_df)[0])
        if pred < best_wait:
            best_wait = pred
            best_hour = h

    # الصف اللي يتخزن في CSV (على الساعة الحالية)
    row = {
        "id": new_id,
        "patient_name": appointment.patient_name,
        "day_of_week": appointment.day_of_week,
        "month": appointment.month,
        "hour": appointment.hour,
        "days_between_schedule_and_visit": appointment.days_between_schedule_and_visit,
        "sex_encoded": appointment.sex_encoded,
        "age": appointment.age,
        "predicted_waiting_time": current_wait,
    }

    df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
    df.to_csv(CSV_PATH, index=False)

    # نرجّع كمان أفضل ساعة قريبة
    return {
        **row,
        "best_local_hour": best_hour,
        "best_local_wait": best_wait,
    }


# ===== Read كل المواعيد =====
@app.get("/api/appointments")
def list_appointments():
    df = load_appointments()
    return df.to_dict(orient="records")


# ===== Read موعد واحد بالـ id =====
@app.get("/api/appointments/{appointment_id}")
def get_appointment(appointment_id: int):
    df = load_appointments()

    if len(df) == 0 or appointment_id not in df["id"].values:
        raise HTTPException(status_code=404, detail="Appointment not found")

    row = df[df["id"] == appointment_id].iloc[0]
    return row.to_dict()


# ===== Update موعد =====
@app.put("/api/appointments/{appointment_id}")
def update_appointment(appointment_id: int, updated: AppointmentCreate):
    df = load_appointments()

    if len(df) == 0 or appointment_id not in df["id"].values:
        raise HTTPException(status_code=404, detail="Appointment not found")

    mask = df["id"] == appointment_id

    df.loc[mask, "patient_name"] = updated.patient_name
    df.loc[mask, "day_of_week"] = updated.day_of_week
    df.loc[mask, "month"] = updated.month
    df.loc[mask, "hour"] = updated.hour
    df.loc[mask, "days_between_schedule_and_visit"] = updated.days_between_schedule_and_visit
    df.loc[mask, "sex_encoded"] = updated.sex_encoded
    df.loc[mask, "age"] = updated.age

    # إعادة حساب الـ prediction
    features_df = pd.DataFrame([{
        "day_of_week": updated.day_of_week,
        "month": updated.month,
        "hour": updated.hour,
        "days_between_schedule_and_visit": updated.days_between_schedule_and_visit,
        "sex_encoded": updated.sex_encoded,
        "age": updated.age,
    }])
    new_predicted = float(rf_model.predict(features_df)[0])
    df.loc[mask, "predicted_waiting_time"] = new_predicted

    df.to_csv(CSV_PATH, index=False)

    return {"message": "updated"}


# ===== Delete موعد =====
@app.delete("/api/appointments/{appointment_id}")
def delete_appointment(appointment_id: int):
    df = load_appointments()

    if len(df) == 0 or appointment_id not in df["id"].values:
        raise HTTPException(status_code=404, detail="Appointment not found")

    df = df[df["id"] != appointment_id]

    df.to_csv(CSV_PATH, index=False)

    return {"message": "deleted"}


@app.get("/")
def root():
    return {"message": "Hospital Waiting Time API is running"}


@app.post("/predict_waiting_time")
def predict_waiting_time(req: WaitingTimeRequest):
    data = pd.DataFrame([req.dict()])
    pred = rf_model.predict(data)[0]
    return {"predicted_waiting_time": float(pred)}


# --------- واجهة الفورم لموظف الاستقبال ---------
@app.get("/form", response_class=HTMLResponse)
def get_form(request: Request):
    return templates.TemplateResponse("form.html", {"request": request})


@app.post("/form", response_class=HTMLResponse)
def post_form(
    request: Request,
    day_name: int = Form(...),
    month: int = Form(...),
    hour: int = Form(...),
    days_between_schedule_and_visit: int = Form(...),
    sex: int = Form(...),  # 0 = Female, 1 = Male
    age: float = Form(...)
):
    sex_encoded = sex

    base_row = {
        "day_of_week": day_name,
        "month": month,
        "hour": hour,
        "days_between_schedule_and_visit": days_between_schedule_and_visit,
        "sex_encoded": sex_encoded,
        "age": age
    }

    df_base = pd.DataFrame([base_row])
    current_pred = float(rf_model.predict(df_base)[0])

    # 1) أفضل ساعة قريبة (±2)
    local_start = max(8, hour - 2)
    local_end = min(17, hour + 2)

    best_local_hour = hour
    best_local_pred = current_pred

    for h in range(local_start, local_end + 1):
        if h == hour:
            continue
        test_row = base_row.copy()
        test_row["hour"] = h
        df_test = pd.DataFrame([test_row])
        pred_h = float(rf_model.predict(df_test)[0])
        if pred_h < best_local_pred:
            best_local_pred = pred_h
            best_local_hour = h

    # 2) أفضل ساعة في اليوم كله
    best_global_hour = hour
    best_global_pred = current_pred

    for h in range(8, 18):
        if h == hour:
            continue
        test_row = base_row.copy()
        test_row["hour"] = h
        df_test = pd.DataFrame([test_row])
        pred_h = float(rf_model.predict(df_test)[0])
        if pred_h < best_global_pred:
            best_global_pred = pred_h
            best_global_hour = h

    context = {
        "request": request,
        "prediction": round(current_pred, 1)
    }

    if best_local_hour != hour and (current_pred - best_local_pred) >= 5:
        context.update({
            "better_local_hour": best_local_hour,
            "current_hour": hour,
            "current_pred": round(current_pred, 1),
            "better_local_pred": round(best_local_pred, 1)
        })

    if best_global_hour != hour and (current_pred - best_global_pred) >= 5:
        context.update({
            "better_global_hour": best_global_hour,
            "better_global_pred": round(best_global_pred, 1)
        })
        @app.get("/healthz")
        def healthz():
            return {"status": "ok"}
    

    return templates.TemplateResponse("form.html", context)
