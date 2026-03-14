import { captchaPrompts } from "./data.js";
import { randomFrom } from "../../shared/utils.js";

export function createCaptchaFeature(
  elements,
  state,
  setStatus,
  onCaptchaSolved,
) {
  function openCaptcha() {
    elements.captchaModal.classList.remove("hidden");
    buildCaptcha();
  }

  function closeCaptcha() {
    elements.captchaModal.classList.add("hidden");
  }

  function generateSafeCells() {
    const safe = new Set();
    while (safe.size < 7) {
      safe.add(Math.floor(Math.random() * 16));
    }
    return safe;
  }

  function paintGrid() {
    elements.captchaGrid.innerHTML = "";

    for (let index = 0; index < 16; index += 1) {
      const cell = document.createElement("div");
      const isSafe = state.safeIndices.has(index);
      cell.className = `captcha-cell ${isSafe ? "safe" : ""} ${state.selectedIndices.has(index) ? "selected" : ""}`;
      cell.dataset.index = String(index);

      cell.addEventListener("click", () => {
        if (state.selectedIndices.has(index)) {
          state.selectedIndices.delete(index);
        } else {
          state.selectedIndices.add(index);
        }
        paintGrid();
      });

      elements.captchaGrid.appendChild(cell);
    }
  }

  function shuffleCells() {
    state.safeIndices = generateSafeCells();
    paintGrid();
  }

  function runAnnoyingShuffle() {
    state.shuffleCycles = 0;
    elements.captchaGrid.style.filter = "blur(1px)";

    const timer = setInterval(() => {
      state.shuffleCycles += 1;
      shuffleCells();

      if (state.shuffleCycles >= 3) {
        clearInterval(timer);
        setTimeout(() => {
          elements.captchaGrid.style.filter = "blur(0.15px)";
        }, 450);
        elements.captchaStatus.textContent = "Grid stabilized... for now.";
      }
    }, 900);
  }

  function buildCaptcha() {
    state.selectedIndices.clear();
    state.safeIndices = generateSafeCells();

    const challenge = randomFrom(captchaPrompts);
    state.currentRule = challenge.rule;
    elements.captchaPrompt.textContent = challenge.prompt;
    elements.captchaHint.textContent = challenge.hint;
    elements.captchaStatus.textContent = "";

    paintGrid();
    runAnnoyingShuffle();
  }

  function evaluateCaptcha() {
    if (state.selectedIndices.size === 0) {
      elements.captchaStatus.textContent = "Nothing selected. Suspicious.";
      return false;
    }

    const isCorrect =
      [...state.selectedIndices].every((index) => {
        if (state.currentRule === "safe") {
          return state.safeIndices.has(index);
        }
        return state.safeIndices.has(index);
      }) &&
      [...state.safeIndices].every((index) => state.selectedIndices.has(index));

    if (!isCorrect) {
      elements.captchaStatus.textContent = "Incorrect. Recalibrating chaos...";
      buildCaptcha();
      return false;
    }

    elements.captchaStatus.textContent = "Verified.";
    return true;
  }

  function bind() {
    elements.captchaVerify.addEventListener("click", () => {
      const ok = evaluateCaptcha();
      if (!ok) {
        return;
      }

      state.captchaSolved = true;
      closeCaptcha();
      setStatus("Unlocked and verified. Primary actions are now enabled.");
      onCaptchaSolved?.();
    });

    elements.captchaReset.addEventListener("click", () => {
      buildCaptcha();
    });
  }

  return {
    bind,
    openCaptcha,
    closeCaptcha,
  };
}
