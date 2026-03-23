# Dumbathon Project - Camp Triage & Face Lock System

## Overview
This project is a full-stack application designed for camp triage and face verification. It features a modern, dark-themed web interface with playful, animated feedback dialogs, robust validation, and a FastAPI backend for predictions. The system includes:
- Patient triage form with live validation and meme-style feedback
- Face lock/verification using webcam and face-api.js
- Machine learning model integration for medical predictions
- Dataset and model training scripts

---

## Project Structure

- `index.html` — Main web UI for patient triage and prediction
- `requirements.txt` — Python dependencies for backend/model
- `start_backend_server&frontend.txt` — Instructions to start backend and frontend
- `dataset/` — CSV datasets for model training
- `face-lock-project/` — Face verification frontend (standalone demo)
    - `labeled_images/` — Labeled face images for recognition
    - `models/` — Pretrained face-api.js models
- `model/` — Trained ML model (JSON)
- `model_training/` — Data preprocessing and model training scripts
    - `src/app.py` — FastAPI backend server
    - `src/model_training.py` — Model training logic
- `report/` — Project reports and documentation
- `src/` — Main frontend source code
    - `main.js` — UI logic, validation, meme dialogs, API calls
    - `styles/main.css` — Dark theme, modal, and animation styles
    - `features/` — Modular JS features (captcha, facelock, unlock, etc.)
    - `shared/` — Shared JS utilities and state
    - `styles/` — CSS files

---

## Features
- **Modern UI**: Dark theme, Bootstrap icons, meme font (Bangers)
- **Face Verification**: Webcam-based face lock using face-api.js
- **Animated Feedback**: Meme-style dialogs for input thresholds (weight, height, age, radiation, hours)
- **Robust Validation**: Field-specific error messages, readable backend errors
- **Prediction Box**: Animated glow while loading, color-coded results
- **Backend**: FastAPI server for predictions, strict schema validation
- **Model Training**: Scripts for preprocessing and training ML models

---

## Setup & Usage

### 1. Install Python Dependencies
```
pip install -r requirements.txt
```

### 2. Start Backend Server
```
cd model_training/src
python app.py
```

### 3. Start Frontend
Open `index.html` in your browser (or use a simple HTTP server for local development).

### 4. Face Lock Demo
Open `face-lock-project/index.html` in your browser for the standalone face verification demo.

---

## Datasets & Models
- Place datasets in `dataset/`
- Trained model is in `model/camp_triage_model.json`
- Face recognition models are in `face-lock-project/models/`

---

## Customization
- Add meme images to `pictures/` as needed for dialogs
- Adjust validation thresholds and phrases in `src/main.js`
- Update styles in `src/styles/main.css`

---

## Credits
- UI icons: [Bootstrap Icons](https://icons.getbootstrap.com/)
- Meme font: [Bangers](https://fonts.google.com/specimen/Bangers)
- Face recognition: [face-api.js](https://github.com/justadudewhohacks/face-api.js)
- Backend: [FastAPI](https://fastapi.tiangolo.com/)

---

## License
This project is for educational/demo purposes. See individual files for third-party licenses.
