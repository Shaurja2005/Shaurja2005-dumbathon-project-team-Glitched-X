import { interruptMessages } from "./data.js";
import { randomFrom } from "../../shared/utils.js";

export function createInterruptionsFeature(
  elements,
  state,
  setStatus,
  onActionCompleted,
) {
  function showInterrupt(actionName) {
    const msg = randomFrom(interruptMessages);
    elements.interruptTitle.textContent = msg.title;
    elements.interruptBody.textContent = msg.body;
    elements.interruptModal.classList.remove("hidden");
    state.pendingAction = actionName;
  }

  function completePendingAction() {
    if (!state.pendingAction) {
      return;
    }

    const actionName = state.pendingAction;
    state.pendingAction = null;

    if (!state.unlocked || !state.captchaSolved) {
      setStatus("Action blocked: complete unlock + CAPTCHA first.");
      return;
    }

    setStatus(`${actionName.toUpperCase()} completed.`);
    onActionCompleted?.(actionName);
  }

  function bind() {
    elements.dismissInterrupt.addEventListener("click", () => {
      elements.interruptModal.classList.add("hidden");
      completePendingAction();
    });
  }

  return {
    bind,
    showInterrupt,
  };
}
