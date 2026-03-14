import { state } from "./shared/state.js";
import { createCaptchaFeature } from "./features/captcha/index.js";
import { createInterruptionsFeature } from "./features/interruptions/index.js";
import { createActionsFeature } from "./features/actions/index.js";
import { createUnlockFeature } from "./features/unlock/index.js";
import { createFaceLockFeature } from "./features/facelock/index.js";
import { triggerIconSuccessFeedback } from "./shared/feedback.js";

const BACKEND_BASE_URL = "http://127.0.0.1:8000";
let isPredictionInFlight = false;
let memeDialogTimer = null;

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
  predictingState: document.getElementById("predictingState"),
  survivorHash: document.getElementById("survivorHash"),
  calorieResult: document.getElementById("calorieResult"),
  siteLock: document.getElementById("siteLock"),
  faceLockHeading: document.getElementById("faceLockHeading"),
  faceLockStatus: document.getElementById("faceLockStatus"),
  cameraFrame: document.getElementById("cameraFrame"),
  webcam: document.getElementById("webcam"),
  denialOverlay: document.getElementById("denialOverlay"),
  backupCodeInput: document.getElementById("backupCodeInput"),
  backupCodeBtn: document.getElementById("backupCodeBtn"),

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

  memeModal: document.getElementById("memeModal"),
  memeText: document.getElementById("memeText"),
  memeImage: document.getElementById("memeImage"),
  memeClose: document.getElementById("memeClose"),
};

const MEME_MESSAGE = "this is what you look like";

function setStatus(message) {
  elements.statusEl.textContent = message;
}

function setPredicting(isPredicting) {
  elements.predictingState.classList.toggle("hidden", !isPredicting);
}

function setSubmitButtonDisabled(disabled) {
  const submitButton = elements.actionButtons.find(
    (button) => button.dataset.action === "submit",
  );

  if (submitButton) {
    submitButton.disabled = disabled;
  }
}

function parsePositiveNumber(rawValue) {
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    return null;
  }

  const numberValue = Number(rawValue);
  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return numberValue;
}

function validatePatientPayload() {
  const name = elements.patientName.value.trim();
  const gender = elements.patientGender.value.trim();
  const diagnosis = elements.patientDiagnosis.value.trim();

  const age = parsePositiveNumber(elements.patientAge.value);
  const weightKg = parsePositiveNumber(elements.patientWeight.value);
  const heightCm = parsePositiveNumber(elements.patientHeight.value);
  const radiationDose = parsePositiveNumber(elements.patientRadiation.value);
  const hoursSinceExposure = parsePositiveNumber(elements.patientHours.value);

  const errors = [];

  if (!name) {
    errors.push("Name is required");
  }
  if (!gender) {
    errors.push("Gender is required");
  }
  if (!diagnosis) {
    errors.push("Diagnosis is required");
  }

  if (age === null || age <= 0 || age > 130) {
    errors.push("Age must be > 0 and <= 130");
  }
  if (weightKg === null || weightKg <= 0 || weightKg > 500) {
    errors.push("Weight_kg must be > 0 and <= 500");
  }
  if (heightCm === null || heightCm <= 0 || heightCm > 300) {
    errors.push("Height_cm must be > 0 and <= 300");
  }
  if (radiationDose === null || radiationDose < 0 || radiationDose > 20000) {
    errors.push("radiation_dose_mSv must be >= 0 and <= 20000");
  }
  if (
    hoursSinceExposure === null ||
    hoursSinceExposure < 0 ||
    hoursSinceExposure > 20000
  ) {
    errors.push("hours_since_exposure must be >= 0 and <= 20000");
  }

  if (errors.length > 0) {
    return { payload: null, errors };
  }

  return {
    payload: {
      Name: name,
      Age: age,
      Gender: gender,
      Weight_kg: weightKg,
      Height_cm: heightCm,
      radiation_dose_mSv: radiationDose,
      hours_since_exposure: hoursSinceExposure,
      diagnosis,
    },
    errors: [],
  };
}

