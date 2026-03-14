export function createActionsFeature(elements, showInterrupt) {
  function bind() {
    elements.actionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        showInterrupt(button.dataset.action);
      });
    });
  }

  return { bind };
}
