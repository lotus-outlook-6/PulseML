# PulseML — AI Health Risk Predictor

![Firebase](https://img.shields.io/badge/Firebase-Hosted-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![scikit-learn](https://img.shields.io/badge/scikit--learn-RandomForest-F7931E?style=flat-square&logo=scikit-learn&logoColor=white)
![Accuracy](https://img.shields.io/badge/Model%20Accuracy-100%25-30d158?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Browser%20Native-4A90E2?style=flat-square)

**PulseML** is an end-to-end AI health risk assessment system that classifies a patient's cardiovascular status into three risk levels — **Normal**, **Medium**, and **High** — using only two inputs: Heart Rate (BPM) and Blood Oxygen Saturation (SpO₂). The application runs entirely in the browser with no backend server, powered by a Random Forest model compiled to JavaScript via `m2cgen` and deployed on Firebase Hosting.

> **Disclaimer:** This project is intended for research and educational purposes only. It is not a substitute for professional medical diagnosis or clinical equipment.

---

## Downloads

| Resource | File | Description |
|---|---|---|
| Presentation | [Pulse ML.pptx](./public/Pulse%20ML.pptx) | Full project presentation slides |
| Jupyter Notebook | [Pulse_ML.ipynb](./public/Pulse_ML.ipynb) | Complete ML training pipeline (Google Colab) |
| Notebook PDF | [Pulse_ML.ipynb.pdf](./public/Pulse_ML.ipynb.pdf) | Printable PDF export of the notebook |
| Trained Models | [PulseML_Models.zip](./public/PulseML_Models.zip) | `pulse_ox_model.pkl` + `label_encoder.pkl` |
| Demo Video | [PulseML_mp4.mp4](./public/PulseML_mp4.mp4) | Full application walkthrough (MP4) |

---

## Live Demo

The GIF below shows a live walkthrough of the application. Click the link beneath it to download the full-quality MP4 video.

<div align="center">

![PulseML Demo](./public/PulseML_gif.gif)

[⬇ Download Full Demo Video (MP4)](./public/PulseML_mp4.mp4)

</div>

---

## Hardware — Circuit Diagram

The physical layer of PulseML uses a **MAX30100 pulse oximeter sensor** interfaced with an **ESP8266 NodeMCU** microcontroller over I²C. The sensor reads Heart Rate and SpO₂ values directly from the patient's fingertip and transmits them wirelessly over Wi-Fi to the Blynk cloud platform for real-time monitoring.

![Circuit Diagram](./public/images/Circuit.png)

**Figure 1 — Circuit Wiring Diagram.** The MAX30100 sensor connects to the NodeMCU at 3.3V power, shared ground, SDA on D2 (GPIO4), and SCL on D1 (GPIO5). The NodeMCU is programmed via USB and thereafter operates independently on Wi-Fi, posting readings to the Blynk server every 500 ms.

---

## Hardware — Blynk IoT Dashboard

The Blynk mobile dashboard provides a real-time visualization of the sensor stream. Virtual pins V1 (Heart Rate) and V2 (SpO₂) receive live data from the ESP8266. The dashboard includes a Gauge widget for SpO₂ percentage, a SuperChart for trend analysis, and LED alert indicators that activate when readings fall outside normal ranges.

<div align="center">

<img src="./public/images/Blynk app.png" alt="Blynk IoT Dashboard" width="280"/>

</div>

**Figure 2 — Blynk Mobile Dashboard.** The companion app monitors the patient's vitals in real time. Alerts are configured to trigger when Heart Rate exceeds 100 BPM or SpO₂ drops below 95%, providing immediate visual notification on the clinician's or caregiver's mobile device.

---

## Application Screenshots

The following table documents every screen state of the PulseML web application in the order a user would encounter them during a full session. Scroll the screenshot row horizontally to browse all screens.

| Sl. No. | Screen | Description | Screenshot |
|:---:|---|---|:---:|
| 1 | **Homepage** | The main diagnostic interface. On load, the header status pill runs a 3–5 second animated boot sequence: Red (*Initialising*) → Yellow (*Loading model*) → Green (*Model Active*). The user enters Heart Rate in BPM and SpO₂ as a percentage, then clicks **Analyze Vitals**. | ![Homepage](./public/images/PulseML_homepage.png) |
| 2 | **AI Processing Overlay** | After form submission, a full-screen animated overlay appears and walks through four pipeline stages — *Reading vitals*, *Pre-processing data*, *Running AI model*, and *Interpreting results* — over a 4.2-second window with a progress bar and animated text transitions. | ![Processing](./public/images/PulseML_processing.png) |
| 3 | **Normal Risk Result** | When both vitals are within healthy ranges (HR: 60–100 BPM, SpO₂: 95–100%), the model classifies the reading as **Normal**. The result card displays the risk label in green, an AI confidence ring showing prediction certainty, and personalised advice to continue regular monitoring. | ![Normal Result](./public/images/PulseML_normalresult.png) |
| 4 | **High Risk Result** | Critically abnormal readings (e.g. HR: 145 BPM, SpO₂: 88%) are classified as **High** risk. The result card renders in red, the advice banner displays an emergency warning, and the hospital finder modal is automatically triggered 800 ms after the result is shown. | ![High Risk](./public/images/PulseML_highrisk.png) |
| 5 | **Model Architecture View** | Displays the underlying machine learning model details — a Random Forest Classifier with 100 estimators trained on 60,000 patient records. The full classification report confirms 100% precision, recall, and F1-score across all three risk classes on the 12,000-record test set. | ![Model Info](./public/images/PulseML_model.png) |
| 6 | **Assessment History** | The history panel stores up to 10 recent assessments in the browser's `localStorage`. Each entry shows the risk label, raw vitals (BPM and SpO₂), AI confidence percentage, and a relative timestamp. Clicking any entry re-renders the full result — including re-triggering the hospital modal for High-risk entries. | ![History](./public/images/PulseML_history.png) |
| 7 | **Emergency Detected Modal** | This modal is automatically displayed on any High-risk prediction. It informs the user that their vitals indicate a high-risk condition and offers two actions: **Find Nearby Hospitals** (initiates the location flow) or **Not Now** (dismisses the modal). | ![Emergency Modal](./public/images/PulseML_EmergencyDetected.png) |
| 8 | **Detecting Location** | When the user selects *Find Nearby Hospitals*, the app calls the browser's Geolocation API. An animated spinner is displayed while waiting for the GPS response. If the user denies location access, the flow falls back automatically to the manual location entry screen. | ![Detecting Location](./public/images/PulseML_detecinglocation.png) |
| 9 | **Manual Location Entry** | If GPS access is denied or the device does not support geolocation, the user is prompted to type a location manually — such as a city name or street address (e.g. *Jagiroad, India*). The input is forwarded to the OpenStreetMap Nominatim geocoder to resolve coordinates. | ![Manual Location](./public/images/PulseML_enterlocation.png) |
| 10 | **Searching Hospitals** | Once coordinates are resolved (via GPS or geocoding), the app queries the OpenStreetMap Overpass API for hospitals, clinics, health centres, and doctors within a 30 km radius (expanding to 50 km if no results are found). A spinner is shown during the live API call. | ![Searching](./public/images/PulseML_searching%20hospital.png) |
| 11 | **Hospital Results List** | The top 3 nearest medical facilities are displayed, sorted by Haversine distance from the user's location. Each card includes the facility name, distance, a **Get Directions** button (deep-links to Google Maps), and a **Call** button if a phone number is available in OpenStreetMap. The emergency helpline **112** is pinned at the bottom. | ![Hospital List](./public/images/PulseML_hospitalslist.png) |
| 12 | **Emergency Call 112** | The national emergency helpline number **112** is persistently displayed on the hospital results screen. On mobile devices, the **Call 112** button directly initiates a phone call. This screen also appears in the *No Hospitals Found* fallback state when no facilities are detected within the maximum search radius. | ![Call 112](./public/images/PulseML_112.png) |

---

## Presentation Slides

The following slides are from the official project presentation. They cover the project's motivation, architecture, dataset, model training, results, and deployment strategy.

| Slide | Preview |
|:---:|:---:|
| 1 | ![Slide 1](./public/ppt_pmg/page%20(1).png) |
| 2 | ![Slide 2](./public/ppt_pmg/page%20(2).png) |
| 3 | ![Slide 3](./public/ppt_pmg/page%20(3).png) |
| 4 | ![Slide 4](./public/ppt_pmg/page%20(4).png) |
| 5 | ![Slide 5](./public/ppt_pmg/page%20(5).png) |
| 6 | ![Slide 6](./public/ppt_pmg/page%20(6).png) |
| 7 | ![Slide 7](./public/ppt_pmg/page%20(7).png) |
| 8 | ![Slide 8](./public/ppt_pmg/page%20(8).png) |
| 9 | ![Slide 9](./public/ppt_pmg/page%20(9).png) |
| 10 | ![Slide 10](./public/ppt_pmg/page%20(10).png) |
| 11 | ![Slide 11](./public/ppt_pmg/page%20(11).png) |
| 12 | ![Slide 12](./public/ppt_pmg/page%20(12).png) |
| 13 | ![Slide 13](./public/ppt_pmg/page%20(13).png) |

[Download Full Presentation (PPTX)](./public/Pulse%20ML.pptx)

---

## Project Overview

PulseML is structured in three distinct layers that together form a complete healthcare monitoring pipeline.

**Layer 1 — IoT Hardware.** A MAX30100 sensor attached to the fingertip captures Heart Rate and SpO₂ readings. An ESP8266 NodeMCU microcontroller reads the sensor data over I²C and transmits it in real time to the Blynk cloud platform over Wi-Fi. This provides continuous, live monitoring on a clinician's mobile device.

**Layer 2 — Machine Learning.** A Random Forest Classifier is trained on 60,000 synthetic patient records sourced from a Kaggle healthcare monitoring dataset. The model takes two input features — Heart Rate and Oxygen Saturation — and classifies each reading into one of three risk categories: Normal, Medium, or High. The trained model is then exported to a pure JavaScript function using the `m2cgen` library, eliminating any server-side Python dependency at inference time.

**Layer 3 — Web Application.** The JavaScript model runs entirely inside the user's browser. The application is deployed as a static site on Firebase Hosting, making it globally accessible with zero backend infrastructure. Firebase Anonymous Authentication and Firestore are used to log every assessment for aggregate analytics. When a High-risk result is detected, the application automatically locates the nearest hospitals using the browser's Geolocation API and the OpenStreetMap Overpass API, displaying directions and contact information within the same interface.

---

## Machine Learning Pipeline

### Dataset

| Property | Value |
|---|---|
| Source | Kaggle — Patient Healthcare Monitoring System (`gourangomandal`) |
| Total Records | 60,000 synthetic patient records |
| Features Used | Heart Rate (BPM), Oxygen Saturation (%) |
| Target Column | `Risk_Level` — engineered from alert flags |
| Class Distribution | Normal: 23,685 · Medium: 24,392 · High: 11,923 |

### Risk Label Engineering

The dataset does not include a ready-made risk label. Labels were derived from two binary alert columns:

```
Both alerts NORMAL          →  Normal
Both alerts ABNORMAL        →  High
One NORMAL, one ABNORMAL    →  Medium
```

### Model Configuration

| Property | Value |
|---|---|
| Algorithm | Random Forest Classifier |
| Number of Trees | 100 |
| Train / Test Split | 80% / 20% (48,000 train · 12,000 test) |
| Random State | 42 |
| Training Platform | Google Colab (NVIDIA T4 GPU) |
| Final Accuracy | **100.00%** |

### Classification Report

```
              precision    recall  f1-score   support

        High       1.00      1.00      1.00      2374
      Medium       1.00      1.00      1.00      4798
      Normal       1.00      1.00      1.00      4828

    accuracy                           1.00     12000
   macro avg       1.00      1.00      1.00     12000
weighted avg       1.00      1.00      1.00     12000
```

### Model Export — m2cgen

After training, the scikit-learn `RandomForestClassifier` object is converted to a self-contained JavaScript function using the `m2cgen` library. The output file `model.js` (≈242 KB) exposes a single `score([bpm, spo2])` function that returns class probability arrays — no Python runtime, no Flask server, no network request required at inference time.

```python
# export_model.py
import m2cgen as m2c, joblib

model = joblib.load("ml_models/pulse_ox_model.pkl")
code  = m2c.export_to_javascript(model)

with open("public/model.js", "w") as f:
    f.write(code)
```

The browser calls `score([bpm, spo2])` and receives a probability array `[p_high, p_medium, p_normal]`. The class with the highest probability becomes the predicted risk label, and its probability is reported as the AI confidence percentage.

---

## Notebook Walkthrough

The Jupyter Notebook [`Pulse_ML.ipynb`](./public/Pulse_ML.ipynb) documents the full training pipeline across six cells.

**Cell 1 — Dataset Download.** Uses `kagglehub` to download and extract the 744 KB Kaggle dataset directly into the Colab environment, then locates the CSV automatically using a glob search.

**Cell 2 — Data Preprocessing.** Renames the `Heart Rate (bpm)` and `SpO2 Level (%)` columns to the model-expected names `Heart_Rate` and `Oxygen_Saturation`. Applies the risk label engineering function row-wise to create the `Risk_Level` target column. Filters the DataFrame down to the three required columns.

**Cell 3 — Label Encoding.** Encodes the string class labels (`High`, `Medium`, `Normal`) to integer indices (`0`, `1`, `2`) using `sklearn.preprocessing.LabelEncoder`. Saves the fitted encoder to `label_encoder.pkl` for later use during the inverse-transform step at prediction time.

**Cell 4 — Model Training.** Initialises a `RandomForestClassifier` with 100 estimators, fits it on 48,000 training records, and evaluates it on 12,000 test records. Achieves 100% accuracy across all three classes. Saves the trained model to `pulse_ox_model.pkl`.

**Cell 5 & 6 — Prediction Validation.** Loads both saved files and runs a test prediction on `HR = 145 BPM, SpO₂ = 88%`. The model returns `High Risk (100.00% Confidence)` with the advice message *"EMERGENCY: Immediate medical attention required."* — confirming that the pipeline is production-ready.

---

## Web Application Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   FIREBASE HOSTING                       │
│                                                          │
│   index.html  ──  style.css  ──  script.js  ──  model.js │
│      (UI)          (Dark       (App Logic)   (m2cgen JS  │
│                    Theme)                     RF model)  │
└────────────────────────┬─────────────────────────────────┘
                         │
         ┌───────────────┼──────────────────┐
         │               │                  │
┌────────▼───────┐ ┌─────▼────────┐ ┌──────▼───────────┐
│ Firebase Auth  │ │  Firestore   │ │  Overpass API +  │
│ (Anonymous     │ │  (Assessment │ │  Nominatim       │
│  Sign-In)      │ │   Logging)   │ │  (Hospital Finder│
└────────────────┘ └──────────────┘ └──────────────────┘
```

### Key Source Files

| File | Role |
|---|---|
| `public/index.html` | Application UI — form inputs, result section, history panel, hospital finder modal |
| `public/style.css` | Dark-mode design system — glassmorphism cards, animations, responsive grid |
| `public/script.js` | Core application logic — boot sequence, prediction, Firestore writes, hospital API calls |
| `public/model.js` | 242 KB m2cgen-compiled Random Forest — exposes the `score()` inference function |
| `firebase.json` | Firebase Hosting configuration and rewrite rules |
| `firestore.rules` | Firestore security rules permitting anonymous authenticated writes |
| `app.py` | Original Flask backend — retained for reference; replaced by client-side inference |
| `export_model.py` | Converts `pulse_ox_model.pkl` to `model.js` using m2cgen |

---

## Feature Reference

### Boot Animation
The header status indicator runs a randomised 3–5 second boot sequence on every page load. The colour transitions from Red (*Initialising*) to Yellow (*Loading model*) to Green (*Model Active*). Once active, the status pill becomes clickable and triggers a download of `PulseML_Models.zip`.

### Client-Side Inference
Prediction runs entirely in the browser by calling `score([bpm, spo2])` from the compiled `model.js`. Input is validated against physiological bounds (BPM: 30–300, SpO₂: 0–100) before being passed to the model. Values outside these bounds return a *Signal Quality Warning* rather than a risk classification.

### Analysis Overlay
A 4.2-second animated overlay simulates the AI pipeline after the user submits the form. It cycles through four labelled stages — *Reading vitals*, *Pre-processing data*, *Running AI model*, *Interpreting results* — with a progress bar and smooth text fade transitions.

### Firebase Firestore Logging
Each successful prediction is written anonymously to the Firestore `assessments` collection. The document stores the BPM, SpO₂, risk label, confidence score, advice text, user UID, and a server-generated timestamp.

### Assessment History
Up to 10 previous assessments are stored in `localStorage` under the key `pulseml_history`. The history panel renders all entries sorted by recency. Each entry is an interactive card — clicking it re-renders the result panel exactly as it appeared at the time of prediction.

### Emergency Hospital Finder
The hospital finder follows a multi-stage fallback flow:

```
High-risk result detected
        │
        ▼
User selects "Find Nearby Hospitals"
        │
        ▼
Geolocation API (GPS)
  ├── Success  → Overpass API query (30 km radius)
  │                   ├── Results found  → Display top 3 hospitals
  │                   └── No results     → Retry at 50 km radius
  │                                           ├── Found  → Display top 3
  │                                           └── None   → "No hospitals found" screen
  └── Denied   → Manual location input
                    └── Nominatim geocoding → coordinates → Overpass query (same flow)
```

All hospital results are sorted by Haversine distance. Each card includes the facility name, distance, a Google Maps Directions deep-link, and a tap-to-call button where a phone number is available in OpenStreetMap. The emergency helpline **112** is always displayed at the bottom of the results screen.

---

## Hardware Setup

### Components

| Component | Specification | Purpose |
|---|---|---|
| ESP8266 NodeMCU | v1.0 (CH340 USB) | Wi-Fi microcontroller |
| MAX30100 | I²C pulse oximeter | Heart Rate + SpO₂ sensing |
| Blynk App | iOS / Android | Real-time IoT dashboard |
| Jumper Wires | Male-to-Female | I²C interconnect |
| USB Cable | Micro-USB | Power and serial programming |

### Wiring Table

| MAX30100 Pin | NodeMCU Pin | Notes |
|---|---|---|
| VIN | 3.3V | Do not use 5V — damages sensor |
| GND | GND | Shared ground |
| SDA | D2 (GPIO4) | I²C data |
| SCL | D1 (GPIO5) | I²C clock |

### Blynk Dashboard Configuration

| Widget | Virtual Pin | Data Source |
|---|---|---|
| Gauge | V2 | SpO₂ (%) |
| SuperChart | V1, V2 | Heart Rate + SpO₂ trend |
| LED Indicator | V3 | Abnormal alert flag |

---

## Getting Started

### Run Locally (Static Server)

```bash
git clone <repository-url>
cd "Pulse ML"

# Using Node.js
npx serve public

# Or using Python
python -m http.server 8080 --directory public
```

Open `http://localhost:8080` in a browser.

### Run the Flask Backend (Legacy)

The original Flask server (`app.py`) loads `pulse_ox_model.pkl` and exposes a `/predict` REST endpoint. It is retained for reference but is not required for the deployed application.

```bash
pip install -r requirements.txt
python app.py
```

Open `http://localhost:5000`.

### Retrain the Model

1. Open `Pulse_ML.ipynb` in Google Colab.
2. Set the runtime to **GPU (T4)**.
3. Run all cells sequentially. The notebook downloads the dataset, trains the model, and saves `pulse_ox_model.pkl` and `label_encoder.pkl`.
4. Download both files into `ml_models/`.
5. Run `export_model.py` to regenerate `public/model.js`.

---

## Project Structure

```
Pulse ML/
├── public/
│   ├── index.html               # Main application UI
│   ├── style.css                # Dark-mode stylesheet
│   ├── script.js                # App logic and API integrations
│   ├── model.js                 # m2cgen Random Forest (242 KB)
│   ├── Pulse_ML.ipynb           # ML training notebook
│   ├── Pulse_ML.ipynb.pdf       # Notebook PDF export
│   ├── Pulse ML.pptx            # Project presentation
│   ├── PulseML_Models.zip       # Trained model files (.pkl)
│   ├── PulseML_gif.gif          # Demo animation
│   ├── PulseML_mp4.mp4          # Full demo video
│   ├── images/                  # Application screenshots
│   │   ├── PulseML_homepage.png
│   │   ├── PulseML_processing.png
│   │   ├── PulseML_normalresult.png
│   │   ├── PulseML_highrisk.png
│   │   ├── PulseML_model.png
│   │   ├── PulseML_history.png
│   │   ├── PulseML_EmergencyDetected.png
│   │   ├── PulseML_detecinglocation.png
│   │   ├── PulseML_enterlocation.png
│   │   ├── PulseML_searching hospital.png
│   │   ├── PulseML_hospitalslist.png
│   │   ├── PulseML_112.png
│   │   ├── Circuit.png
│   │   └── Blynk app.png
│   └── ppt_pmg/                 # PPT slide exports (PNG)
│       ├── page (1).png
│       ├── ...
│       └── page (13).png
├── ml_models/                   # Scikit-learn model files
├── app.py                       # Legacy Flask backend
├── export_model.py              # model.pkl → model.js converter
├── firebase.json                # Firebase Hosting config
├── firestore.rules              # Firestore security rules
├── requirements.txt             # Python dependencies
└── README.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| ML Training | Python 3, scikit-learn, pandas, Google Colab (T4 GPU) |
| Model Export | m2cgen |
| Frontend | HTML5, CSS3, JavaScript ES2022 (ES Modules) |
| Typography | Inter — Google Fonts |
| Authentication | Firebase Anonymous Auth |
| Database | Firebase Firestore |
| Hosting | Firebase Hosting |
| Geocoding | OpenStreetMap Nominatim |
| Hospital Search | OpenStreetMap Overpass API |
| Navigation | Google Maps Directions (deep-link) |
| IoT Hardware | ESP8266 NodeMCU + MAX30100 |
| IoT Dashboard | Blynk |
| Legacy Backend | Flask, Flask-CORS, joblib |

---

<div align="center">

Made with ❤️ by **Kunal Rabidas**

*PulseML · AI-Powered Diagnostic Interface · For Research Use Only*

</div>
