export function createUnlockFeature(elements, state, setStatus, openCaptcha) {
  function startUnlockFlow() {
    if (state.unlocked) {
      return;
    }

    setStatus("Face unlock accepted. Initializing ragebait CAPTCHA...");
    state.unlocked = true;
    openCaptcha();
  }

  function bind() {
    elements.unlockBtn.addEventListener("click", () => {
      if (state.unlocked) {
        setStatus("Face unlock already complete.");
        return;
      }

      startUnlockFlow();
    });
  }

  return {
    bind,
    startUnlockFlow,
  };
}
