export function triggerIconSuccessFeedback(button) {
  if (!button) {
    return;
  }

  button.classList.remove("feedback-pulse", "feedback-complete");
  void button.offsetWidth;
  button.classList.add("feedback-pulse");

  setTimeout(() => {
    button.classList.remove("feedback-pulse");
    button.classList.add("feedback-complete");
  }, 900);
}
