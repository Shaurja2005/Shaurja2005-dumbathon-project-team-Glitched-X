import { state } from "./shared/state.js";
import { createCaptchaFeature } from "./features/captcha/index.js";
import { createInterruptionsFeature } from "./features/interruptions/index.js";
import { createActionsFeature } from "./features/actions/index.js";
import { createUnlockFeature } from "./features/unlock/index.js";
import { triggerIconSuccessFeedback } from "./shared/feedback.js";

const elements = {
  unlockBtn: document.getElementById("unlockBtn"),
  actionButtons: Array.from(document.querySelectorAll(".action-btn")),
  statusEl: document.getElementById("status"),
  patientName: document.getElementById("patientName"),
  patientAge: document.getElementById("patientAge"),
  patientGender: document.getElementById("patientGender"),
  patientWeight: document.getElementById("patientWeight"),
  patientHeight: document.getElementById("patientHeight"),
  patientRadiation: document.getElementById("patientRadiation"),
  patientHours: document.getElementById("patientHours"),
  patientDiagnosis: document.getElementById("patientDiagnosis"),
  survivorHash: document.getElementById("survivorHash"),
  calorieResult: document.getElementById("calorieResult"),

  captchaModal: document.getElementById("captchaModal"),
  captchaPrompt: document.getElementById("captchaPrompt"),
  captchaHint: document.getElementById("captchaHint"),
  captchaGrid: document.getElementById("captchaGrid"),
  captchaStatus: document.getElementById("captchaStatus"),
  captchaVerify: document.getElementById("captchaVerify"),
  captchaReset: document.getElementById("captchaReset"),

  interruptModal: document.getElementById("interruptModal"),
  interruptTitle: document.getElementById("interruptTitle"),
  interruptBody: document.getElementById("interruptBody"),
  dismissInterrupt: document.getElementById("dismissInterrupt"),
};

function setStatus(message) {
  elements.statusEl.textContent = message;
}

function getPatientPayload() {
  const payload = {
    Name: elements.patientName.value.trim(),
    Age: Number(elements.patientAge.value),
    Gender: elements.patientGender.value.trim(),
    Weight_kg: Number(elements.patientWeight.value),
    Height_cm: Number(elements.patientHeight.value),
    radiation_dose_mSv: Number(elements.patientRadiation.value),
    hours_since_exposure: Number(elements.patientHours.value),
    diagnosis: elements.patientDiagnosis.value.trim(),
  };

  const hasInvalidRequired =
    !payload.Name ||
    !payload.Gender ||
    !payload.diagnosis ||
    Number.isNaN(payload.Age) ||
    Number.isNaN(payload.Weight_kg) ||
    Number.isNaN(payload.Height_cm) ||
    Number.isNaN(payload.radiation_dose_mSv) ||
    Number.isNaN(payload.hours_since_exposure);

  if (hasInvalidRequired) {
    return null;
  }

  return payload;
}

async function requestPrediction() {
  const payload = getPatientPayload();
  if (!payload) {
    setStatus("Fill all vitals before submit action.");
    return;
  }

  setStatus("Submitting to triage backend. Hourglass delay expected...");
  elements.survivorHash.textContent = "Survivor_ID_Hashed: ...";
  elements.calorieResult.textContent = "caloric_need_24hr: ...";

  try {
    const response = await fetch("http://127.0.0.1:8000/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.detail || "Backend request failed");
    }

    elements.survivorHash.textContent = `Survivor_ID_Hashed: ${result.Survivor_ID_Hashed}`;
    elements.calorieResult.textContent = `caloric_need_24hr: ${result.caloric_need_24hr}`;
    setStatus("Prediction received.");
  } catch (error) {
    setStatus(`Prediction failed: ${error.message}`);
  }
}

function onCaptchaSolved() {
  triggerIconSuccessFeedback(elements.unlockBtn);
}

function onActionCompleted(actionName) {
  const actionButton = elements.actionButtons.find(
    (button) => button.dataset.action === actionName,
  );
  triggerIconSuccessFeedback(actionButton);

  if (actionName === "submit") {
    void requestPrediction();
  }
}

const captchaFeature = createCaptchaFeature(
  elements,
  state,
  setStatus,
  onCaptchaSolved,
);
const interruptionsFeature = createInterruptionsFeature(
  elements,
  state,
  setStatus,
  onActionCompleted,
);
const actionsFeature = createActionsFeature(
  elements,
  interruptionsFeature.showInterrupt,
);
const unlockFeature = createUnlockFeature(
  elements,
  state,
  setStatus,
  captchaFeature.openCaptcha,
);

captchaFeature.bind();
interruptionsFeature.bind();
actionsFeature.bind();
unlockFeature.bind();