function formatBackendError(result, fallback = "Backend request failed") {
  if (!result) {
    return fallback;
  }

  if (typeof result === "string") {
    return result;
  }

  if (Array.isArray(result)) {
    return result
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        const path = Array.isArray(item?.loc) ? item.loc.join(".") : "payload";
        const message = item?.msg || "Invalid value";
        return `${path}: ${message}`;
      })
      .join(" | ");
  }

  if (typeof result === "object") {
    if ("detail" in result) {
      return formatBackendError(result.detail, fallback);
    }

    try {
      return JSON.stringify(result);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function getPatientPayload() {
  const { payload } = validatePatientPayload();
  return payload;
}

function showMemeDialog(imagePath, message = MEME_MESSAGE) {
  if (!elements.memeModal || !elements.memeImage || !elements.memeText) {
    return;
  }

  if (memeDialogTimer) {
    clearTimeout(memeDialogTimer);
    memeDialogTimer = null;
  }

  elements.memeText.textContent = message;
  elements.memeImage.src = imagePath;
  elements.memeImage.alt = message;
  elements.memeModal.classList.remove("hidden");

  memeDialogTimer = setTimeout(() => {
    hideMemeDialog();
  }, 5000);
}

function hideMemeDialog() {
  if (!elements.memeModal) {
    return;
  }

  if (memeDialogTimer) {
    clearTimeout(memeDialogTimer);
    memeDialogTimer = null;
  }

  elements.memeModal.classList.add("hidden");
}

function bindMemeReactions() {
  elements.patientWeight.addEventListener("change", () => {
    const weight = Number(elements.patientWeight.value);
    if (!Number.isFinite(weight)) {
      return;
    }

    if (weight > 60) {
      showMemeDialog("pictures/hippo.png");
      return;
    }

    showMemeDialog("pictures/image1.png");
  });

  elements.patientHeight.addEventListener("change", () => {
    const height = Number(elements.patientHeight.value);
    if (!Number.isFinite(height)) {
      return;
    }

    if (height > 160) {
      showMemeDialog("pictures/image2.png");
      return;
    }

    showMemeDialog("pictures/image3.png");
  });

  elements.patientAge.addEventListener("change", () => {
    const age = Number(elements.patientAge.value);
    if (!Number.isFinite(age)) {
      return;
    }

    if (age < 20) {
      showMemeDialog("pictures/image4.png");
      return;
    }

    showMemeDialog("pictures/image5.png");
  });

  elements.patientRadiation.addEventListener("change", () => {
    const radiationDose = Number(elements.patientRadiation.value);
    if (!Number.isFinite(radiationDose)) {
      return;
    }

    showMemeDialog("pictures/image6.png", "you should be dead");
  });

  elements.patientHours.addEventListener("change", () => {
    const hoursSinceExposure = Number(elements.patientHours.value);
    if (!Number.isFinite(hoursSinceExposure)) {
      return;
    }

    showMemeDialog("pictures/image7.png", "u are dead!");
  });

  elements.memeClose?.addEventListener("click", hideMemeDialog);
  elements.memeModal?.addEventListener("click", (event) => {
    if (event.target === elements.memeModal) {
      hideMemeDialog();
    }
  });
}

async function requestPrediction() {
  if (isPredictionInFlight) {
    setStatus("Prediction already in progress. Please wait.");
    return;
  }

  const payload = getPatientPayload();
  if (!payload) {
    const { errors } = validatePatientPayload();
    setStatus(`Fix input: ${errors.join(" | ")}`);
    return;
  }

  isPredictionInFlight = true;
  setStatus("Submitting to triage backend. Hourglass delay expected...");
  setPredicting(true);
  setSubmitButtonDisabled(true);
  elements.survivorHash.textContent = "Survivor_ID_Hashed: ...";
  elements.calorieResult.textContent = "caloric_need_24hr: ...";

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(formatBackendError(result, "Backend request failed"));
    }

    elements.survivorHash.textContent = `Survivor_ID_Hashed: ${result.Survivor_ID_Hashed}`;
    elements.calorieResult.textContent = `caloric_need_24hr: ${result.caloric_need_24hr}`;
    setStatus("Prediction received.");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : formatBackendError(error, "Unknown prediction error");
    setStatus(`Prediction failed: ${message}`);
  } finally {
    isPredictionInFlight = false;
    setPredicting(false);
    setSubmitButtonDisabled(false);
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
const faceLockFeature = createFaceLockFeature(elements, {
  backendBaseUrl: BACKEND_BASE_URL,
  onUnlock: () => {
    unlockFeature.startUnlockFlow();
  },
});

captchaFeature.bind();
interruptionsFeature.bind();
actionsFeature.bind();
unlockFeature.bind();
faceLockFeature.bind();
bindMemeReactions();
