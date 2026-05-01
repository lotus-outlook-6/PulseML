"""
PulseML — AI-Powered Health Risk Predictor
Flask backend serving predictions from a pre-trained Random Forest model.
"""

import os
from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import joblib
import pandas as pd

# ── App init ────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)

# ── Model loading (once, at startup) ───────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "ml_models", "pulse_ox_model.pkl")
ENCODER_PATH = os.path.join(BASE_DIR, "ml_models", "label_encoder.pkl")

model = joblib.load(MODEL_PATH)
encoder = joblib.load(ENCODER_PATH)

print("[OK] Model loaded successfully")
print(f"  Classes: {list(encoder.classes_)}")

# ── Advice mapping ─────────────────────────────────────────────────────────
ADVICE = {
    "Normal":  "Vitals are stable. Continue regular monitoring.",
    "Medium":  "Abnormal readings. Consult a healthcare professional if symptoms persist.",
    "High":    "EMERGENCY: Seek immediate medical attention.",
}

# ── Routes ──────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(force=True)

    try:
        bpm = float(data.get("bpm", 0))
        spo2 = float(data.get("spo2", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid input. Provide numeric bpm and spo2."}), 400

    # Signal quality guard ─────────────────────────────────────────────────
    if bpm < 30 or bpm > 300 or spo2 < 0 or spo2 > 100:
        return jsonify({
            "signal_warning": True,
            "risk_label": "Signal Warning",
            "confidence": 0,
            "advice": "Invalid input detected. Please check sensor placement and re-measure.",
            "bpm": bpm,
            "spo2": spo2,
        })

    # Build DataFrame with exact feature names the model expects ───────────
    df = pd.DataFrame([[bpm, spo2]], columns=["Heart_Rate", "Oxygen_Saturation"])

    prediction = model.predict(df)[0]
    probabilities = model.predict_proba(df)[0]
    confidence = float(max(probabilities))
    risk_label = encoder.inverse_transform([prediction])[0]

    advice = ADVICE.get(risk_label, "Please consult a healthcare professional.")

    return jsonify({
        "signal_warning": False,
        "risk_label": risk_label,
        "confidence": round(confidence, 4),
        "advice": advice,
        "bpm": bpm,
        "spo2": spo2,
    })


# ── Run ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
