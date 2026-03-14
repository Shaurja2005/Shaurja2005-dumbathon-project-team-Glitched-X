export function createUnlockFeature(elements, state, setStatus, openCaptcha) {
  function bind() {
    elements.unlockBtn.addEventListener("click", () => {
      if (state.unlocked) {
        setStatus("Face unlock already complete.");
        return;
      }

      setStatus("Face unlock accepted. Initializing ragebait CAPTCHA...");
      state.unlocked = true;
      openCaptcha();
    });
  }

  return { bind };
}
